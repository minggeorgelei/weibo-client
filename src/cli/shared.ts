import {
  OutputConfig,
  resolveOutputConfigFromArgv,
  resolveOutputConfigFromCommander,
} from "../lib/output";
import { Command } from "commander";
import { statusPrefix, labelPrefix } from "../lib/output";
import { CookieSource, resolveCredentials } from "../lib/cookie";
import JSON5 from "json5";
import kleur from "kleur";
import path from "path";
import { homedir } from "os";
import { readFileSync, existsSync } from "fs";

const COOKIE_SOURCES: CookieSource[] = [
  "chrome",
  "firefox",
  "safari",
  "edge",
  "opera",
  "brave",
  "vivaldi",
];

export type MediaSpec = {
  path: string;
  alt?: string;
  mime: string;
  buffer: Buffer;
};

export type WeiboConfig = {
  chromeProfile?: string;
  chromeProfileDir?: string;
  firefoxProfile?: string;
  firefoxProfileDir?: string;
  braveProfile?: string;
  braveProfileDir?: string;
  edgeProfile?: string;
  edgeProfileDir?: string;
  vivaldiProfile?: string;
  vivaldiProfileDir?: string;
  operaProfile?: string;
  operaProfileDir?: string;
  cookieSource?: CookieSource;
  timeoutMs?: number;
};

type CredentialsOptions = {
  SUB?: string;
  SUBP?: string;
  WBPSESS?: string;
  ALF?: string;
  SCF?: string;
  XSRFTOKEN?: string;
  chromeProfile?: string;
  chromeProfileDir?: string;
  firefoxProfile?: string;
  firefoxProfileDir?: string;
  braveProfile?: string;
  braveProfileDir?: string;
  edgeProfile?: string;
  edgeProfileDir?: string;
  operaProfile?: string;
  operaProfileDir?: string;
  vivaldiProfile?: string;
  vivaldiProfileDir?: string;
  cookieSource?: CookieSource;
};

export const collectCookieSource = (
  value: string,
  sources: CookieSource[] = [],
): CookieSource[] => {
  sources.push(parseCookieSource(value));
  return sources;
};

function parseCookieSource(value: string): CookieSource {
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "safari" ||
    normalized === "chrome" ||
    normalized === "firefox" ||
    normalized === "edge" ||
    normalized === "opera" ||
    normalized === "brave" ||
    normalized === "vivaldi"
  ) {
    return normalized;
  }
  throw new Error(
    `Invalid --cookie-source "${value}". Allowed: chrome, firefox, safari, edge, opera, brave, vivaldi.`,
  );
}

function detectMime(path: string): string | null {
  const ext = path.toLowerCase();
  if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (ext.endsWith(".png")) {
    return "image/png";
  }
  if (ext.endsWith(".webp")) {
    return "image/webp";
  }
  if (ext.endsWith(".gif")) {
    return "image/gif";
  }
  if (ext.endsWith(".mp4") || ext.endsWith(".m4v")) {
    return "video/mp4";
  }
  if (ext.endsWith(".mov")) {
    return "video/quicktime";
  }
  return null;
}

function resolveCookieSourceOrder(input: unknown): CookieSource[] | undefined {
  if (typeof input === "string") {
    return [parseCookieSource(input)];
  }
  if (Array.isArray(input)) {
    const result: CookieSource[] = [];
    for (const entry of input) {
      if (typeof entry !== "string") {
        continue;
      }
      result.push(parseCookieSource(entry));
    }
    return result.length > 0 ? result : undefined;
  }
}

export type CliContext = {
  isTty: boolean;
  getOutput: () => OutputConfig;
  colors: {
    banner: (t: string) => string;
    subtitle: (t: string) => string;
    section: (t: string) => string;
    bullet: (t: string) => string;
    command: (t: string) => string;
    option: (t: string) => string;
    argument: (t: string) => string;
    description: (t: string) => string;
    muted: (t: string) => string;
    accent: (t: string) => string;
  };
  p: (kind: Parameters<typeof statusPrefix>[0]) => string;
  l: (kind: Parameters<typeof labelPrefix>[0]) => string;
  config: WeiboConfig;
  applyOutputFromCommand: (command: Command) => void;
  resolveTimeoutFromOptions: (options: {
    timeout?: string | number;
  }) => number | undefined;
  resolveCredentialsFromOptions: (
    opts: CredentialsOptions,
  ) => ReturnType<typeof resolveCredentials>;
  loadMedia: (opts: { media: string[]; alts: string[] }) => MediaSpec[];
};

export function createCliContext(
  normalizedArgs: string[],
  env: NodeJS.ProcessEnv = process.env,
): CliContext {
  const isTty = process.stdout.isTTY;
  let output: OutputConfig = resolveOutputConfigFromArgv(
    normalizedArgs,
    env,
    isTty,
  );
  kleur.enabled = output.color;

  const wrap =
    (styler: (text: string) => string): ((text: string) => string) =>
    (text: string): string =>
      isTty ? styler(text) : text;

  const colors = {
    banner: wrap((t) => kleur.bold().blue(t)),
    subtitle: wrap((t) => kleur.dim(t)),
    section: wrap((t) => kleur.bold().white(t)),
    bullet: wrap((t) => kleur.blue(t)),
    command: wrap((t) => kleur.bold().cyan(t)),
    option: wrap((t) => kleur.cyan(t)),
    argument: wrap((t) => kleur.magenta(t)),
    description: wrap((t) => kleur.white(t)),
    muted: wrap((t) => kleur.gray(t)),
    accent: wrap((t) => kleur.green(t)),
  };

  const p = (kind: Parameters<typeof statusPrefix>[0]): string => {
    const prefix = statusPrefix(kind, output);
    if (output.plain || !output.color) {
      return prefix;
    }
    if (kind === "ok") {
      return kleur.green(prefix);
    }
    if (kind === "warn") {
      return kleur.yellow(prefix);
    }
    if (kind === "err") {
      return kleur.red(prefix);
    }
    if (kind === "info") {
      return kleur.cyan(prefix);
    }
    return kleur.gray(prefix);
  };

  const l = (kind: Parameters<typeof labelPrefix>[0]): string => {
    const prefix = labelPrefix(kind, output);
    if (output.plain || !output.color) {
      return prefix;
    }
    if (kind === "url") {
      return kleur.cyan(prefix);
    }
    if (kind === "date") {
      return kleur.magenta(prefix);
    }
    if (kind === "source") {
      return kleur.gray(prefix);
    }
    if (kind === "engine") {
      return kleur.blue(prefix);
    }
    if (kind === "credentials") {
      return kleur.yellow(prefix);
    }
    if (kind === "user") {
      return kleur.cyan(prefix);
    }
    if (kind === "userId") {
      return kleur.magenta(prefix);
    }
    if (kind === "email") {
      return kleur.green(prefix);
    }
    return kleur.gray(prefix);
  };

  const config = loadConfig((message) => {
    console.error(colors.muted(`${p("warn")}${message}`));
  });

  function readConfigFile(
    path: string,
    warn: (message: string) => void,
  ): Partial<WeiboConfig> {
    if (!existsSync(path)) {
      return {};
    }
    try {
      const raw = readFileSync(path, "utf8");
      const parsed = JSON5.parse(raw) as Partial<WeiboConfig>;
      return parsed ?? {};
    } catch (error) {
      warn(
        `Failed to parse config at ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {};
    }
  }

  function loadConfig(warn: (message: string) => void): WeiboConfig {
    const globalPath = path.join(
      homedir(),
      ".config",
      "weiboclient",
      "config.json5",
    );
    const localPath = path.join(process.cwd(), "weiboclient.json5");

    return {
      ...readConfigFile(globalPath, warn),
      ...readConfigFile(localPath, warn),
    };
  }

  function applyOutputFromCommand(command: Command): void {
    const opts = command.optsWithGlobals() as {
      plain?: boolean;
      emoji?: boolean;
      color?: boolean;
    };
    output = resolveOutputConfigFromCommander(opts, env, isTty);
    kleur.enabled = output.color;
  }

  function resolveTimeoutMs(
    ...values: Array<string | number | undefined | null>
  ): number | undefined {
    for (const value of values) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      const parsed = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return undefined;
  }

  function resolveTimeoutFromOptions(options: {
    timeout?: string | number;
  }): number | undefined {
    return resolveTimeoutMs(
      options.timeout,
      config.timeoutMs,
      env.WEIBOCLIENT_TIMEOUT_MS,
    );
  }

  function resolveCredentialsFromOptions(
    opts: CredentialsOptions,
  ): ReturnType<typeof resolveCredentials> {
    const cookieSource = opts.cookieSource?.length
      ? opts.cookieSource
      : (resolveCookieSourceOrder(config.cookieSource) ?? COOKIE_SOURCES);
    const chromeProfile =
      opts.chromeProfileDir ||
      opts.chromeProfile ||
      config.chromeProfileDir ||
      config.chromeProfile;
    const edgeProfile =
      opts.edgeProfileDir ||
      opts.edgeProfile ||
      config.edgeProfileDir ||
      config.edgeProfile;
    const operaProfile =
      opts.operaProfileDir ||
      opts.operaProfile ||
      config.operaProfileDir ||
      config.operaProfile;
    const vivaldiProfile =
      opts.vivaldiProfileDir ||
      opts.vivaldiProfile ||
      config.vivaldiProfileDir ||
      config.vivaldiProfile;
    const firefoxProfile =
      opts.firefoxProfileDir ||
      opts.firefoxProfile ||
      config.firefoxProfileDir ||
      config.firefoxProfile;
    const braveProfile =
      opts.braveProfileDir ||
      opts.braveProfile ||
      config.braveProfileDir ||
      config.braveProfile;
    return resolveCredentials({
      SUB: opts.SUB,
      SUBP: opts.SUBP,
      WBPSESS: opts.WBPSESS,
      ALF: opts.ALF,
      SCF: opts.SCF,
      XSRFTOKEN: opts.XSRFTOKEN,
      cookieSource,
      chromeProfile,
      edgeProfile,
      firefoxProfile,
      operaProfile,
      vivaldiProfile,
      braveProfile,
    });
  }

  function loadMedia(opts: { media: string[]; alts: string[] }): MediaSpec[] {
    if (opts.media.length === 0) {
      return [];
    }
    const specs: MediaSpec[] = [];
    for (const [index, path] of opts.media.entries()) {
      const mime = detectMime(path);
      if (!mime) {
        throw new Error(
          `Unsupported media type for ${path}. Supported: jpg, jpeg, png, webp, gif, mp4, mov`,
        );
      }
      const buffer = readFileSync(path);
      specs.push({ path, mime, buffer, alt: opts.alts[index] });
    }

    const videoCount = specs.filter((m) => m.mime.startsWith("video/")).length;
    if (videoCount > 1) {
      throw new Error("Only one video can be attached");
    }
    if (videoCount === 1 && specs.length > 1) {
      throw new Error("Video cannot be combined with other media");
    }
    if (specs.length > 4) {
      throw new Error("Maximum 4 media attachments");
    }
    return specs;
  }

  return {
    isTty,
    getOutput: () => output,
    colors,
    p,
    l,
    config,
    applyOutputFromCommand,
    resolveTimeoutFromOptions,
    resolveCredentialsFromOptions,
    loadMedia,
  };
}

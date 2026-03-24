import { getCookiesFromBrowser, GetCookiesResult } from "sqlite-cookie-parser";

export interface WeiboClientCookies {
  SUB: string | null;
  SUBP: string | null;
  WBPSESS: string | null;
  ALF: string | null;
  SCF: string | null;
  XSRFTOKEN: string | null;
  source: string | null;
  cookieHeader?: string;
}

export interface CookieResult {
  cookies: WeiboClientCookies;
  warnings: string[];
}

export type CookieSource =
  | "chrome"
  | "edge"
  | "firefox"
  | "safari"
  | "opera"
  | "brave"
  | "vivaldi";

const WEIBO_COOKIE_NAMES = [
  "SUB",
  "SUBP",
  "WBPSESS",
  "ALF",
  "SCF",
  "XSRF-TOKEN",
];
const WEIBO_URL = "https://weibo.com/";
const WEIBO_ORIGINS = ["https://weibo.com"];

function toCookieHeader(cookies: WeiboClientCookies): string {
  const cookie = `SUB=${cookies.SUB}; SUBP=${cookies.SUBP}; WBPSESS=${cookies.WBPSESS}; ALF=${cookies.ALF}; SCF=${cookies.SCF}; XSRF-TOKEN=${cookies.XSRFTOKEN}`;
  return cookie;
}

function resolveSources(
  cookieSource?: CookieSource | CookieSource[],
): CookieSource[] {
  if (Array.isArray(cookieSource)) {
    return cookieSource;
  }
  if (cookieSource) {
    return [cookieSource];
  }
  return ["chrome", "firefox", "safari", "edge", "opera", "brave", "vivaldi"];
}

function normalizeValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readEnvCookie(
  cookies: WeiboClientCookies,
  keys: readonly string[],
  field: "SUB" | "SUBP" | "WBPSESS" | "ALF" | "SCF" | "XSRFTOKEN",
): void {
  if (cookies[field]) {
    return;
  }

  for (const key of keys) {
    const envValue = normalizeValue(process.env[key]);
    if (!envValue) {
      continue;
    }
    cookies[field] = envValue;
    if (!cookies.source) {
      cookies.source = `env:${key}`;
    }
    break;
  }
}

function pickCookieValue(
  cookies: Array<{ name?: string; value?: string; domain?: string }>,
  name: (typeof WEIBO_COOKIE_NAMES)[number],
): string | null {
  const matches = cookies.filter(
    (c) => c?.name === name && typeof c.value === "string",
  );
  if (matches.length === 0) {
    return null;
  }

  const preferred = matches.find((c) => (c.domain ?? "").endsWith("weibo.com"));
  if (preferred?.value) {
    return preferred.value;
  }

  return matches[0]?.value ?? null;
}

function labelForSource(source: CookieSource, profile?: string): string {
  switch (source) {
    case "chrome":
      return profile ? `Chrome profile ${profile}` : "Chrome active profile";
    case "edge":
      return profile ? `Edge profile ${profile}` : "Edge active profile";
    case "firefox":
      return profile ? `Firefox profile ${profile}` : "Firefox active profile";
    case "safari":
      return "Safari";
    case "opera":
      return profile ? `Opera profile ${profile}` : "Opera active profile";
    case "brave":
      return profile ? `Brave profile ${profile}` : "Brave active profile";
    case "vivaldi":
      return profile ? `Vivaldi profile ${profile}` : "Vivaldi active profile";
    default:
      return source;
  }
}

async function readWeiboCookiesFromBrowser(options: {
  source: CookieSource;
  chromeProfile?: string;
  firefoxProfile?: string;
  edgeProfile?: string;
  operaProfile?: string;
  braveProfile?: string;
  vivaldiProfile?: string;
}): Promise<CookieResult> {
  let result: GetCookiesResult;
  let cookieExtractionResult: CookieResult = {
    cookies: {
      SUB: null,
      SUBP: null,
      WBPSESS: null,
      ALF: null,
      SCF: null,
      XSRFTOKEN: null,
      source: null,
    },
    warnings: [],
  };
  const warnings: string[] = [];
  let profile: string | undefined = "";
  switch (options.source) {
    case "chrome":
      result = await getCookiesFromBrowser({
        browserName: "chrome",
        origins: WEIBO_ORIGINS,
        cookieNames: WEIBO_COOKIE_NAMES,
        profile: options.chromeProfile,
      });
      profile = options.chromeProfile;
      break;
    case "edge":
      result = await getCookiesFromBrowser({
        browserName: "edge",
        origins: WEIBO_ORIGINS,
        cookieNames: WEIBO_COOKIE_NAMES,
        profile: options.edgeProfile,
      });
      profile = options.edgeProfile;
      break;
    case "firefox":
      result = await getCookiesFromBrowser({
        browserName: "firefox",
        origins: WEIBO_ORIGINS,
        cookieNames: WEIBO_COOKIE_NAMES,
        profile: options.firefoxProfile,
      });
      profile = options.firefoxProfile;
      break;
    case "opera":
      result = await getCookiesFromBrowser({
        browserName: "opera",
        origins: WEIBO_ORIGINS,
        cookieNames: WEIBO_COOKIE_NAMES,
        profile: options.operaProfile,
      });
      profile = options.operaProfile;
      break;
    case "brave":
      result = await getCookiesFromBrowser({
        browserName: "brave",
        origins: WEIBO_ORIGINS,
        cookieNames: WEIBO_COOKIE_NAMES,
        profile: options.braveProfile,
      });
      profile = options.braveProfile;
      break;
    case "vivaldi":
      result = await getCookiesFromBrowser({
        browserName: "vivaldi",
        origins: WEIBO_ORIGINS,
        cookieNames: WEIBO_COOKIE_NAMES,
        profile: options.vivaldiProfile,
      });
      profile = options.vivaldiProfile;
      break;
    case "safari":
      result = await getCookiesFromBrowser({
        browserName: "safari",
        origins: WEIBO_ORIGINS,
        cookieNames: WEIBO_COOKIE_NAMES,
        // Safari doesn't support multiple profiles, so we ignore the profile option
      });
      profile = undefined;
      break;
    default:
      throw new Error(`Unsupported cookie source: ${options.source}`);
  }
  warnings.push(...result.warnings);
  const resultCookies = result.cookies.map((c) => ({
    name: c.name,
    value: c.value === null ? undefined : c.value,
    domain: c.domain,
  }));
  const SUB = pickCookieValue(resultCookies, "SUB");
  const SUBP = pickCookieValue(resultCookies, "SUBP");
  const WBPSESS = pickCookieValue(resultCookies, "WBPSESS");
  const ALF = pickCookieValue(resultCookies, "ALF");
  const SCF = pickCookieValue(resultCookies, "SCF");
  const XSRFTOKEN = pickCookieValue(resultCookies, "XSRF-TOKEN");

  if (SUB) {
    cookieExtractionResult.cookies.SUB = SUB;
  }

  if (SUBP) {
    cookieExtractionResult.cookies.SUBP = SUBP;
  }

  if (WBPSESS) {
    cookieExtractionResult.cookies.WBPSESS = WBPSESS;
  }

  if (ALF) {
    cookieExtractionResult.cookies.ALF = ALF;
  }

  if (SCF) {
    cookieExtractionResult.cookies.SCF = SCF;
  }

  if (XSRFTOKEN) {
    cookieExtractionResult.cookies.XSRFTOKEN = XSRFTOKEN;
  }

  if (SUB && SUBP && WBPSESS && ALF && SCF && XSRFTOKEN) {
    const source = labelForSource(options.source, profile);
    cookieExtractionResult.cookies.source = source;
    cookieExtractionResult.warnings = warnings;
    return cookieExtractionResult;
  }

  switch (options.source) {
    case "chrome":
      warnings.push(
        `Failed to extract all required cookies from Chrome${profile ? ` profile ${profile}` : " active profile"}. Make sure you have logged into weibo.com in that profile and try again.`,
      );
      break;
    case "edge":
      warnings.push(
        `Failed to extract all required cookies from Edge${profile ? ` profile ${profile}` : " active profile"}. Make sure you have logged into weibo.com in that profile and try again.`,
      );
      break;
    case "firefox":
      warnings.push(
        `Failed to extract all required cookies from Firefox${profile ? ` profile ${profile}` : " active profile"}. Make sure you have logged into weibo.com in that profile and try again.`,
      );
      break;
    case "opera":
      warnings.push(
        `Failed to extract all required cookies from Opera${profile ? ` profile ${profile}` : " active profile"}. Make sure you have logged into weibo.com in that profile and try again.`,
      );
      break;
    case "brave":
      warnings.push(
        `Failed to extract all required cookies from Brave${profile ? ` profile ${profile}` : " active profile"}. Make sure you have logged into weibo.com in that profile and try again.`,
      );
      break;
    case "vivaldi":
      warnings.push(
        `Failed to extract all required cookies from Vivaldi${profile ? ` profile ${profile}` : " active profile"}. Make sure you have logged into weibo.com in that profile and try again.`,
      );
      break;
    case "safari":
      warnings.push(
        `Failed to extract all required cookies from Safari. Make sure you have logged into weibo.com in Safari and try again.`,
      );
      break;
  }

  return cookieExtractionResult;
}

async function extractCookiesFromChrome(
  profile?: string,
): Promise<CookieResult> {
  const result = await readWeiboCookiesFromBrowser({
    chromeProfile: profile,
    source: "chrome",
  });
  return result;
}

async function extractCookiesFromEdge(profile?: string): Promise<CookieResult> {
  const result = await readWeiboCookiesFromBrowser({
    edgeProfile: profile,
    source: "edge",
  });
  return result;
}

async function extractCookiesFromFirefox(
  profile?: string,
): Promise<CookieResult> {
  const result = await readWeiboCookiesFromBrowser({
    firefoxProfile: profile,
    source: "firefox",
  });
  return result;
}

async function extractCookiesFromSafari(): Promise<CookieResult> {
  const result = await readWeiboCookiesFromBrowser({ source: "safari" });
  return result;
}

async function extractCookiesFromOpera(
  profile?: string,
): Promise<CookieResult> {
  const result = await readWeiboCookiesFromBrowser({
    operaProfile: profile,
    source: "opera",
  });
  return result;
}

async function extractCookiesFromBrave(
  profile?: string,
): Promise<CookieResult> {
  const result = await readWeiboCookiesFromBrowser({
    braveProfile: profile,
    source: "brave",
  });
  return result;
}

async function extractCookiesFromVivaldi(
  profile?: string,
): Promise<CookieResult> {
  const result = await readWeiboCookiesFromBrowser({
    vivaldiProfile: profile,
    source: "vivaldi",
  });
  return result;
}

export async function resolveCredentials(options: {
  SUB?: string;
  SUBP?: string;
  ALF?: string;
  SCF?: string;
  WBPSESS?: string;
  XSRFTOKEN?: string;
  cookieSource?: CookieSource | CookieSource[];
  chromeProfile?: string;
  firefoxProfile?: string;
  edgeProfile?: string;
  operaProfile?: string;
  vivaldiProfile?: string;
  braveProfile?: string;
}): Promise<CookieResult> {
  const warnings: string[] = [];
  const cookies: WeiboClientCookies = {
    SUB: null,
    SUBP: null,
    WBPSESS: null,
    ALF: null,
    SCF: null,
    XSRFTOKEN: null,
    source: null,
  };

  if (options.SUB) {
    cookies.SUB = options.SUB;
    cookies.source = "CLI argument";
  }
  if (options.SUBP) {
    cookies.SUBP = options.SUBP;
    cookies.source = "CLI argument";
  }

  if (options.WBPSESS) {
    cookies.WBPSESS = options.WBPSESS;
    cookies.source = "CLI argument";
  }

  if (options.ALF) {
    cookies.ALF = options.ALF;
    cookies.source = "CLI argument";
  }

  if (options.SCF) {
    cookies.SCF = options.SCF;
    cookies.source = "CLI argument";
  }

  if (options.XSRFTOKEN) {
    cookies.XSRFTOKEN = options.XSRFTOKEN;
    cookies.source = "CLI argument";
  }

  readEnvCookie(cookies, ["SUB", "WEIBOCLIENT_SUB"], "SUB");
  readEnvCookie(cookies, ["SUBP", "WEIBOCLIENT_SUBP"], "SUBP");
  readEnvCookie(cookies, ["WBPSESS", "WEIBOCLIENT_WBPSESS"], "WBPSESS");
  readEnvCookie(cookies, ["ALF", "WEIBOCLIENT_ALF"], "ALF");
  readEnvCookie(cookies, ["SCF", "WEIBOCLIENT_SCF"], "SCF");
  readEnvCookie(cookies, ["XSRFTOKEN", "WEIBOCLIENT_XSRFTOKEN"], "XSRFTOKEN");

  if (
    cookies.SUB &&
    cookies.SUBP &&
    cookies.WBPSESS &&
    cookies.ALF &&
    cookies.SCF &&
    cookies.XSRFTOKEN
  ) {
    cookies.cookieHeader = toCookieHeader(cookies);
    return { cookies, warnings };
  }

  const sourcesArray = resolveSources(options.cookieSource);
  for (const source of sourcesArray) {
    const result = await readWeiboCookiesFromBrowser({
      source,
      chromeProfile: options.chromeProfile,
      firefoxProfile: options.firefoxProfile,
      edgeProfile: options.edgeProfile,
      operaProfile: options.operaProfile,
      braveProfile: options.braveProfile,
      vivaldiProfile: options.vivaldiProfile,
    });
    warnings.push(...result.warnings);
    if (
      result.cookies.SUB &&
      result.cookies.SUBP &&
      result.cookies.WBPSESS &&
      result.cookies.ALF &&
      result.cookies.SCF &&
      result.cookies.XSRFTOKEN
    ) {
      return { cookies: result.cookies, warnings };
    }
  }

  if (!cookies.SUB) {
    warnings.push(
      "Missing SUB - provide via --SUB, SUB env var, or login to weibo.com in Chrome/Firefox/Safari/Edge/Opera/Brave/Vivaldi",
    );
  }
  if (!cookies.SUBP) {
    warnings.push(
      "Missing SUBP - provide via --SUBP, SUBP env var, or login to weibo.com in Chrome/Firefox/Safari/Edge/Opera/Brave/Vivaldi",
    );
  }
  if (!cookies.WBPSESS) {
    warnings.push(
      "Missing WBPSESS - provide via --WBPSESS, WBPSESS env var, or login to weibo.com in Chrome/Firefox/Safari/Edge/Opera/Brave/Vivaldi",
    );
  }
  if (!cookies.ALF) {
    warnings.push(
      "Missing ALF - provide via --ALF, ALF env var, or login to weibo.com in Chrome/Firefox/Safari/Edge/Opera/Brave/Vivaldi",
    );
  }
  if (!cookies.SCF) {
    warnings.push(
      "Missing SCF - provide via --SCF, SCF env var, or login to weibo.com in Chrome/Firefox/Safari/Edge/Opera/Brave/Vivaldi",
    );
  }
  if (!cookies.XSRFTOKEN) {
    warnings.push(
      "Missing XSRFTOKEN - provide via --XSRFTOKEN, XSRFTOKEN env var, or login to weibo.com in Chrome/Firefox/Safari/Edge/Opera/Brave/Vivaldi",
    );
  }

  return { cookies, warnings };
}

export type OutputConfig = {
  plain: boolean;
  emoji: boolean;
  color: boolean;
  hyperlinks: boolean;
};

export type StatusKind = "ok" | "warn" | "err" | "info" | "hint";

export type LabelKind =
  | "url"
  | "date"
  | "source"
  | "engine"
  | "credentials"
  | "user"
  | "userId"
  | "email";

const STATUS: Record<
  StatusKind,
  { emoji: string; text: string; plain: string }
> = {
  ok: { emoji: "✅", text: "OK:", plain: "[ok]" },
  warn: { emoji: "⚠️", text: "Warning:", plain: "[warn]" },
  err: { emoji: "❌", text: "Error:", plain: "[err]" },
  info: { emoji: "ℹ️", text: "Info:", plain: "[info]" },
  hint: { emoji: "ℹ️", text: "Hint:", plain: "[hint]" },
};

const LABELS: Record<
  LabelKind,
  { emoji: string; text: string; plain: string }
> = {
  url: { emoji: "🔗", text: "URL:", plain: "url:" },
  date: { emoji: "📅", text: "Date:", plain: "date:" },
  source: { emoji: "📍", text: "Source:", plain: "source:" },
  engine: { emoji: "⚙️", text: "Engine:", plain: "engine:" },
  credentials: { emoji: "🔑", text: "Credentials:", plain: "credentials:" },
  user: { emoji: "🙋", text: "User:", plain: "user:" },
  userId: { emoji: "🪪", text: "User ID:", plain: "user_id:" },
  email: { emoji: "📧", text: "Email:", plain: "email:" },
};

export function statusPrefix(kind: StatusKind, cfg: OutputConfig): string {
  if (cfg.plain) {
    return `${STATUS[kind].plain} `;
  }
  if (cfg.emoji) {
    return `${STATUS[kind].emoji} `;
  }
  return `${STATUS[kind].text} `;
}

export function labelPrefix(kind: LabelKind, cfg: OutputConfig): string {
  if (cfg.plain) {
    return `${LABELS[kind].plain} `;
  }
  if (cfg.emoji) {
    return `${LABELS[kind].emoji} `;
  }
  return `${LABELS[kind].text} `;
}

export function resolveOutputConfigFromArgv(
  argv: string[],
  env: NodeJS.ProcessEnv,
  isTty: boolean,
): OutputConfig {
  const hasNoColorEnv = Object.hasOwn(env, "NO_COLOR") || env.TERM === "dumb";
  const defaultColor = isTty && !hasNoColorEnv;

  const plain = argv.includes("--plain");
  const emoji = !plain && !argv.includes("--no-emoji");
  const color = !plain && !argv.includes("--no-color") && defaultColor;
  const hyperlinks = !plain && isTty;

  return { plain, emoji, color, hyperlinks };
}

export function resolveOutputConfigFromCommander(
  opts: { plain?: boolean; emoji?: boolean; color?: boolean },
  env: NodeJS.ProcessEnv,
  isTty: boolean,
): OutputConfig {
  const hasNoColorEnv = Object.hasOwn(env, "NO_COLOR") || env.TERM === "dumb";
  const defaultColor = isTty && !hasNoColorEnv;

  const plain = Boolean(opts.plain);
  const emoji = !plain && (opts.emoji ?? true);
  const color = !plain && (opts.color ?? true) && defaultColor;
  const hyperlinks = !plain && isTty;

  return { plain, emoji, color, hyperlinks };
}

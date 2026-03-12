import { OutputConfig } from "../lib/output";
import { Command } from "commander";
import { statusPrefix, labelPrefix } from "../lib/output";
import { CookieSource } from "../lib/cookie";

export type WeiboConfig = {
  chromeProfile?: string;
  firefoxProfile?: string;
  bravoProfile?: string;
  edgeProfile?: string;
  safariProfile?: string;
  vivaldiProfile?: string;
  cookieSource?: CookieSource | CookieSource[];
  cookieTimeoutMs?: number;
  timeoutMs?: number;
};


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
  resolveTimeoutFromOptions: (options: { timeout?: string | number }) => number | undefined;
  resolveQuoteDepthFromOptions: (options: { quoteDepth?: string | number }) => number | undefined;
  resolveCredentialsFromOptions: (opts: CredentialsOptions) => ReturnType<typeof resolveCredentials>;
  loadMedia: (opts: { media: string[]; alts: string[] }) => MediaSpec[];
  printWeibos: (tweets: WeiboData[], opts?: { json?: boolean; emptyMessage?: string; showSeparator?: boolean }) => void;
  printTweetsResult: (
    result: {
      tweets?: WeiboData[];
      nextCursor?: string;
    },
    opts: {
      json: boolean;
      usePagination: boolean;
      emptyMessage: string;
    },
  ) => void;
  extractWeiboUserId: (weiboUserIdOrUrl: string) => string;
};
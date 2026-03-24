export type CliInvocation = {
  argv: string[] | null;
  showHelp: boolean;
};

const WEIBO_URL_REGEX =
  /^(?:https?:\/\/)?(?:www\.)?(?:weibo\.com)\/[^/]+\/status\/\d+/i;

export function looksLikeWeiboInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return WEIBO_URL_REGEX.test(trimmed);
}

export function resolveCliInvocation(
  rawArgs: string[],
  knownCommands: Set<string>,
): CliInvocation {
  if (rawArgs.length === 0) {
    return { argv: null, showHelp: true };
  }

  const hasKnownCommand = rawArgs.some((arg) => knownCommands.has(arg));

  if (!hasKnownCommand) {
    const weiboArgIndex = rawArgs.findIndex(looksLikeWeiboInput);
    if (weiboArgIndex >= 0) {
      const rewrittenArgs = [...rawArgs];
      rewrittenArgs.splice(weiboArgIndex, 0, "read");
      return { argv: ["node", "weibo", ...rewrittenArgs], showHelp: false };
    }
  }

  return { argv: null, showHelp: false };
}

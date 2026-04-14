import { registerUserCommands } from "../commands/users";
import { Command } from "commander";
import { CliContext, collectCookieSource } from "../cli/shared";
import { getCliVersion } from "../lib/version";
import { registerFollowCommands } from "../commands/follow";
import { registerPostCommands } from "../commands/post";
import { registerReadCommands } from "../commands/read";
import { registerDownloadCommands } from "../commands/download";
import { registerSearchCommands } from "../commands/search";

export const KNOWN_COMMANDS = new Set([
  "followers",
  "following",
  "follow",
  "unfollow",
  "post",
  "comment",
  "reply",
  "like",
  "read",
  "comments",
  "download",
  "search",
]);

const collect = (value: string, resouces: string[] = []): string[] => {
  resouces.push(value);
  return resouces;
};

export function createProgram(ctx: CliContext): Command {
  const program: Command = new Command();

  program
    .name("weibo")
    .description(
      "Weibo CLI — read, post, search, comment, follow, and download from Weibo",
    )
    .version(getCliVersion());

  // Authentication: manual cookie options
  program
    .option("--SUB <token>", "SUB cookie value")
    .option("--SUBP <token>", "SUBP cookie value")
    .option("--WBPSESS <token>", "WBPSESS cookie value")
    .option("--ALF <timestamp>", "ALF cookie value")
    .option("--SCF <token>", "SCF cookie value")
    .option("--XSRFTOKEN <token>", "XSRF-TOKEN cookie value");

  // Authentication: auto-extract cookies from browser profiles
  program
    .option(
      "--chrome-profile <name>",
      "Chrome profile name to extract cookies from",
      ctx.config.chromeProfile,
    )
    .option(
      "--chrome-profile-dir <path>",
      "Chrome profile directory or cookie DB path",
      ctx.config.chromeProfileDir,
    )
    .option(
      "--edge-profile <name>",
      "Edge profile name to extract cookies from",
      ctx.config.edgeProfile,
    )
    .option(
      "--edge-profile-dir <path>",
      "Edge profile directory or cookie DB path",
      ctx.config.edgeProfileDir,
    )
    .option(
      "--firefox-profile <name>",
      "Firefox profile name to extract cookies from",
      ctx.config.firefoxProfile,
    )
    .option(
      "--firefox-profile-dir <path>",
      "Firefox profile directory or cookie DB path",
      ctx.config.firefoxProfileDir,
    )
    .option(
      "--opera-profile <name>",
      "Opera profile name to extract cookies from",
      ctx.config.operaProfile,
    )
    .option(
      "--opera-profile-dir <path>",
      "Opera profile directory or cookie DB path",
      ctx.config.operaProfileDir,
    )
    .option(
      "--brave-profile <name>",
      "Brave profile name to extract cookies from",
      ctx.config.braveProfile,
    )
    .option(
      "--brave-profile-dir <path>",
      "Brave profile directory or cookie DB path",
      ctx.config.braveProfileDir,
    )
    .option(
      "--vivaldi-profile <name>",
      "Vivaldi profile name to extract cookies from",
      ctx.config.vivaldiProfile,
    )
    .option(
      "--vivaldi-profile-dir <path>",
      "Vivaldi profile directory or cookie DB path",
      ctx.config.vivaldiProfileDir,
    )
    .option(
      "--cookie-source <source>",
      "Browser to extract cookies from, e.g. chrome, edge (repeatable)",
      collectCookieSource,
    );

  // Global output & request options
  program
    .option(
      "--media <path>",
      "Attach media file (repeatable, up to 18 images or 1 video)",
      collect,
    )
    .option(
      "--alt <text>",
      "Alt text for the corresponding --media (repeatable, matches order)",
      collect,
    )
    .option("--timeout <ms>", "Request timeout in milliseconds")
    .option("--plain", "Plain output (no emoji, no color)")
    .option("--no-emoji", "Disable emoji in output")
    .option("--no-color", "Disable ANSI colors (or set NO_COLOR env)");

  registerUserCommands(program, ctx);
  registerFollowCommands(program, ctx);
  registerPostCommands(program, ctx);
  registerReadCommands(program, ctx);
  registerDownloadCommands(program, ctx);
  registerSearchCommands(program, ctx);
  return program;
}

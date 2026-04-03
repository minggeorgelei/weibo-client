import { registerUserCommands } from "../commands/users";
import { Command } from "commander";
import { CliContext, collectCookieSource } from "../cli/shared";
import { getCliVersion } from "../lib/version";
import { registerFollowCommands } from "../commands/follow";
import { registerPostCommands } from "../commands/post";
import { registerReadCommands } from "../commands/read";

export const KNOWN_COMMANDS = new Set([
  "followers",
  "following",
  "follow",
  "unfollow",
  "post",
  "comment",
  "read",
]);

const collect = (value: string, resouces: string[] = []): string[] => {
  resouces.push(value);
  return resouces;
};

export function createProgram(ctx: CliContext): Command {
  const program: Command = new Command();

  program
    .name("weiboclient")
    .description("Post weibos and replies via WEIBO Client API")
    .version(getCliVersion());

  program
    .option("--SUB <token>", "Weibo SUB cookie")
    .option("--SUBP <token>", "Weibo SUBP cookie")
    .option("--WBPSESS <token>", "Weibo WBPSESS cookie")
    .option("--ALF <timestamp>", "Weibo ALF cookie")
    .option("--SCF <token>", "Weibo SCF cookie")
    .option("--XSRFTOKEN <token>", "Weibo XSRFTOKEN cookie")
    .option(
      "--chrome-profile <name>",
      "Chrome profile name for cookie extraction",
      ctx.config.chromeProfile,
    )
    .option(
      "--chrome-profile-dir <path>",
      "Chrome profile directory or cookie DB path for cookie extraction",
      ctx.config.chromeProfileDir,
    )
    .option(
      "--edge-profile <name>",
      "Edge profile name for cookie extraction",
      ctx.config.edgeProfile,
    )
    .option(
      "--edge-profile-dir <path>",
      "Edge profile directory or cookie DB path for cookie extraction",
      ctx.config.edgeProfileDir,
    )
    .option(
      "--firefox-profile <name>",
      "Firefox profile name for cookie extraction",
      ctx.config.firefoxProfile,
    )
    .option(
      "--firefox-profile-dir <path>",
      "Firefox profile directory or cookie DB path for cookie extraction",
      ctx.config.firefoxProfileDir,
    )
    .option(
      "--opera-profile <name>",
      "Opera profile name for cookie extraction",
      ctx.config.operaProfile,
    )
    .option(
      "--opera-profile-dir <path>",
      "Opera profile directory or cookie DB path for cookie extraction",
      ctx.config.operaProfileDir,
    )
    .option(
      "--brave-profile <name>",
      "Brave profile name for cookie extraction",
      ctx.config.braveProfile,
    )
    .option(
      "--brave-profile-dir <path>",
      "Brave profile directory or cookie DB path for cookie extraction",
      ctx.config.braveProfileDir,
    )
    .option(
      "--vivaldi-profile <name>",
      "Vivaldi profile name for cookie extraction",
      ctx.config.vivaldiProfile,
    )
    .option(
      "--vivaldi-profile-dir <path>",
      "Vivaldi profile directory or cookie DB path for cookie extraction",
      ctx.config.vivaldiProfileDir,
    )
    .option(
      "--cookie-source <source>",
      "Cookie source for browser cookie extraction (repeatable)",
      collectCookieSource,
    )
    .option(
      "--media <path>",
      "Attach media file (repeatable, up to 5 images or 1 video)",
      collect,
    )
    .option(
      "--alt <text>",
      "Alt text for the corresponding --media (repeatable)",
      collect,
    )
    .option("--timeout <ms>", "Request timeout in milliseconds")
    .option("--plain", "Plain output (stable, no emoji, no color)")
    .option("--no-emoji", "Disable emoji output")
    .option("--no-color", "Disable ANSI colors (or set NO_COLOR)");

  registerUserCommands(program, ctx);
  registerFollowCommands(program, ctx);
  registerPostCommands(program, ctx);
  registerReadCommands(program, ctx);
  return program;
}

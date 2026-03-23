import { registerUserCommands } from "../commands/users";
import { Command } from "commander";
import { CliContext } from "../cli/shared";
import { getCliVersion } from "../lib/version";

export const KNOWN_COMMANDS = new Set(["followers", "following"]);

export function createProgram(ctx: CliContext): Command {
  const program: Command = new Command();

  program
    .name("weiboclient")
    .description("Post weibos and replies via WEIBO Client API")
    .version(getCliVersion());
  return program;
}

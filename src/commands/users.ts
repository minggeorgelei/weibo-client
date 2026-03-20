import type { Command } from "commander";
import {
  FollowingResult,
  FollowerResult,
  WeiboUser,
} from "../lib/weiboClientTypes";
import { CliContext } from "../cli/shared";
import { WeiboClientUsers } from "../lib/weiboClientUsers";

type UserListCommandSpec = {
  name: "following" | "followers";
  description: string;
  fetch: (
    client: WeiboClientUsers,
    screenName: string,
    pageNumber?: number,
  ) => Promise<FollowingResult | FollowerResult>;
};

type UserListCommandOpts = {
  screenName?: string;
  startPage?: number;
  all?: boolean;
  maxPages?: number;
  json?: boolean;
};

async function runUserListCommand(
  program: Command,
  ctx: CliContext,
  spec: UserListCommandSpec,
  cmdOpts: UserListCommandOpts,
): Promise<void> {}

export function registerUserCommands(program: Command, ctx: CliContext): void {
  const registerUserListCommand = (spec: UserListCommandSpec): void => {
    program
      .command(spec.name)
      .description(spec.description)
      .option(
        "--screen-name <screenName>",
        `Screen name to get ${spec.name} for (defaults to current user)`,
      )
      .option("--all", "Fetch all users (paginate automatically)")
      .option("--json", "Output as JSON")
      .action(async (cmdOpts: UserListCommandOpts) =>
        runUserListCommand(program, ctx, spec, cmdOpts),
      );
  };
}

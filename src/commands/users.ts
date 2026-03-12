import type { Command } from "commander";
import { WeiboUser } from "../lib/weiboClientTypes";
import { CliContext } from "../cli/shared";
import { WeiboClientUsers } from "../lib/weiboClientUsers";

type UserListCommandSpec = {
  name: 'following' | 'followers';
  description: string;
  fetch: (
    client: WeiboClientUsers,
    userId: string,
    count: number,
    cursor: string | undefined,
  ) => Promise<PagedUsersResult>;
};

type PagedUsersResult = {
  success: boolean;
  users?: WeiboUser[];
  nextCursor?: string;
  error?: string;
};

type UserListCommandOpts = {
  user?: string;
  count?: string;
  cursor?: string;
  all?: boolean;
  maxPages?: string;
  json?: boolean;
};

async function runUserListCommand(
  program: Command,
  ctx: CliContext,
  spec: UserListCommandSpec,
  cmdOpts: UserListCommandOpts,
): Promise<void> {
}

export function registerUserCommands(program: Command, ctx: CliContext): void {
  const registerUserListCommand = (spec: UserListCommandSpec): void => {
    program
      .command(spec.name)
      .description(spec.description)
      .option('--user <userId>', `User ID to get ${spec.name} for (defaults to current user)`)
      .option('-n, --count <number>', 'Number of users to fetch', '50')
      .option('--all', 'Fetch all users (paginate automatically)')
      .option('--json', 'Output as JSON')
      .action(async (cmdOpts: UserListCommandOpts) => runUserListCommand(program, ctx, spec, cmdOpts));
  };
}
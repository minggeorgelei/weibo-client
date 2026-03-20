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
    userId: number,
    pageNumber?: number,
  ) => Promise<FollowingResult | FollowerResult>;
};

type UserListCommandOpts = {
  screenName?: string;
  startPage?: string;
  all?: boolean;
  maxPages?: string;
  json?: boolean;
};

function printUsers(users: WeiboUser[], ctx: CliContext): void {
  for (const user of users) {
    console.log(`@${user.id} (${user.screenName})`);
    console.log(
      `  ${user.description.slice(0, 100)}${user.description.length > 100 ? "..." : ""}`,
    );
    console.log(
      `  ${ctx.p("info")}${user.followersCount.toLocaleString()} followers`,
    );
    console.log("──────────────────────────────────────────────────");
  }
}

async function runUserListCommand(
  program: Command,
  ctx: CliContext,
  spec: UserListCommandSpec,
  cmdOpts: UserListCommandOpts,
): Promise<void> {
  const opts = program.opts();
  const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
  const maxPages = cmdOpts.maxPages
    ? Number.parseInt(cmdOpts.maxPages)
    : undefined;
  const startPage = cmdOpts.startPage ? Number.parseInt(cmdOpts.startPage) : 1;
  if (isNaN(startPage) || startPage <= 0) {
    console.error(
      `${ctx.p("err")}Invalid --start-page. Expects a number greater than 0`,
    );
    process.exit(1);
  }

  if (maxPages !== undefined && (isNaN(maxPages) || maxPages <= 0)) {
    console.error(
      `${ctx.p("err")}Invalid --max-pages. Expects a number greater than 0`,
    );
    process.exit(1);
  }

  if (maxPages !== undefined && !cmdOpts.all) {
    console.error(`${ctx.p("err")}--max-pages requires --all`);
    process.exit(1);
  }

  const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);
  for (const warning of warnings) {
    console.error(`${ctx.p("warn")}${warning}`);
  }

  if (
    !cookies.SUB ||
    !cookies.SUBP ||
    !cookies.ALF ||
    !cookies.SCF ||
    !cookies.WBPSESS ||
    !cookies.XSRFTOKEN
  ) {
    console.error(`${ctx.p("err")}Missing required cookies`);
    process.exit(1);
  }

  const weiboClient = new WeiboClientUsers({ cookies, timeoutMs });
  const screenName = cmdOpts.screenName;
  let userId = -1;
  if (screenName === undefined) {
    const result = await weiboClient.getCurrentUser();
    if (!result.success) {
      console.error(`${ctx.p("err")}Cannot get current User`);
      process.exit(1);
    }
    const currentUser = result.user!;
    userId = currentUser.id;
  } else {
    const result = await weiboClient.getUserByScreenName(screenName);
    if (!result.success) {
      console.error(
        `${ctx.p("err")}User with screen name ${screenName} not found`,
      );
      process.exit(1);
    }
    userId = result.user!.id;
  }

  if (cmdOpts.all) {
    const allUsers: WeiboUser[] = [];
    let pageCounter = 0;
    let nextPage: number | undefined = undefined;
    let stoppedByMaxPages = false;
    while (true) {
      if (!cmdOpts.json) {
        console.error(
          `${ctx.p("info")}Fetching page ${startPage + pageCounter}`,
        );
      }

      const result = await spec.fetch(
        weiboClient,
        userId,
        startPage + pageCounter,
      );
      if (!result.success) {
        console.error(`${ctx.p("err")}Failed to get user list`);
        process.exit(1);
      }
      pageCounter += 1;
      const userList = result.users!;
      allUsers.push(...userList);
      nextPage = result.nextPage!;
      if (userList.length === 0) {
        break;
      }
      if (maxPages && pageCounter >= maxPages) {
        stoppedByMaxPages = true;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (cmdOpts.json) {
      console.log(
        JSON.stringify(
          {
            users: allUsers,
            nextPage: nextPage <= 1 ? null : nextPage,
          },
          null,
          2,
        ),
      );
    } else {
      console.error(`${ctx.p("info")}Total: ${allUsers.length} users`);
      if (stoppedByMaxPages && nextPage > 1) {
        console.error(
          `${ctx.p("info")}Stopped at --max-pages. Use --start-page ${nextPage} to continue.`,
        );
      }
      printUsers(allUsers, ctx);
    }
    return;
  }

  const result = await spec.fetch(weiboClient, userId, startPage);
  if (!result.success) {
    console.error(`${ctx.p("err")}Failed to get user list`);
    process.exit(1);
  }
  const userList = result.users!;
  const nextPage = result.nextPage!;
  if (cmdOpts.json) {
    console.log(
      JSON.stringify(
        {
          users: userList,
          nextPage: nextPage <= 1 ? null : nextPage,
        },
        null,
        2,
      ),
    );
  } else {
    if (userList.length === 0) {
      console.error(`${ctx.p("info")}No users found`);
    } else {
      if (nextPage > 1) {
        console.error(`${ctx.p("info")}Next page ${nextPage}`);
      }
      printUsers(userList, ctx);
    }
  }
}

export function registerUserCommands(program: Command, ctx: CliContext): void {
  const registerUserListCommand = (spec: UserListCommandSpec): void => {
    program
      .command(spec.name)
      .description(spec.description)
      .option(
        "--screen-name <screenName>",
        `Screen name to get ${spec.name} for (defaults to current user)`,
      )
      .option(
        "--start-page <number>",
        "Start from page number (default: 1)",
        "1",
      )
      .option("--all", "Fetch all users (paginate automatically)")
      .option(
        "--max-pages <number>",
        "Maximum number of pages to fetch (requires --all)",
      )
      .option("--json", "Output as JSON")
      .action(async (cmdOpts: UserListCommandOpts) =>
        runUserListCommand(program, ctx, spec, cmdOpts),
      );
  };

  registerUserListCommand({
    name: "followers",
    description: "List followers of a user",
    fetch: (client, userId, pageNumber) =>
      client.getFollowers(userId, pageNumber),
  });

  registerUserListCommand({
    name: "following",
    description: "List users followed by a user",
    fetch: (client, userId, pageNumber) =>
      client.getFollowing(userId, pageNumber),
  });
}

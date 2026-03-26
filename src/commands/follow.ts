import { Command } from "commander";
import { WeiboClientFollow } from "../lib/weiboClientFollow";
import { CliContext, resolveUserId } from "../cli/shared";

export function registerFollowCommands(
  program: Command,
  ctx: CliContext,
): void {
  program
    .command("follow")
    .description("Follow a user")
    .argument(
      "<username-or-id>",
      "Username (with or without @) or user ID to follow",
    )
    .action(async (usernameOrId: string) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      const { cookies, warnings } =
        await ctx.resolveCredentialsFromOptions(opts);

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
        console.error(`${ctx.p("err")}Missing required credentials`);
        process.exit(1);
      }

      const client = new WeiboClientFollow({ cookies, timeoutMs });

      const resolved = await resolveUserId(client, usernameOrId, ctx);
      if (!resolved) {
        process.exit(1);
      }

      const { userId, screenName } = resolved;

      const result = await client.followUser(userId);
      let displayName = screenName
        ? `@${screenName} ${userId}`
        : String(userId);
      if (result.success) {
        displayName = `@${result.user?.screenName} ${userId}`;
        console.log(`${ctx.p("ok")}Now following ${displayName}`);
      } else {
        console.error(
          `${ctx.p("err")}Failed to follow ${displayName}: ${result.error}`,
        );
        process.exit(1);
      }
    });

  program
    .command("unfollow")
    .description("Unfollow a user")
    .argument(
      "<username-or-id>",
      "Username (with or without @) or user ID to unfollow",
    )
    .action(async (usernameOrId: string) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      const { cookies, warnings } =
        await ctx.resolveCredentialsFromOptions(opts);

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
        console.error(`${ctx.p("err")}Missing required credentials`);
        process.exit(1);
      }

      const client = new WeiboClientFollow({ cookies, timeoutMs });

      const resolved = await resolveUserId(client, usernameOrId, ctx);
      if (!resolved) {
        process.exit(1);
      }

      const { userId, screenName } = resolved;

      const result = await client.unfollowUser(userId);
      let displayName = screenName
        ? `@${screenName} ${userId}`
        : String(userId);
      if (result.success) {
        displayName = `@${result.user?.screenName} ${userId}`;
        console.log(`${ctx.p("ok")}Now unfollowing ${displayName}`);
      } else {
        console.error(
          `${ctx.p("err")}Failed to unfollow ${displayName}: ${result.error}`,
        );
        process.exit(1);
      }
    });
}

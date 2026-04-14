import { Command } from "commander";
import { CliContext } from "../cli/shared";
import { WeiboClientSearch } from "../lib/weiboClientSearch";
import { WeiboPostInfo } from "../lib/weiboClientTypes";

type SearchCommandOpts = {
  limit?: string;
  json?: boolean;
};

function printPost(post: WeiboPostInfo, ctx: CliContext): void {
  const output = ctx.getOutput();
  const regionStr = post.region ? `  ${post.region}` : "";
  console.log(
    `[${post.id}] @${post.user.screenName}  ·  ${post.createdAt}${regionStr}`,
  );
  console.log(post.content);
  if (output.emoji) {
    console.log(
      `💬 ${post.commentCount}  🔁 ${post.repostCount}  ❤️  ${post.attitudesCount}`,
    );
  } else {
    console.log(
      `comments: ${post.commentCount}  reposts: ${post.repostCount}  likes: ${post.attitudesCount}`,
    );
  }
  if (post.images && post.images.length > 0) {
    for (const img of post.images) {
      console.log(`  [image] ${img.url}`);
    }
  }
  if (post.video) {
    console.log(`  [video] ${post.video.name}  ${post.video.streamUrl}`);
  }
  console.log("──────────────────────────────────────────────────");
}

export function registerSearchCommands(
  program: Command,
  ctx: CliContext,
): void {
  program
    .command("search <query>")
    .description(
      "Search weibo posts by keyword (supports pagination via --limit)",
    )
    .option(
      "--limit <number>",
      "Maximum number of posts to fetch (paginates automatically)",
    )
    .option("--json", "Output as JSON")
    .action(async (query: string, cmdOpts: SearchCommandOpts) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      const limit = cmdOpts.limit ? parseInt(cmdOpts.limit) : undefined;
      if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
        console.error(
          `${ctx.p("err")}Invalid --limit. Expects a number greater than 0`,
        );
        process.exit(1);
      }

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

      const client = new WeiboClientSearch({ cookies, timeoutMs });

      const shouldPaginate = limit !== undefined;

      if (!shouldPaginate) {
        // Single page fetch (default 20 results)
        const result = await client.searchPosts(query);
        if (!result.success) {
          console.error(`${ctx.p("err")}Failed to search: ${result.error}`);
          process.exit(1);
        }
        const posts = result.posts!;
        if (cmdOpts.json) {
          console.log(JSON.stringify({ posts }, null, 2));
        } else {
          if (posts.length === 0) {
            console.error(`${ctx.p("info")}No posts found`);
          } else {
            for (const post of posts) printPost(post, ctx);
          }
        }
        return;
      }

      // Multi-page fetch
      const allPosts: WeiboPostInfo[] = [];
      let page = 1;

      while (true) {
        if (!cmdOpts.json) {
          console.error(`${ctx.p("info")}Fetching page ${page}`);
        }

        const result = await client.searchPosts(query);
        if (!result.success) {
          console.error(`${ctx.p("err")}Failed to search: ${result.error}`);
          process.exit(1);
        }

        const pagePosts = result.posts!;
        if (pagePosts.length === 0) break;

        allPosts.push(...pagePosts);

        if (allPosts.length >= limit) break;

        page++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const finalPosts = allPosts.slice(0, limit);

      if (cmdOpts.json) {
        console.log(JSON.stringify({ posts: finalPosts }, null, 2));
      } else {
        console.error(`${ctx.p("info")}Total: ${finalPosts.length} posts`);
        for (const post of finalPosts) printPost(post, ctx);
      }
    });
}

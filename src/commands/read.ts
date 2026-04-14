import { Command } from "commander";
import { CliContext, resolveUserId } from "../cli/shared";
import { WeiboClientUserWeibo } from "../lib/weiboClientUserWeibo";
import { WeiboPostInfo, WeiboCommentInfo } from "../lib/weiboClientTypes";

type ReadCommandOpts = {
  screenName?: string;
  all?: boolean;
  limit?: string;
  since?: string;
  feature?: string;
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

type CommentsCommandOpts = {
  sort?: string;
  limit?: string;
  maxChildren?: string;
  noChildren?: boolean;
  json?: boolean;
};

function printComment(
  comment: WeiboCommentInfo,
  ctx: CliContext,
  indent: number = 0,
): void {
  const output = ctx.getOutput();
  const pad = "  ".repeat(indent);
  console.log(
    `${pad}[${comment.id}] @${comment.user.screenName}  ·  ${comment.createdAt}`,
  );
  console.log(`${pad}${comment.content}`);
  if (output.emoji) {
    console.log(
      `${pad}❤️  ${comment.likeCount}  💬 ${comment.totalReplyCount}`,
    );
  } else {
    console.log(
      `${pad}likes: ${comment.likeCount}  replies: ${comment.totalReplyCount}`,
    );
  }
  if (comment.comments && comment.comments.length > 0) {
    for (const child of comment.comments) {
      printComment(child, ctx, indent + 1);
    }
  }
  if (indent === 0) {
    console.log("──────────────────────────────────────────────────");
  }
}

export function registerReadCommands(program: Command, ctx: CliContext): void {
  program
    .command("read")
    .description("Read posts from a user's timeline (defaults to current user)")
    .option(
      "--screen-name <name>",
      "Screen name or user ID to read posts for (defaults to current user)",
    )
    .option("--all", "Fetch all posts (paginate automatically)")
    .option(
      "--limit <number>",
      "Maximum number of posts to fetch (paginates automatically)",
    )
    .option(
      "--since <date>",
      "Only fetch posts created after this date (e.g. 2026-03-01)",
    )
    .option(
      "--feature <number>",
      "Post filter: 0=all, 1=original, 2=images, 3=video, 4=music (default: 0)",
      "0",
    )
    .option("--json", "Output as JSON")
    .action(async (cmdOpts: ReadCommandOpts) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      const limit = cmdOpts.limit ? parseInt(cmdOpts.limit) : undefined;
      if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
        console.error(
          `${ctx.p("err")}Invalid --limit. Expects a number greater than 0`,
        );
        process.exit(1);
      }

      let sinceDate: Date | undefined;
      if (cmdOpts.since) {
        sinceDate = new Date(cmdOpts.since);
        if (isNaN(sinceDate.getTime())) {
          console.error(
            `${ctx.p("err")}Invalid --since date. Use ISO format e.g. 2026-03-01`,
          );
          process.exit(1);
        }
      }

      const feature = cmdOpts.feature ? parseInt(cmdOpts.feature) : 0;
      if (isNaN(feature) || feature < 0) {
        console.error(
          `${ctx.p("err")}Invalid --feature. Expects a non-negative number`,
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

      const client = new WeiboClientUserWeibo({ cookies, timeoutMs });

      let userId: number;
      if (cmdOpts.screenName === undefined) {
        const result = await client.getCurrentUser();
        if (!result.success) {
          console.error(`${ctx.p("err")}Cannot get current user`);
          process.exit(1);
        }
        userId = result.user!.id;
      } else {
        const resolved = await resolveUserId(client, cmdOpts.screenName, ctx);
        if (!resolved) process.exit(1);
        userId = resolved.userId;
      }

      const shouldPaginate =
        cmdOpts.all || limit !== undefined || sinceDate !== undefined;

      if (!shouldPaginate) {
        // Single page fetch
        const result = await client.getUserPosts(userId, 1, feature);
        if (!result.success) {
          console.error(`${ctx.p("err")}Failed to get posts: ${result.error}`);
          process.exit(1);
        }
        const posts = result.posts!;
        if (cmdOpts.json) {
          console.log(
            JSON.stringify(
              { posts, nextPage: posts.length === 0 ? null : 2 },
              null,
              2,
            ),
          );
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
      let hitSinceLimit = false;

      while (true) {
        if (!cmdOpts.json) {
          console.error(`${ctx.p("info")}Fetching page ${page}`);
        }

        const result = await client.getUserPosts(userId, page, feature);
        if (!result.success) {
          console.error(`${ctx.p("err")}Failed to get posts: ${result.error}`);
          process.exit(1);
        }

        let pagePosts = result.posts!;
        if (pagePosts.length === 0) break;

        if (sinceDate) {
          const before = pagePosts.length;
          pagePosts = pagePosts.filter(
            (p) => new Date(p.createdAt) >= sinceDate!,
          );
          if (pagePosts.length < before) hitSinceLimit = true;
        }

        allPosts.push(...pagePosts);

        if (hitSinceLimit) break;
        if (limit !== undefined && allPosts.length >= limit) break;

        page++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const finalPosts =
        limit !== undefined ? allPosts.slice(0, limit) : allPosts;

      if (cmdOpts.json) {
        console.log(JSON.stringify({ posts: finalPosts }, null, 2));
      } else {
        console.error(`${ctx.p("info")}Total: ${finalPosts.length} posts`);
        for (const post of finalPosts) printPost(post, ctx);
      }
    });

  program
    .command("comments <postId>")
    .description("Read comments for a post (supports sorting, child comments)")
    .option("--sort <number>", "Sort order: 0=hot, 1=time (default: 0)", "0")
    .option("--limit <number>", "Maximum number of parent comments to fetch")
    .option(
      "--max-children <number>",
      "Maximum number of child comments per parent (default: first page)",
    )
    .option("--no-children", "Skip fetching child comments entirely")
    .option("--json", "Output as JSON")
    .action(async (postId: string, cmdOpts: CommentsCommandOpts) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      const flow = cmdOpts.sort ? parseInt(cmdOpts.sort) : 0;
      if (isNaN(flow) || (flow !== 0 && flow !== 1)) {
        console.error(
          `${ctx.p("err")}Invalid --sort. Expects 0 (hot) or 1 (time)`,
        );
        process.exit(1);
      }

      const limit = cmdOpts.limit ? parseInt(cmdOpts.limit) : undefined;
      if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
        console.error(
          `${ctx.p("err")}Invalid --limit. Expects a number greater than 0`,
        );
        process.exit(1);
      }

      const maxChildren = cmdOpts.maxChildren
        ? parseInt(cmdOpts.maxChildren)
        : undefined;
      if (
        maxChildren !== undefined &&
        (isNaN(maxChildren) || maxChildren <= 0)
      ) {
        console.error(
          `${ctx.p("err")}Invalid --max-children. Expects a number greater than 0`,
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

      const client = new WeiboClientUserWeibo({ cookies, timeoutMs });

      // --no-children => maxChildComments=0, --max-children N => N, default => undefined (first page)
      const maxChildComments = cmdOpts.noChildren === true ? 0 : maxChildren;

      if (!cmdOpts.json) {
        const childrenDesc =
          maxChildComments === 0
            ? "none"
            : maxChildComments !== undefined
              ? `max ${maxChildComments}`
              : "first page";
        console.error(
          `${ctx.p("info")}Fetching comments for post ${postId} (sort: ${flow === 0 ? "hot" : "time"}, children: ${childrenDesc}${limit ? `, limit: ${limit}` : ""})`,
        );
      }

      const result = await client.getUserComments(postId, {
        flow,
        maxComments: limit,
        maxChildComments,
      });

      if (!result.success) {
        console.error(`${ctx.p("err")}Failed to get comments: ${result.error}`);
        process.exit(1);
      }

      const comments = result.comments!;

      if (cmdOpts.json) {
        console.log(JSON.stringify({ comments }, null, 2));
      } else {
        if (comments.length === 0) {
          console.error(`${ctx.p("info")}No comments found`);
        } else {
          console.error(`${ctx.p("info")}Total: ${comments.length} comments`);
          for (const comment of comments) printComment(comment, ctx);
        }
      }
    });
}

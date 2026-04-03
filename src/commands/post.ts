import { Command } from "commander";
import { WeiboClientPost } from "../lib/weiboClientPost";
import { CliContext } from "../cli/shared";

export function registerPostCommands(program: Command, ctx: CliContext): void {
  program
    .command("comment")
    .description("Comment on a weibo post")
    .argument("<id>", "ID of the weibo post to comment on")
    .argument("<content>", "Comment text")
    .option("-m, --media <path>", "Image to attach to the comment")
    .option("--repost", "Also repost the weibo")
    .option(
      "--comment-original",
      "Also comment on the original weibo (for reposts)",
    )
    .action(
      async (
        id: string,
        content: string,
        options: {
          media?: string;
          repost?: boolean;
          commentOriginal?: boolean;
        },
      ) => {
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

        const client = new WeiboClientPost({ cookies, timeoutMs });

        let picId: string | undefined;
        if (options.media) {
          console.error(`${ctx.p("info")}Uploading image ${options.media}...`);
          const uploadResult = await client.uploadImage(options.media);
          if (!uploadResult.success) {
            console.error(
              `${ctx.p("err")}Failed to upload image: ${uploadResult.error}`,
            );
            process.exit(1);
          }
          picId = uploadResult.pid;
          console.error(`${ctx.p("ok")}Image uploaded`);
        }

        const result = await client.createComment(id, content, {
          picId,
          isRepost: options.repost,
          commentOriginal: options.commentOriginal,
        });
        if (result.success) {
          console.log(`${ctx.p("ok")}Comment posted`);
        } else {
          console.error(`${ctx.p("err")}Failed to comment: ${result.error}`);
          process.exit(1);
        }
      },
    );

  program
    .command("post")
    .description("Post a new weibo")
    .argument("<content>", "Text content of the post")
    .option(
      "-m, --media <path>",
      "Media file to attach (image or video). Can be repeated up to 18 times for images, or once for a video.",
      (val: string, acc: string[]) => {
        acc.push(val);
        return acc;
      },
      [] as string[],
    )
    .option(
      "--alt <text>",
      "Alt text for media (repeatable, matches --media order)",
      (val: string, acc: string[]) => {
        acc.push(val);
        return acc;
      },
      [] as string[],
    )
    .action(
      async (content: string, options: { media: string[]; alt: string[] }) => {
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

        let mediaSpecs;
        try {
          mediaSpecs = ctx.loadMedia({
            media: options.media,
            alts: options.alt,
          });
        } catch (err) {
          console.error(
            `${ctx.p("err")}${err instanceof Error ? err.message : String(err)}`,
          );
          process.exit(1);
        }

        const client = new WeiboClientPost({ cookies, timeoutMs });

        const picIds: string[] = [];
        let videoMediaId: string | undefined;

        for (const spec of mediaSpecs) {
          if (spec.mime.startsWith("video/")) {
            console.error(`${ctx.p("info")}Uploading video ${spec.path}...`);
            const result = await client.uploadVideo(spec.path);
            if (!result.success) {
              console.error(
                `${ctx.p("err")}Failed to upload video: ${result.error}`,
              );
              process.exit(1);
            }
            videoMediaId = result.mediaId;
            console.error(`${ctx.p("ok")}Video uploaded`);
          } else {
            console.error(`${ctx.p("info")}Uploading image ${spec.path}...`);
            const result = await client.uploadImage(spec.path);
            if (!result.success) {
              console.error(
                `${ctx.p("err")}Failed to upload image: ${result.error}`,
              );
              process.exit(1);
            }
            picIds.push(result.pid!);
            console.error(`${ctx.p("ok")}Image uploaded`);
          }
        }

        const result = await client.createPost(content, picIds, videoMediaId);
        if (result.success) {
          console.log(`${ctx.p("ok")}Post published`);
        } else {
          console.error(`${ctx.p("err")}Failed to post: ${result.error}`);
          process.exit(1);
        }
      },
    );
}

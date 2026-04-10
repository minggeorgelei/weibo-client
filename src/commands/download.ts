import { Command } from "commander";
import { CliContext } from "../cli/shared";
import { WeiboClientDownload } from "../lib/weiboClientDownload";
import * as path from "path";

type DownloadCommandOpts = {
  outputPath?: string;
  resume?: boolean;
  idleTimeout?: string;
};

function defaultFilename(url: string): string {
  try {
    const urlPath = new URL(url).pathname;
    const base = path.basename(urlPath);
    if (base) return base;
  } catch {
    // fall through
  }
  return `download_${Date.now()}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function registerDownloadCommands(
  program: Command,
  ctx: CliContext,
): void {
  program
    .command("download <url>")
    .description("Download a media file (image or video) from a URL")
    .option("-o, --output <path>", "Output file path")
    .option(
      "--no-resume",
      "Disable HTTP Range resume and always download from scratch",
    )
    .option(
      "--idle-timeout <ms>",
      "Abort if no bytes are received for this many ms (default: 30000, 0 to disable)",
    )
    .action(async (url: string, cmdOpts: DownloadCommandOpts) => {
      const opts = program.opts();
      const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

      let idleTimeoutMs: number | undefined;
      if (cmdOpts.idleTimeout !== undefined) {
        idleTimeoutMs = parseInt(cmdOpts.idleTimeout);
        if (isNaN(idleTimeoutMs) || idleTimeoutMs < 0) {
          console.error(
            `${ctx.p("err")}Invalid --idle-timeout. Expects a non-negative number of ms`,
          );
          process.exit(1);
        }
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

      const outputPath = cmdOpts.outputPath ?? defaultFilename(url);

      console.error(`${ctx.p("info")}Downloading ${url}`);
      console.error(`${ctx.p("info")}Saving to ${outputPath}`);

      const client = new WeiboClientDownload({ cookies, timeoutMs });
      const result = await client.downloadMedia(url, outputPath, {
        resume: cmdOpts.resume,
        idleTimeoutMs,
      });

      if (!result.success) {
        console.error(`${ctx.p("err")}${result.error}`);
        process.exit(1);
      }

      if (result.alreadyComplete) {
        console.error(
          `${ctx.p("ok")}Already complete (${formatBytes(result.bytes ?? 0)}) at ${result.filePath}`,
        );
        return;
      }

      const resumedNote = result.resumed ? " (resumed)" : "";
      console.error(
        `${ctx.p("ok")}Saved ${formatBytes(result.bytes ?? 0)}${resumedNote} to ${result.filePath}`,
      );
    });
}

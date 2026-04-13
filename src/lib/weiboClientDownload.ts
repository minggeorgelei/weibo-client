import { WeiboClientBase } from "./weiboClientBase";
import { WeiboClientOptions } from "./weiboClientTypes";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  bytes?: number;
  resumed?: boolean;
  alreadyComplete?: boolean;
  contentType?: string;
  error?: string;
}

export class WeiboClientDownload extends WeiboClientBase {
  constructor(options: WeiboClientOptions) {
    super(options);
  }

  async downloadMedia(
    url: string,
    outputPath: string,
    options: { resume?: boolean; idleTimeoutMs?: number } = {},
  ): Promise<DownloadResult> {
    const headers: Record<string, string> = { ...this.getBaseHeaders() };
    delete headers.Host;

    // Resume support: if the target file already has bytes, ask the server to
    // continue from where we left off with an HTTP Range request.
    const resumeEnabled = options.resume !== false;
    let startByte = 0;
    let append = false;
    if (resumeEnabled) {
      try {
        const stat = fs.statSync(outputPath);
        if (stat.isFile() && stat.size > 0) {
          startByte = stat.size;
          headers.Range = `bytes=${startByte}-`;
          append = true;
        }
      } catch {
        // file doesn't exist — normal fresh download
      }
    }

    try {
      const response = await axios.get(url, {
        headers,
        responseType: "stream",
        timeout: this.timeoutMs,
        maxRedirects: 10,
        // Treat 416 as non-error so we can recognise "already complete".
        validateStatus: (s) => (s >= 200 && s < 300) || s === 416,
      });

      const contentType = response.headers["content-type"] as
        | string
        | undefined;

      // 416: server rejected our Range — the file is most likely already
      // fully downloaded.
      if (response.status === 416) {
        response.data.resume?.();
        try {
          const stat = fs.statSync(outputPath);
          return {
            success: true,
            filePath: outputPath,
            bytes: stat.size,
            alreadyComplete: true,
            contentType,
          };
        } catch (e) {
          return {
            success: false,
            error: `Server rejected range request (416) and existing file is missing`,
          };
        }
      }

      // If we requested a range but the server replied 200 instead of 206,
      // it doesn't honour Range — fall back to a fresh download.
      const resumed = append && response.status === 206;
      if (append && response.status === 200) {
        append = false;
        startByte = 0;
      }

      const dir = path.dirname(outputPath);
      if (dir && dir !== "." && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writer = fs.createWriteStream(
        outputPath,
        append ? { flags: "a" } : undefined,
      );
      let bytes = startByte;

      // Idle timeout: axios' own `timeout` only guards the headers phase in
      // stream mode. Once bytes start flowing, a stalled CDN can hang forever.
      // Reset a timer on every chunk; if it fires, tear down the response
      // stream with an error so the awaiter rejects.
      const idleTimeoutMs = options.idleTimeoutMs ?? 30000;
      let idleTimer: NodeJS.Timeout | null = null;
      const clearIdleTimer = (): void => {
        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }
      };
      const resetIdleTimer = (): void => {
        if (idleTimeoutMs <= 0) return;
        clearIdleTimer();
        idleTimer = setTimeout(() => {
          response.data.destroy(
            new Error(`Idle timeout: no data received for ${idleTimeoutMs}ms`),
          );
        }, idleTimeoutMs);
      };

      response.data.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        resetIdleTimer();
      });
      response.data.pipe(writer);
      resetIdleTimer();

      await new Promise<void>((resolve, reject) => {
        writer.on("finish", () => {
          clearIdleTimer();
          resolve();
        });
        writer.on("error", (err) => {
          clearIdleTimer();
          reject(err);
        });
        response.data.on("error", (err: Error) => {
          clearIdleTimer();
          writer.destroy();
          reject(err);
        });
      });

      return {
        success: true,
        filePath: outputPath,
        bytes,
        resumed,
        contentType,
      };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const statusPart = status ? ` (HTTP ${status})` : "";
        return {
          success: false,
          error: `Download failed${statusPart}: ${err.message}`,
        };
      }
      return {
        success: false,
        error: `Download failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

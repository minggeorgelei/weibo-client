import { WeiboClientBase } from "./weiboClientBase";
import { WeiboApiResult } from "./axiosInstance";
import {
  WeiboClientOptions,
  CreatePostResult,
  CreateCommentResult,
  SetLikeResult,
  UploadImageResult,
  UploadVideoResult,
  VideoCheckResponse,
} from "./weiboClientTypes";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { computeCrc32 } from "../cli/shared";

export interface IWeiboClientPost {
  createPost(content: string, imagePaths?: string[]): Promise<CreatePostResult>;
}

export class WeiboClientPost
  extends WeiboClientBase
  implements IWeiboClientPost
{
  constructor(options: WeiboClientOptions) {
    super(options);
  }

  async uploadImage(imagePath: string): Promise<UploadImageResult> {
    if (!this.clientUserId) {
      const userResult = await this.getCurrentUser();
      if (!userResult.success || !userResult.user) {
        return {
          success: false,
          error: `Failed to get current user: ${userResult.error}`,
        };
      }
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const fileSize = imageBuffer.length;
    const rawMd5 = crypto.createHash("md5").update(imageBuffer).digest("hex");
    const cs = computeCrc32(imageBuffer).toString();

    const uploadUrl = new URL(
      "https://picupload.weibo.com/interface/upload.php",
    );
    uploadUrl.searchParams.set("file_source", "1");
    uploadUrl.searchParams.set("cs", cs);
    uploadUrl.searchParams.set("ent", "miniblog");
    uploadUrl.searchParams.set("appid", "339644097");
    uploadUrl.searchParams.set("uid", String(this.clientUserId));
    uploadUrl.searchParams.set("raw_md5", rawMd5);
    uploadUrl.searchParams.set("ori", "1");
    uploadUrl.searchParams.set("mpos", "1");
    uploadUrl.searchParams.set("pri", "0");
    uploadUrl.searchParams.set("request_id", String(Date.now()));
    uploadUrl.searchParams.set("file_size", String(fileSize));

    try {
      const response = await fetch(uploadUrl.toString(), {
        method: "POST",
        headers: {
          Cookie: this.cookieHeader,
          Referer: "https://weibo.com/",
          Origin: "https://weibo.com",
          "User-Agent": this.userAgent,
          Accept: "*/*",
          "Content-Type": "application/octet-stream",
          "X-XSRF-TOKEN": this.XSRFTOKEN,
        },
        body: imageBuffer,
      });

      const data = (await response.json()) as {
        ret: boolean;
        errno?: number;
        pic?: { pid: string; rotated: boolean };
      };

      if (!data.ret || !data.pic) {
        return {
          success: false,
          error: `Upload failed with errno: ${data.errno}`,
        };
      }

      return {
        success: true,
        pid: data.pic.pid,
      };
    } catch (err) {
      return {
        success: false,
        error: `Upload request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async uploadVideo(videoPath: string): Promise<UploadVideoResult> {
    const videoBuffer = fs.readFileSync(videoPath);
    const fileSize = videoBuffer.length;
    const fileName = path.basename(videoPath);
    const fileMd5 = crypto.createHash("md5").update(videoBuffer).digest("hex");
    const timestamp = Math.floor(Date.now() / 1000); // unix seconds, matching Weibo JS

    const baseHeaders = {
      Cookie: this.cookieHeader,
      Referer: "https://weibo.com/",
      Origin: "https://weibo.com",
      "User-Agent": this.userAgent,
      Accept: "application/json, text/plain, */*",
      "X-XSRF-TOKEN": this.XSRFTOKEN,
    };

    // Step 1: Dispatch — get dynamic init_url, upload_url, check_url
    let initUrl: string;
    let uploadUrl: string;
    let checkUrl: string;
    try {
      const dispatchBody = new URLSearchParams({
        source: "339644097",
        types: "video",
        version: "4",
        auth_accept: "video",
        size: String(fileSize),
      });
      const dispatchResp = await fetch(
        "https://weibo.com/ajax/multimedia/dispatch",
        {
          method: "POST",
          headers: {
            ...baseHeaders,
            "Content-Type": "application/x-www-form-urlencoded",
            "X-XSRF-TOKEN": this.XSRFTOKEN,
          },
          body: dispatchBody.toString(),
        },
      );
      if (!dispatchResp.ok) {
        const text = await dispatchResp.text();
        return {
          success: false,
          error: `Dispatch failed (${dispatchResp.status}): ${text}`,
        };
      }
      const dispatchData = (await dispatchResp.json()) as {
        ok: number;
        data: {
          video: {
            init_url: string;
            init_direct_url: string;
            upload_url: string;
            check_url: string;
          };
        };
      };
      if (!dispatchData.ok) {
        return { success: false, error: "Dispatch returned ok=0" };
      }
      ({
        init_url: initUrl,
        upload_url: uploadUrl,
        check_url: checkUrl,
      } = dispatchData.data.video);
    } catch (err) {
      return {
        success: false,
        error: `Dispatch request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Step 2: Init — multipart/mixed body with biz_file JSON
    const boundary = `2067456weiboPro${timestamp}`;
    const bizFile = JSON.stringify({ mediaprops: '{"screenshot":1}' });
    const initBody =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="biz_file"\r\n\r\n` +
      bizFile +
      `\r\n--${boundary}--\r\n`;

    const initParams = new URLSearchParams({
      source: "339644097",
      size: String(fileSize),
      name: fileName,
      type: "video",
      client: "web",
      session_id: fileMd5,
    });

    let initData: {
      upload_id: string;
      media_id: string;
      strategy: { chunk_size: number };
      auth: string;
    };
    try {
      const initResp = await fetch(`${initUrl}?${initParams.toString()}`, {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Content-Type": `multipart/mixed; boundary=${boundary}`,
        },
        body: initBody,
      });
      if (!initResp.ok) {
        const text = await initResp.text();
        return {
          success: false,
          error: `Init failed (${initResp.status}): ${text}`,
        };
      }
      initData = (await initResp.json()) as typeof initData;
    } catch (err) {
      return {
        success: false,
        error: `Init request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const { upload_id, media_id, auth } = initData;
    // chunk_size from strategy is in KB
    const chunkBytes = initData.strategy.chunk_size * 1024;
    const chunkCount = Math.ceil(fileSize / chunkBytes);

    // Step 3: Upload chunks sequentially
    for (let i = 0; i < chunkCount; i++) {
      const start = i * chunkBytes;
      const chunk = videoBuffer.subarray(start, start + chunkBytes);
      const chunkMd5 = crypto.createHash("md5").update(chunk).digest("hex");
      const chunkParams = new URLSearchParams({
        source: "339644097",
        upload_id,
        media_id,
        upload_protocol: "binary",
        type: "video",
        client: "web",
        check: chunkMd5,
        index: String(i),
        size: String(chunk.length),
        start_loc: String(start),
        count: String(chunkCount),
      });
      try {
        const upResp = await fetch(`${uploadUrl}?${chunkParams.toString()}`, {
          method: "POST",
          headers: {
            ...baseHeaders,
            "Content-Type": "application/octet-stream",
            "X-Up-Auth": auth,
          },
          body: chunk,
        });
        if (!upResp.ok) {
          const text = await upResp.text();
          return {
            success: false,
            error: `Upload chunk ${i} failed (${upResp.status}): ${text}`,
          };
        }
        const upResult = (await upResp.json()) as { result: boolean };
        if (!upResult.result) {
          return {
            success: false,
            error: `Upload chunk ${i} returned result=false`,
          };
        }
      } catch (err) {
        return {
          success: false,
          error: `Upload chunk ${i} failed: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    // Step 4: Check / finalize
    const checkBody = new URLSearchParams({
      source: "339644097",
      upload_id,
      media_id,
      upload_protocol: "binary",
      count: String(chunkCount),
      action: "finish",
      size: String(fileSize),
      client: "web",
      status: "",
    });
    try {
      const checkResp = await fetch(checkUrl, {
        method: "POST",
        headers: {
          ...baseHeaders,
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Up-Auth": auth,
        },
        body: checkBody.toString(),
      });
      if (!checkResp.ok) {
        const text = await checkResp.text();
        return {
          success: false,
          error: `Check failed (${checkResp.status}): ${text}`,
        };
      }
      const checkData = (await checkResp.json()) as VideoCheckResponse;
      if (!checkData.result) {
        return { success: false, error: "Check returned result=false" };
      }
      return { success: true, mediaId: checkData.media_id ?? media_id };
    } catch (err) {
      return {
        success: false,
        error: `Check request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async createPost(
    content: string,
    picIds: string[] = [],
    videoMediaId?: string,
  ): Promise<CreatePostResult> {
    const body: Record<string, string> = {
      content,
      visible: "0",
      vote: "{}",
      share_id: "",
    };

    if (videoMediaId) {
      body.media = JSON.stringify({
        titles: [{ title: "", default: "true" }],
        type: "video",
        media_id: videoMediaId,
        resource: { video_down: 1, allow_clip: 1 },
        homemade: { channel_ids: [""], type: 0 },
        approval_reprint: "1",
      });
    } else if (picIds.length > 0) {
      body.pic_id = picIds.join(",");
    }

    const params = new URLSearchParams(body);

    const response = await this.api.post(
      "/statuses/update",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    const result = response.data as WeiboApiResult;
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }

  async setLike(id: string): Promise<SetLikeResult> {
    const params = new URLSearchParams({ id });
    const response = await this.api.post(
      "/statuses/setLike",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    const result = response.data as WeiboApiResult;
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }

  async createComment(
    id: string,
    comment: string,
    options?: {
      picId?: string;
      isRepost?: boolean;
      commentOriginal?: boolean;
    },
  ): Promise<CreateCommentResult> {
    const body: Record<string, string> = {
      id,
      comment,
      pic_id: options?.picId ?? "",
      is_repost: options?.isRepost ? "1" : "0",
      comment_ori: options?.commentOriginal ? "1" : "0",
      is_comment: "0",
    };

    const params = new URLSearchParams(body);

    const response = await this.api.post(
      "/comments/create",
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    const result = response.data as WeiboApiResult;
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }
}

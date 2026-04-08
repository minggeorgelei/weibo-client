import { WeiboClientBase } from "./weiboClientBase";
import {
  WeiboClientOptions,
  GetUserPostsResult,
  GetUserCommentsResult,
  WeiboCommentInfo,
} from "./weiboClientTypes";
import { WeiboApiResult } from "./axiosInstance";
import { parseWeiboPost, parseWeiboComment } from "./parsers";

export interface IWeiboClientUserWeibo {
  getUserPosts(
    userId: number,
    pageNumber?: number,
    feature?: number,
  ): Promise<GetUserPostsResult>;
  getUserComments(
    postId: string,
    options?: {
      flow?: number;
      maxComments?: number;
      maxChildComments?: number;
    },
  ): Promise<GetUserCommentsResult>;
}

export class WeiboClientUserWeibo
  extends WeiboClientBase
  implements IWeiboClientUserWeibo
{
  constructor(options: WeiboClientOptions) {
    super(options);
  }

  async getUserPosts(
    userId: number,
    pageNumber?: number,
    feature?: number,
  ): Promise<GetUserPostsResult> {
    const response = await this.api.get("/statuses/mymblog", {
      params: {
        uid: userId,
        page: pageNumber ?? 1,
        feature: feature ?? 0,
      },
    });
    const result = response.data as WeiboApiResult;
    if (!result.success) {
      return {
        success: false,
        error: `Failed to fetch posts for user ${userId}: ${result.error}`,
      };
    }
    const posts = parseWeiboPost(result.data.data);
    return { success: true, posts };
  }

  async getUserComments(
    postId: string,
    options?: {
      flow?: number;
      maxComments?: number;
      maxChildComments?: number;
    },
  ): Promise<GetUserCommentsResult> {
    const flow = options?.flow ?? 0;
    const count = 20;
    const maxComments = options?.maxComments;
    // undefined = fetch first page (20), 0 = skip, number = fetch up to that many
    const maxChildComments = options?.maxChildComments;

    // Fetch all parent comments with pagination
    const allComments: WeiboCommentInfo[] = [];
    let maxId = 0;

    while (true) {
      const response = await this.api.get("/statuses/buildComments", {
        params: {
          flow,
          is_reload: 1,
          id: postId,
          is_show_bulletin: 2,
          is_mix: 0,
          count,
          fetch_level: 0,
          locale: "en-US",
          max_id: maxId,
        },
      });
      const result = response.data as WeiboApiResult;
      if (!result.success) {
        return {
          success: false,
          error: `Failed to fetch comments for post ${postId}: ${result.error}`,
        };
      }

      const rawComments = result.data.data ?? [];
      if (rawComments.length === 0) break;

      for (const raw of rawComments) {
        allComments.push(parseWeiboComment(raw));
      }

      // Without --limit, only fetch a single page
      if (maxComments === undefined) break;

      if (allComments.length >= maxComments) break;

      maxId = result.data.max_id ?? 0;
      if (maxId === 0) break;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const trimmedComments =
      maxComments !== undefined
        ? allComments.slice(0, maxComments)
        : allComments;

    // Fetch child comments for each parent that has more than shown
    // maxChildComments: undefined = first page only, 0 = skip, number = up to N
    if (maxChildComments !== 0) {
      for (const comment of trimmedComments) {
        if (comment.totalReplyCount > (comment.comments?.length ?? 0)) {
          const childComments = await this.fetchChildComments(
            comment.id,
            flow,
            count,
            maxChildComments,
          );
          comment.comments = childComments;
        }
      }
    }

    return { success: true, comments: trimmedComments };
  }

  private async fetchChildComments(
    parentCommentId: number,
    flow: number,
    count: number,
    maxChildComments?: number,
  ): Promise<WeiboCommentInfo[]> {
    const allChildren: WeiboCommentInfo[] = [];
    let maxId = 0;

    while (true) {
      const response = await this.api.get("/statuses/buildComments", {
        params: {
          flow,
          is_reload: 1,
          id: parentCommentId,
          is_show_bulletin: 2,
          is_mix: 0,
          count,
          fetch_level: 1,
          locale: "en-US",
          max_id: maxId,
        },
      });
      const result = response.data as WeiboApiResult;
      if (!result.success) break;

      const rawComments = result.data.data ?? [];
      if (rawComments.length === 0) break;

      for (const raw of rawComments) {
        allChildren.push(parseWeiboComment(raw));
      }

      // Without maxChildComments, only fetch a single page
      if (maxChildComments === undefined) break;

      if (allChildren.length >= maxChildComments) break;

      maxId = result.data.max_id ?? 0;
      if (maxId === 0) break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return maxChildComments !== undefined
      ? allChildren.slice(0, maxChildComments)
      : allChildren;
  }
}

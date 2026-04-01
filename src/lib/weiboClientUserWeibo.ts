import { WeiboClientBase } from "./weiboClientBase";
import { WeiboClientOptions, GetUserPostsResult } from "./weiboClientTypes";
import { WeiboApiResult } from "./axiosInstance";
import { parseWeiboPost } from "./parsers";

export interface IWeiboClientUserWeibo {
  getUserPosts(
    userId: number,
    pageNumber?: number,
    feature?: number,
  ): Promise<GetUserPostsResult>;
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
}

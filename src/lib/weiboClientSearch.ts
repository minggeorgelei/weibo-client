import { WeiboClientBase } from "./weiboClientBase";
import { WeiboClientOptions, GetUserPostsResult } from "./weiboClientTypes";
import { WeiboApiResult } from "./axiosInstance";
import { parseWeiboPost } from "./parsers";

export interface IWeiboClientSearch {
  searchPosts(query: string, page?: number): Promise<GetUserPostsResult>;
}

export class WeiboClientSearch
  extends WeiboClientBase
  implements IWeiboClientSearch
{
  constructor(options: WeiboClientOptions) {
    super(options);
  }

  async searchPosts(
    query: string,
    page: number = 1,
  ): Promise<GetUserPostsResult> {
    const response = await this.api.get("/statuses/search", {
      params: {
        q: query,
        page,
        count: 20,
      },
    });
    const result = response.data as WeiboApiResult;
    if (!result.success) {
      return {
        success: false,
        error: `Failed to search posts for "${query}": ${result.error}`,
      };
    }
    const rawStatuses = result.data.statuses ?? [];
    const posts = parseWeiboPost({ list: rawStatuses });
    return { success: true, posts };
  }
}

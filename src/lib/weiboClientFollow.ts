import { WeiboClientBase } from "./weiboClientBase";
import { WeiboApiResult } from "./axiosInstance";
import {
  WeiboClientOptions,
  FollowUserResult,
  UnfollowUserResult,
} from "./weiboClientTypes";
import { parseWeiboUser } from "./parsers";

export interface IWeiboClientFollow {
  followUser(userId: number): Promise<FollowUserResult>;
  unfollowUser(userId: number): Promise<UnfollowUserResult>;
}

export class WeiboClientFollow
  extends WeiboClientBase
  implements IWeiboClientFollow
{
  constructor(options: WeiboClientOptions) {
    super(options);
  }

  async followUser(userId: number): Promise<FollowUserResult> {
    const formData = new FormData();
    formData.append("friend_uid", String(userId));
    const response = await this.api.post("/friendships/create", formData);
    const data = response.data as WeiboApiResult;
    if (!data.success) {
      return {
        success: false,
        error: `Failed to follow user ${userId}: ${data.error}`,
      };
    }
    const user = parseWeiboUser(data.data);
    return {
      success: true,
      user,
    };
  }

  async unfollowUser(userId: number): Promise<UnfollowUserResult> {
    const formData = new FormData();
    formData.append("uid", String(userId));
    const response = await this.api.post("/friendships/destory", formData);
    const data = response.data as WeiboApiResult;
    if (!data.success) {
      return {
        success: false,
        error: `Failed to unfollow user ${userId}: ${data.error}`,
      };
    }
    const user = parseWeiboUser(data.data);
    return {
      success: true,
      user,
    };
  }
}

import { WeiboClientBase } from "./weiboClientBase";
import {
  WeiboClientOptions,
  FollowingResult,
  FollowerResult,
  WeiboUser,
} from "./weiboClientTypes";
import { WeiboApiResult } from "./axiosInstance";
import { parseWeiboUser } from "./parsers";

export interface IWeiboClientUsers {
  getFollowers(userId: number, pageNumber?: number): Promise<FollowerResult>;
  getFollowing(userId: number, pageNumber?: number): Promise<FollowingResult>;
}

export class WeiboClientUsers
  extends WeiboClientBase
  implements IWeiboClientUsers
{
  constructor(options: WeiboClientOptions) {
    super(options);
  }

  async getFollowers(
    userId: number,
    pageNumber?: number,
  ): Promise<FollowerResult> {
    const response = await this.api.get("/friendships/friends", {
      params: {
        uid: userId,
        page: pageNumber ?? 1,
        related: "fans",
      },
    });
    const data = response.data as WeiboApiResult;
    if (!data.success) {
      return {
        success: false,
        error: `Failed to fetch followers list for user ${userId}: ${data.error}`,
      };
    }
    const rawFollowersData = data.data.users;
    const allUsers: WeiboUser[] = rawFollowersData.map(parseWeiboUser);
    return {
      success: true,
      users: allUsers,
      totalCount: data.data.totalCount,
      nextPage: data.data.nextCursor / 20 + 1,
    };
  }

  async getFollowing(
    userId: number,
    pageNumber?: number,
  ): Promise<FollowingResult> {
    const response = await this.api.get("/friendships/friends", {
      params: {
        uid: userId,
        page: pageNumber ?? 1,
      },
    });
    const data = response.data as WeiboApiResult;
    if (!data.success) {
      return {
        success: false,
        error: `Failed to fetch following list for user ${userId}: ${data.error}`,
      };
    }
    const rawFollowingData = data.data.users;
    const allUsers: WeiboUser[] = rawFollowingData.map(parseWeiboUser);
    return {
      success: true,
      users: allUsers,
      totalCount: data.data.total_number,
      nextPage: data.data.next_cursor / 20 + 1,
    };
  }
}

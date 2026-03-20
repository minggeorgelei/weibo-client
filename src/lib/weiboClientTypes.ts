import { WeiboClientCookies } from "./cookie";

export interface WeiboClientOptions {
  cookies: WeiboClientCookies;
  timeoutMs?: number;
  userAgent?: string;
}
export interface WeiboUser {
  id: number;
  screenName: string;
  profileImageUrl: string;
  commentCount: number;
  repostCount: number;
  likeCount: number;
  description: string;
  location: string;
  gender: string;
  followersCount: number;
  friendsCount: number;
}
export interface FollowingResult {
  success: boolean;
  users?: WeiboUser[];
  totalCount?: number;
  nextPage?: number;
  error?: string;
}

export type FollowerResult = FollowingResult;

export interface GetCurrentUserResult {
  success: boolean;
  user?: WeiboUser;
  error?: string;
}

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

export type FollowUserResult = GetCurrentUserResult;

export type UnfollowUserResult = GetCurrentUserResult;

export interface CreatePostResult {
  success: boolean;
  error?: string;
}

export interface UploadImageResult {
  success: boolean;
  pid?: string;
  error?: string;
}

export interface UploadVideoResult {
  success: boolean;
  mediaId?: string;
  error?: string;
}

export interface VideoInitResponse {
  upload_id: string;
  media_id: string;
  strategy: {
    upload_protocol: string;
    chunk_size: number;
    threads: number;
    chunk_retry: number;
    chunk_delay: number;
    chunk_timeout: number;
    url_tag: string;
  };
  auth: string;
  request_id: string;
}

export interface VideoCheckResponse {
  result: boolean;
  upload_id?: string;
  media_id?: string;
  auth?: string;
  request_id?: string;
}

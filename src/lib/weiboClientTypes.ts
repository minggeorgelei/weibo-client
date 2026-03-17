import { WeiboClientCookies } from "./cookie";

export interface WeiboClientOptions {
  cookies: WeiboClientCookies;
  timeoutMs?: number;
  userAgent?: string;
}

export interface WeiboUser {
  id: number;
  screen_name: string;
  profile_image_url: string;
  status_total_counter: {
    total_cnt_format: number;
    comment_cnt: string;
    repost_cnt: string;
    like_cnt: string;
    total_cnt: string;
  };
  description: string;
  location: string;
  gender: string;
  followers_count: number;
  friends_count: number;
  svip: number;
  vvip: number;
  user_type: number;
}

export interface FollowingResult {
  ok: number;
  users: WeiboUser[];
  total_number: number;
}

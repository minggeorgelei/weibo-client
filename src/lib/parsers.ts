import { WeiboUser } from "./weiboClientTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWeiboUser(rawUser: any): WeiboUser {
  return {
    id: rawUser.id,
    screenName: rawUser.screen_name,
    profileImageUrl: rawUser.profile_image_url,
    commentCount: parseInt(rawUser.status_total_counter.comment_cnt),
    repostCount: parseInt(rawUser.status_total_counter.repost_cnt),
    likeCount: parseInt(rawUser.status_total_counter.like_cnt),
    description: rawUser.description,
    location: rawUser.location,
    gender: rawUser.gender,
    followersCount: rawUser.followers_count,
    friendsCount: rawUser.friends_count,
  };
}

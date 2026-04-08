import { WeiboUser, WeiboPostInfo, WeiboCommentInfo } from "./weiboClientTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseWeiboUser(rawUser: any): WeiboUser {
  return {
    id: rawUser.id,
    screenName: rawUser.screen_name,
    profileImageUrl: rawUser.profile_image_url,
    commentCount: parseInt(rawUser.status_total_counter?.comment_cnt ?? "0"),
    repostCount: parseInt(rawUser.status_total_counter?.repost_cnt ?? "0"),
    likeCount: parseInt(rawUser.status_total_counter?.like_cnt ?? "0"),
    description: rawUser.description,
    location: rawUser.location,
    gender: rawUser.gender,
    followersCount: rawUser.followers_count,
    friendsCount: rawUser.friends_count,
  };
}

export function parseWeiboPost(rawPost: any): WeiboPostInfo[] {
  const weiboPostInfoList: WeiboPostInfo[] = [];
  const weiboPostList = rawPost.list;
  for (const post of weiboPostList) {
    let weiboPostInfo: WeiboPostInfo = {
      id: 0,
      repostCount: 0,
      commentCount: 0,
      attitudesCount: 0,
      content: "",
      region: "",
      createdAt: "",
      user: {
        id: 0,
        screenName: "",
        profileImageUrl: "",
        commentCount: 0,
        repostCount: 0,
        likeCount: 0,
        description: "",
        location: "",
        gender: "",
        followersCount: 0,
        friendsCount: 0,
      },
    };
    weiboPostInfo.id = post.id;
    weiboPostInfo.createdAt = post.created_at;
    weiboPostInfo.user = parseWeiboUser(post.user);
    weiboPostInfo.repostCount = post.reposts_count;
    weiboPostInfo.commentCount = post.comments_count;
    weiboPostInfo.attitudesCount = post.attitudes_count;
    weiboPostInfo.content = post.text_raw;
    weiboPostInfo.region = post.region_name;
    if (post.pic_ids && post.pic_ids.length > 0) {
      weiboPostInfo.images = [];
      for (const picId of post.pic_ids) {
        const picInfo = post.pic_infos[picId];
        const original = picInfo.original;
        weiboPostInfo.images.push({
          url: original.url,
          width: original.width,
          height: original.height,
          picId: picId,
        });
      }
    }
    if (post.page_info && post.page_info.object_type === "video") {
      const videoInfo = post.page_info.media_info;
      weiboPostInfo.video = {
        format: videoInfo.format,
        name: videoInfo.name,
        streamUrl: videoInfo.stream_url,
      };
    }
    weiboPostInfoList.push(weiboPostInfo);
  }
  return weiboPostInfoList;
}

export function parseWeiboComment(rawComment: any): WeiboCommentInfo {
  const comment: WeiboCommentInfo = {
    id: rawComment.id,
    rootId: rawComment.rootid,
    content: rawComment.text_raw,
    createdAt: rawComment.created_at,
    likeCount: rawComment.like_counts ?? 0,
    totalReplyCount: rawComment.total_number ?? 0,
    user: parseWeiboUser(rawComment.user),
  };
  if (rawComment.comments && rawComment.comments.length > 0) {
    comment.comments = rawComment.comments.map((c: any) =>
      parseWeiboComment(c),
    );
  }
  return comment;
}

export function parseCreateWeiboPost(rawCreateWeiboPost: any) {
  let weiboPostInfo: WeiboPostInfo = {
    id: 0,
    content: "",
    createdAt: "",
    user: {
      id: 0,
      screenName: "",
      profileImageUrl: "",
      commentCount: 0,
      repostCount: 0,
      likeCount: 0,
      description: "",
      location: "",
      gender: "",
      followersCount: 0,
      friendsCount: 0,
    },
  };
  weiboPostInfo.id = rawCreateWeiboPost.id;
  weiboPostInfo.createdAt = rawCreateWeiboPost.created_at;
  weiboPostInfo.user = parseWeiboUser(rawCreateWeiboPost.user);
  weiboPostInfo.content = rawCreateWeiboPost.text_raw;
  if (rawCreateWeiboPost.pic_ids && rawCreateWeiboPost.pic_ids.length > 0) {
    weiboPostInfo.images = [];
    for (const picId of rawCreateWeiboPost.pic_ids) {
      const picInfo = rawCreateWeiboPost.pic_infos[picId];
      const original = picInfo.original;
      weiboPostInfo.images.push({
        url: original.url,
        width: original.width,
        height: original.height,
        picId: picId,
      });
    }
  }
  return weiboPostInfo;
}

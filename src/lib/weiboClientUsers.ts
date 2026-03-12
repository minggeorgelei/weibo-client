import { WeiboClientBase } from './weiboClientBase';
import { WeiboClientOptions, FollowingResult } from './weiboClientTypes';

export interface IWeiboClientUsers {
    getFollowers(userId: number, count?: number): Promise<FollowingResult>;
    getFollowing(userId: number, count?: number): Promise<FollowingResult>;
}


export class WeiboClientUsers extends WeiboClientBase implements IWeiboClientUsers {
    constructor(options: WeiboClientOptions) {
        super(options);
    }

    getFollowers(userId: number, count?: number): Promise<FollowingResult> {
        throw new Error('Method not implemented.');
    }

    getFollowing(userId: number, count?: number): Promise<FollowingResult> {
        throw new Error('Method not implemented.');
    }
}
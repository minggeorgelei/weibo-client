import { WeiboClientCookies } from "./cookie";

export interface WeiboClientOptions {
    cookies: WeiboClientCookies;
    timeoutMs?: number;
    userAgent?: string;
}
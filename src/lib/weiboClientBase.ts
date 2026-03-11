import { WeiboClientOptions } from "./weiboClientTypes";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export abstract class WeiboClientBase {
    protected clientUserId?: string;
    protected timeoutMs?: number;
    // cookie values
    protected SUB: string;
    protected SUBP: string;
    protected WBPSESS: string;
    protected ALF: string;
    protected SCF: string;
    protected XSRFTOKEN: string;
    protected userAgent: string;
    protected cookieHeader: string;

    constructor(options: WeiboClientOptions) {
        if (!options.cookies.SUB || !options.cookies.SUBP || !options.cookies.WBPSESS || !options.cookies.ALF || !options.cookies.SCF || !options.cookies.XSRFTOKEN) {
            throw new Error("All cookies(SUB, SUBP, WBPSESS, ALF, SCF, XSRFTOKEN) are required");
        }
        this.SUB = options.cookies.SUB;
        this.SUBP = options.cookies.SUBP;
        this.WBPSESS = options.cookies.WBPSESS;
        this.ALF = options.cookies.ALF;
        this.SCF = options.cookies.SCF;
        this.XSRFTOKEN = options.cookies.XSRFTOKEN;
        this.timeoutMs = options.timeoutMs;
        this.userAgent = options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
        this.cookieHeader = `SUB=${this.SUB}; SUBP=${this.SUBP}; WBPSESS=${this.WBPSESS}; ALF=${this.ALF}; SCF=${this.SCF}; XSRF-TOKEN=${this.XSRFTOKEN}`;
    }

    protected async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    protected async fetchWithTimeout(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse> {
        return axios({
            ...config,
            url,
            timeout: this.timeoutMs,
        });
    }

    protected getBaseHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'User-Agent': this.userAgent,
            'Cookie': this.cookieHeader,
            'Host': 'weibo.com',
            'Origin': 'https://weibo.com',
            'Referer': 'https://weibo.com/',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Accept-Language': 'en-US,en;q=0.9',
            'X-XSRF-TOKEN': this.XSRFTOKEN,
        }
        return headers;
    }

    protected getJsonHeaders(): Record<string, string> {
        return {
            ...this.getBaseHeaders(),
            'Content-Type': 'application/json',
        }
    }

    protected getHeaders(): Record<string, string> {
        return this.getJsonHeaders();
    }
}
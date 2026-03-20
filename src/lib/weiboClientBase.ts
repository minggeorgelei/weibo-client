import { WeiboClientOptions, GetCurrentUserResult } from "./weiboClientTypes";
import { parseWeiboUser } from "./parsers";
import { AxiosInstance } from "axios";
import { createWeiboAxiosInstance, WeiboApiResult } from "./axiosInstance";

export abstract class WeiboClientBase {
  protected clientUserId?: number;
  protected timeoutMs?: number;
  protected api: AxiosInstance;
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
    if (
      !options.cookies.SUB ||
      !options.cookies.SUBP ||
      !options.cookies.WBPSESS ||
      !options.cookies.ALF ||
      !options.cookies.SCF ||
      !options.cookies.XSRFTOKEN
    ) {
      throw new Error(
        "All cookies(SUB, SUBP, WBPSESS, ALF, SCF, XSRFTOKEN) are required",
      );
    }
    this.SUB = options.cookies.SUB;
    this.SUBP = options.cookies.SUBP;
    this.WBPSESS = options.cookies.WBPSESS;
    this.ALF = options.cookies.ALF;
    this.SCF = options.cookies.SCF;
    this.XSRFTOKEN = options.cookies.XSRFTOKEN;
    this.timeoutMs = options.timeoutMs;
    this.userAgent =
      options.userAgent ||
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
    this.cookieHeader = `SUB=${this.SUB}; SUBP=${this.SUBP}; WBPSESS=${this.WBPSESS}; ALF=${this.ALF}; SCF=${this.SCF}; XSRF-TOKEN=${this.XSRFTOKEN}`;

    this.api = createWeiboAxiosInstance({
      timeoutMs: this.timeoutMs,
      getHeaders: () => this.getBaseHeaders(),
    });
  }

  protected getBaseHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": this.userAgent,
      Cookie: this.cookieHeader,
      Host: "weibo.com",
      Origin: "https://weibo.com",
      Referer: "https://weibo.com/",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
      "Accept-Language": "en-US,en;q=0.9",
      "X-XSRF-TOKEN": this.XSRFTOKEN,
    };
    return headers;
  }

  protected async getCurrentUser(): Promise<GetCurrentUserResult> {
    const response = await this.api.get("/feed/allGroups");
    const result = response.data as WeiboApiResult;
    if (!result.success) {
      return {
        success: false,
        error: `Failed to get current user: ${result.error}`,
      };
    }

    const groupData = result.data.groups;
    const group = groupData[0].group;
    const userID = group[0].uid;
    const profileResponse = await this.api.get("/profile/info", {
      params: { uid: userID },
    });
    const profileResult = profileResponse.data as WeiboApiResult;
    if (!profileResult.success) {
      return {
        success: false,
        error: `Failed to get current user info: ${profileResult.error}`,
      };
    }
    const rawUserData = profileResult.data.user;
    const currentUser = parseWeiboUser(rawUserData);
    this.clientUserId = currentUser.id;
    return { success: true, user: currentUser };
  }

  protected async getUserByScreenName(screenName: string) {
    const response = await this.api.get("/profile/info", {
      params: { screen_name: screenName },
    });
    const result = response.data as WeiboApiResult;
    if (!result.success) {
      return {
        success: false,
        error: `Failed to get user by screen name ${screenName}: ${result.error}`,
      };
    }
    const rawUserData = result.data.user;
    const user = parseWeiboUser(rawUserData);
    return { success: true, user };
  }
}

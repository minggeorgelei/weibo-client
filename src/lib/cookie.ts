export interface WeiboClientCookies {
    SUB: string | null;
    SUBP: string | null;
    WBPSESS: string | null;
    ALF: string | null;
    SCF: string | null;
    XSRFTOKEN: string | null;
    source: string | null;
}

export interface CookieResult {
    cookies: WeiboClientCookies;
    warnings: string[];
}

export type CookieSource = 'chrome' | 'edge' | 'firefox' | 'safari' | 'opera' | 'brave' | 'vivaldi';
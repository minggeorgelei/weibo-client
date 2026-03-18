import axios, {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

export interface WeiboApiError {
  success: false;
  error: string;
  httpStatus?: number;
  httpText?: string;
}

export interface WeiboApiSuccess<T = any> {
  success: true;
  data: T;
}

export type WeiboApiResult<T = any> = WeiboApiSuccess<T> | WeiboApiError;

export function createWeiboAxiosInstance(options: {
  timeoutMs?: number;
  getHeaders: () => Record<string, string>;
}): AxiosInstance {
  const instance = axios.create({
    baseURL: "https://weibo.com/ajax",
    timeout: options.timeoutMs,
  });

  // Request interceptor: inject headers before every request
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const headers = options.getHeaders();
      for (const [key, value] of Object.entries(headers)) {
        config.headers.set(key, value);
      }
      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor: handle errors and normalize responses
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const data = response.data;
      if (data && !data.ok) {
        response.data = {
          success: false,
          error: data.msg || "Unknown API error",
          httpStatus: response.status,
          httpText: response.statusText,
        } as WeiboApiError;
        return response;
      }
      response.data = {
        success: true,
        data: data,
      } as WeiboApiSuccess;
      return response;
    },
    (error: AxiosError) => {
      let result: WeiboApiError;

      if (error.response) {
        const status = error.response.status;
        let errorMsg: string;
        if (status === 401 || status === 403) {
          errorMsg = `Authentication failed: cookies may have expired`;
        } else if (status === 404) {
          errorMsg = `Resource not found: ${error.config?.url}`;
        } else if (status >= 500) {
          errorMsg = `Weibo server error: please retry later`;
        } else {
          errorMsg = `HTTP error: ${error.message}`;
        }
        result = {
          success: false,
          error: errorMsg,
          httpStatus: status,
          httpText: error.response.statusText,
        };
      } else if (error.code === "ECONNABORTED") {
        result = {
          success: false,
          error: "Request timeout",
        };
      } else {
        result = {
          success: false,
          error: `Network error: ${error.message}`,
        };
      }

      return {
        data: result,
        status: error.response?.status ?? 0,
        statusText: error.response?.statusText ?? "",
        headers: error.response?.headers ?? {},
        config: error.config,
      } as AxiosResponse<WeiboApiError>;
    },
  );

  return instance;
}

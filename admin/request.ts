/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type {
  RequestClientConfig,
  RequestClientOptions,
  ResponseInterceptorConfig,
} from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import { RequestClient } from '@vben/request';
import { useAccessStore } from '@vben/stores';

import axios from 'axios';
import { message } from 'antdv-next';

import { useAuthStore } from '#/store';
import { $t } from '#/locales';

import { refreshTokenApi } from './core';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

type StandardResponseError = {
  message?: string;
};

type StandardResponse<T = unknown> = {
  code?: number | string;
  data?: T;
  errors?: StandardResponseError[] | unknown[];
  message?: string;
};

type EnhancedRequestConfig<T = unknown> = RequestClientConfig<T> & {
  __isRetryRequest?: boolean;
  showErrorMessage?: boolean;
};

type PendingRetryRequest = {
  config: EnhancedRequestConfig;
  reject: (reason?: any) => void;
  resolve: (value: any) => void;
};

const SUCCESS_CODES = new Set([0, 200, '0', '200']);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });
  const pendingRetryRequests: PendingRetryRequest[] = [];

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    const response = await refreshTokenApi();
    const rawBody = response?.data ?? response;
    const newToken = extractTokenFromResponse(rawBody);

    if (typeof newToken !== 'string' || !newToken) {
      throw new Error('Refresh token response does not contain a valid access token.');
    }

    accessStore.setAccessToken(newToken);
    return newToken;
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  function extractTokenFromResponse(payload: unknown): string | undefined {
    if (typeof payload === 'string') {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return undefined;
    }

    return 'data' in payload && typeof payload.data === 'string'
      ? payload.data
      : undefined;
  }

  function getRequestConfig(error: any): EnhancedRequestConfig {
    return (error?.config ?? {}) as EnhancedRequestConfig;
  }

  function ensureHeaders(config: EnhancedRequestConfig) {
    config.headers ??= {};
    return config.headers;
  }

  function shouldUseStandardResponseEnvelope(data: unknown): data is StandardResponse {
    if (!data || typeof data !== 'object') {
      return false;
    }

    return (
      'code' in data ||
      'errors' in data ||
      ('message' in data && 'data' in data)
    );
  }

  function createBusinessError(messageText: string, extra: Record<string, unknown>) {
    return Object.assign(new Error(messageText), extra);
  }

  function flushPendingRetryRequests(token: string) {
    pendingRetryRequests.splice(0).forEach(({ config, resolve }) => {
      config.__isRetryRequest = true;
      ensureHeaders(config).Authorization = formatToken(token);
      resolve(client.request(config.url ?? '', { ...config }));
    });
  }

  function rejectPendingRetryRequests(error: any) {
    pendingRetryRequests.splice(0).forEach(({ reject }) => reject(error));
  }

  function shouldShowErrorMessage(error: any) {
    const config = getRequestConfig(error);
    return config.showErrorMessage !== false;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      const headers = ensureHeaders(config as EnhancedRequestConfig);
      headers.Authorization = formatToken(accessStore.accessToken);
      headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  /**
   * 自定义统一响应格式处理拦截器
   * 处理标准格式: { code: 0, message: '', data: {}, errors: [] }
   */
  function createUnifiedResponseInterceptor(): ResponseInterceptorConfig {
    return {
      fulfilled: (response) => {
        const { config, data: responseData, status } = response;

        // 如果配置要求返回原始响应，直接返回
        if (config.responseReturn === 'raw') {
          return response;
        }

        // HTTP 状态码检查
        if (status >= 200 && status < 400) {
          // 如果配置要求返回整个响应体
          if (config.responseReturn === 'body') {
            return responseData;
          }

          // 只在明确匹配标准包裹时才拆 data，避免误吞掉业务字段
          if (shouldUseStandardResponseEnvelope(responseData)) {
            const { code, data, errors, message: msg } = responseData;

            if (Array.isArray(errors) && errors.length > 0) {
              const errorMsg = errors.map((item) => {
                if (item && typeof item === 'object' && 'message' in item) {
                  return String((item as StandardResponseError).message ?? item);
                }
                return String(item);
              }).join('; ');

              throw createBusinessError(msg || errorMsg || 'Request failed', {
                code,
                errors,
                response,
              });
            }

            if (code !== undefined) {
              if (SUCCESS_CODES.has(code)) {
                return data !== undefined ? data : responseData;
              }

              throw createBusinessError(msg || 'Request failed', {
                code,
                response,
              });
            }
          }

          // 兜底：返回整个响应体（可能是空响应、纯文本等）
          return responseData;
        }

        // HTTP 状态码异常，抛出错误
        throw Object.assign(new Error(`HTTP Error: ${status}`), {
          response,
          status,
        });
      },
    };
  }

  /**
   * 自定义认证拦截器
   * 处理 401 错误和 token 刷新
   */
  function createAuthInterceptor(): ResponseInterceptorConfig {
    return {
      rejected: async (error) => {
        const config = getRequestConfig(error);
        const { response } = error;

        // 只处理 401 错误
        if (response?.status !== 401) {
          throw error;
        }

        // 如果没有启用 refreshToken 或已经是重试请求，直接重新认证
        if (
          !preferences.app.enableRefreshToken ||
          config.__isRetryRequest
        ) {
          await doReAuthenticate();
          throw error;
        }

        // 如果正在刷新 token，将请求加入队列
        if (client.isRefreshing) {
          return new Promise((resolve, reject) => {
            pendingRetryRequests.push({
              config,
              reject,
              resolve,
            });
          });
        }

        // 开始刷新 token
        client.isRefreshing = true;
        config.__isRetryRequest = true;

        try {
          const newToken = await doRefreshToken();

          // 使用新 token 重试队列中的所有请求
          flushPendingRetryRequests(newToken);

          // 重试当前请求
          ensureHeaders(config).Authorization = formatToken(newToken);
          return client.request(config.url ?? '', { ...config });
        } catch (refreshError) {
          // token 刷新失败，直接拒绝队列中的请求，避免带空 token 重放
          rejectPendingRetryRequests(refreshError);
          console.error('Token refresh failed, redirecting to login.');
          await doReAuthenticate();
          throw refreshError;
        } finally {
          client.isRefreshing = false;
        }
      },
    };
  }

  /**
   * 自定义错误消息处理拦截器
   * 处理网络错误、超时、HTTP 状态码错误等
   */
  function createErrorMessageInterceptor(): ResponseInterceptorConfig {
    return {
      rejected: (error: any) => {
        if (!shouldShowErrorMessage(error)) {
          return Promise.reject(error);
        }

        // 请求被取消，直接返回
        if (axios.isCancel(error) || error?.message?.includes?.('cancel')) {
          return Promise.reject(error);
        }

        // 网络错误
        const err: string = error?.toString?.() ?? '';
        let errMsg = '';
        if (err?.includes('Network Error')) {
          errMsg = $t('ui.fallback.http.networkError');
        } else if (error?.message?.includes?.('timeout')) {
          errMsg = $t('ui.fallback.http.requestTimeout');
        }
        if (errMsg) {
          message.error(errMsg);
          return Promise.reject(error);
        }

        // 处理响应数据中的错误信息
        const responseData = error?.response?.data ?? {};
        let errorMessage =
          responseData?.message ||
          responseData?.error ||
          error?.message ||
          '';

        // 根据 HTTP 状态码显示相应的错误信息
        const status = error?.response?.status;
        if (status && !errorMessage) {
          switch (status) {
            case 400:
              errorMessage = $t('ui.fallback.http.badRequest');
              break;
            case 401:
              errorMessage = $t('ui.fallback.http.unauthorized');
              break;
            case 403:
              errorMessage = $t('ui.fallback.http.forbidden');
              break;
            case 404:
              errorMessage = $t('ui.fallback.http.notFound');
              break;
            case 408:
              errorMessage = $t('ui.fallback.http.requestTimeout');
              break;
            default:
              errorMessage = $t('ui.fallback.http.internalServerError');
          }
        }

        // 显示错误提示
        if (errorMessage) {
          message.error(errorMessage);
        }

        return Promise.reject(error);
      },
    };
  }


  /**
   * 响应拦截器链路说明：
   * 1. 统一响应格式处理 - fulfilled 阶段处理标准格式 { code, message, data, errors }
   * 2. 认证处理 - rejected 阶段处理 401 错误和 token 刷新
   * 3. 错误消息处理 - rejected 阶段处理其他错误和用户提示
   *
   * 注意事项：
   * - errors 字段不为空时视为业务错误，会在 fulfilled 阶段抛出异常
   * - 支持带 code 的业务错误和不带标准格式的响应
   * - 自动处理 token 刷新和请求队列
   * - 统一的错误提示和容错处理
   */

  // 1. 统一响应格式处理拦截器（fulfilled）
  client.addResponseInterceptor(createUnifiedResponseInterceptor());

  // 2. 认证拦截器（rejected - 处理 401）
  client.addResponseInterceptor(createAuthInterceptor());

  // 3. 错误消息拦截器（rejected - 处理其他错误）
  client.addResponseInterceptor(createErrorMessageInterceptor());

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });

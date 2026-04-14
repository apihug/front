/**
 * @hope/api - Shared API Client Container
 *
 * 所有服务包（aip-service、order-service 等）共享的 HTTP 客户端容器
 * 应用层只需配置一次，所有服务包自动使用
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * HTTP 客户端接口（应用层需实现此接口）
 * 兼容 @vben/request 的 RequestClient
 */
export interface ApiClient {
  get<T = any>(url: string, config?: ApiRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T>
  patch?<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T>
  delete<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<T>
  request<T = any>(url: string, config?: ApiRequestConfig): Promise<T>
}

/**
 * 请求配置（简化版，兼容主流 HTTP 库）
 */
export interface ApiRequestConfig {
  params?: Record<string, any>
  headers?: Record<string, string>
  timeout?: number
  responseType?: 'json' | 'blob' | 'text' | 'arraybuffer'
  [key: string]: any
}

/**
 * 请求额外配置（权限、加载状态等）
 */
export interface RequestConfigExtra {
  /** 是否匿名请求（不带 token） */
  anonymous?: boolean
  /** 是否显示 loading */
  loading?: boolean
  /** 自定义开发环境配置 */
  customDev?: boolean
  /** 低限制风险模式（用于敏感操作如修改密码） */
  lowLimitRiskyMode?: string
}

// ============================================================================
// IoC Container - Singleton Pattern
// ============================================================================

let apiClient: ApiClient | null = null

/**
 * 配置 API 客户端（应用层调用，一次性注入）
 *
 * @example
 * // apps/user-center/src/bootstrap.ts
 * import { configureApiClient } from '@hope/api'
 * import { requestClient } from './api/request'
 *
 * configureApiClient(requestClient)
 *
 * // 之后所有服务包自动使用：
 * // - @hope/aip-service
 * // - @hope/order-service
 * // - 等等...
 */
export function configureApiClient(client: ApiClient): void {
  apiClient = client
}

export const setApiClient = configureApiClient

/**
 * 获取已注入的客户端（供服务包内部使用）
 * @throws 如果未配置则抛出错误
 */
export function getApiClient(): ApiClient {
  if (!apiClient) {
    throw new Error(
      '[api-core] API client not configured. ' +
      'Please call configureApiClient(requestClient) in your app bootstrap.'
    )
  }
  return apiClient
}

/**
 * 检查客户端是否已配置
 */
export function isApiClientConfigured(): boolean {
  return apiClient !== null
}

// ============================================================================
// HTTP Helper Methods - 供服务包使用
// ============================================================================

/**
 * GET 请求
 */
export function useGet<R = any, P extends Record<string, any> = Record<string, any>>(
  url: string,
  params?: P | null,
  config?: ApiRequestConfig & RequestConfigExtra,
): Promise<R> {
  return getApiClient().get<R>(url, { ...config, params: params ?? undefined })
}

/**
 * POST 请求
 */
export function usePost<R = any, D = any, P extends Record<string, any> = Record<string, any>>(
  url: string,
  data?: D,
  params?: P | null,
  config?: ApiRequestConfig & RequestConfigExtra,
): Promise<R> {
  return getApiClient().post<R>(url, data, { ...config, params: params ?? undefined })
}

/**
 * PUT 请求
 */
export function usePut<R = any, D = any, P extends Record<string, any> = Record<string, any>>(
  url: string,
  data?: D,
  params?: P | null,
  config?: ApiRequestConfig & RequestConfigExtra,
): Promise<R> {
  return getApiClient().put<R>(url, data, { ...config, params: params ?? undefined })
}

/**
 * PATCH 璇锋眰
 */
export function usePatch<R = any, D = any, P extends Record<string, any> = Record<string, any>>(
  url: string,
  data?: D,
  params?: P | null,
  config?: ApiRequestConfig & RequestConfigExtra,
): Promise<R> {
  const client = getApiClient()
  const nextConfig = { ...config, params: params ?? undefined }
  if (typeof client.patch === 'function') {
    return client.patch<R>(url, data, nextConfig)
  }
  return client.request<R>(url, {
    ...nextConfig,
    data,
    method: 'PATCH',
  })
}

/**
 * DELETE 请求
 */
export function useDelete<R = any, D = any, P extends Record<string, any> = Record<string, any>>(
  url: string,
  data?: D,
  params?: P | null,
  config?: ApiRequestConfig & RequestConfigExtra,
): Promise<R> {
  return getApiClient().delete<R>(url, data, { ...config, params: params ?? undefined })
}

/**
 * 文件上传（multipart/form-data）
 */
export function useUpload<R = any, D = Record<string, any>, P extends Record<string, any> = Record<string, any>>(
  url: string,
  data?: D,
  params?: P | null,
  config?: ApiRequestConfig & RequestConfigExtra,
): Promise<R> {
  const formData = jsonToFormData(data || {})
  return getApiClient().post<R>(url, formData, {
    ...config,
    params: params ?? undefined,
    headers: {
      ...config?.headers,
      'Content-Type': 'multipart/form-data',
    },
  })
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * JSON 转 FormData（用于文件上传）
 */
function jsonToFormData(data: Record<string, any>): FormData {
  const formData = new FormData()

  // 单文件上传
  if (data.filename && data.file instanceof File) {
    formData.append(data.filename, data.file)
    return formData
  }

  // 通用转换
  Object.entries(data).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return
    }
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item))
    } else if (value instanceof File) {
      formData.append(key, value)
    } else if (typeof value === 'object' && value.originFileObj) {
      // antd Upload 组件的文件对象
      formData.append(key, value.originFileObj)
    } else {
      formData.append(key, String(value))
    }
  })

  return formData
}

/**
 * 路径参数替换为实际值
 * @example pathToUrl('/api/{id}/detail/{type}', 123, 'user') => '/api/123/detail/user'
 */
export function pathToUrl(apiUrl: string, ...args: (number | string | undefined | null)[]) {
  args?.forEach((arg) => {
    if (arg !== undefined && arg !== null) {
      apiUrl = apiUrl.replace(/\{[^}]+\}/, arg.toString())
    }
  })
  return apiUrl
}

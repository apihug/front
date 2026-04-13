/**
 * @hope/realtime - Configuration
 * 
 * 运行时配置模块（IoC 容器）
 * 应用层注入配置，服务层自动使用
 */

import type { SSEOptions, WebSocketOptions } from './types'

// ============================================================================
// Logger
// ============================================================================

/**
 * 日志接口
 */
export interface Logger {
  debug: (message: string, ...args: any[]) => void
  info: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
}

/** 默认日志（静默） */
const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}

/** Console 日志（开发调试用） */
export const consoleLogger: Logger = {
  debug: (msg, ...args) => console.log(`[realtime] ${msg}`, ...args),
  info: (msg, ...args) => console.log(`[realtime] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[realtime] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[realtime] ${msg}`, ...args),
}

let logger: Logger = silentLogger

/** 获取当前 Logger */
export function getLogger(): Logger {
  return logger
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Headers 提供器（支持同步/异步）
 */
export type HeadersProvider = () => Record<string, string> | Promise<Record<string, string>>

/**
 * 实时通信配置
 */
export interface RealtimeConfig {
  /** 基础 URL，如 http://localhost:8080 */
  baseURL: string
  
  /** 
   * 动态获取请求头（用于注入 Authorization 等）
   * 每次请求时调用，确保 token 最新
   */
  getHeaders?: HeadersProvider
  
  /** SSE 全局默认配置 */
  sse?: Partial<SSEOptions>
  
  /** WebSocket 全局默认配置 */
  websocket?: Partial<WebSocketOptions>
  
  /** 日志器（默认静默，可传 consoleLogger 开启日志） */
  logger?: Logger
}

// ============================================================================
// IoC Container - Singleton Pattern
// ============================================================================

let realtimeConfig: RealtimeConfig | null = null

/**
 * 配置实时通信客户端（应用层调用，一次性注入）
 * 
 * @example
 * ```ts
 * // apps/user-center/src/bootstrap.ts
 * import { configureRealtimeClient } from '@hope/realtime'
 * import { useAccessStore } from '@vben/stores'
 * 
 * configureRealtimeClient({
 *   baseURL: apiURL,
 *   getHeaders: () => ({
 *     'Authorization': `Bearer ${useAccessStore().accessToken}`,
 *     'Accept-Language': preferences.app.locale,
 *   }),
 * })
 * ```
 */
export function configureRealtimeClient(config: RealtimeConfig): void {
  realtimeConfig = config
  // 设置 Logger（显式传入才覆盖，不传或 undefined 保持默认静默）
  logger = config.logger ?? silentLogger
}

/**
 * 获取已注入的配置（供客户端内部使用）
 * 
 * @throws 如果未配置且 url 为相对路径，则抛出错误
 */
export function getRealtimeConfig(): RealtimeConfig | null {
  return realtimeConfig
}

/**
 * 检查配置是否已注入
 */
export function isRealtimeConfigured(): boolean {
  return realtimeConfig !== null
}

/**
 * 重置配置（仅用于测试）
 * @internal
 */
export function resetRealtimeConfig(): void {
  realtimeConfig = null
  logger = silentLogger
}

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * 解析完整 URL
 * 
 * - 相对路径：拼接 baseURL
 * - 绝对路径：直接返回
 * 
 * @param url - 输入 URL（相对或绝对）
 * @param baseURL - 基础 URL
 */
export function resolveURL(url: string, baseURL?: string): string {
  // 已经是完整 URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // WebSocket URL
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return url
  }
  
  // 相对路径，需要 baseURL（允许空字符串）
  if (baseURL === undefined || baseURL === null) {
    throw new Error(
      '[realtime] Cannot resolve relative URL without baseURL. ' +
      'Please call configureRealtimeClient() first or use absolute URL.'
    )
  }
  
  // 拼接 URL
  const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  const path = url.startsWith('/') ? url : `/${url}`
  return `${base}${path}`
}

/**
 * 将 HTTP URL 转换为 WebSocket URL
 * 
 * - http:// → ws://
 * - https:// → wss://
 */
export function toWebSocketURL(url: string): string {
  if (url.startsWith('ws://') || url.startsWith('wss://')) {
    return url
  }
  
  if (url.startsWith('https://')) {
    return url.replace('https://', 'wss://')
  }
  
  if (url.startsWith('http://')) {
    return url.replace('http://', 'ws://')
  }
  
  // 如果没有协议，根据当前页面协议判断
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${url}`
  }
  
  return `ws://${url}`
}

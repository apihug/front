/**
 * @hope/realtime - Types
 * 
 * 框架层通用类型定义（业务无关）
 */

// Re-export config types
export type {
  RealtimeConfig,
  HeadersProvider,
} from './config'

// ========== SSE 相关类型 ==========

/**
 * SSE 配置选项
 */
export interface SSEOptions {
  /** HTTP 方法 */
  method?: 'GET' | 'POST'
  
  /** 自定义 headers */
  headers?: Record<string, string>
  
  /** 消息格式 */
  format?: 'sse' | 'ndjson'
  
  /** 请求超时（ms） */
  timeout?: number
  
  /** 重连配置 */
  reconnect?: ReconnectOptions
}

/**
 * SSE 流选项
 */
export interface SSEStreamOptions {
  /** 中止信号 */
  signal?: AbortSignal
  
  /** 错误回调 */
  onError?: (error: Error) => void
  
  /** 消息解析器（业务层提供） */
  parser?: (chunk: string) => any[]
  
  /** 流结束判断（返回 true 表示流结束） */
  isStreamEnd?: (message: any) => boolean
}

/**
 * 业务层 SSE 调用选项（组合 stream 参数 + client 配置）
 */
export interface SSECallOptions extends SSEStreamOptions {
  /** SSE 客户端配置（可覆盖全局配置） */
  clientOptions?: Partial<SSEOptions>
}

// ========== WebSocket 相关类型 ==========

/**
 * 重连配置（SSE/WebSocket 共用）
 */
export interface ReconnectOptions {
  enabled: boolean
  maxAttempts: number
  delay: number
  maxDelay: number
  backoff: 'linear' | 'exponential'
}

/**
 * 心跳配置
 */
export interface HeartbeatOptions {
  enabled: boolean
  interval: number
  timeout: number
  message?: any
}

/**
 * WebSocket 配置选项
 */
export interface WebSocketOptions {
  /** 子协议 */
  protocols?: string | string[]
  
  /** 心跳配置 */
  heartbeat?: HeartbeatOptions
  
  /** 重连配置 */
  reconnect?: ReconnectOptions
  
  /** 消息格式 */
  format?: 'text' | 'json'
}

/**
 * 业务层 WebSocket 连接选项
 */
export interface WebSocketCallOptions {
  /** WebSocket 客户端配置（可覆盖全局配置） */
  clientOptions?: Partial<WebSocketOptions>
}

/**
 * 实时通信通道接口（双泛型）
 * @typeParam TRequest - 发送消息类型
 * @typeParam TResponse - 接收消息类型（默认同 TRequest）
 */
export interface RealtimeChannel<TRequest = any, TResponse = TRequest> {
  /** 发送消息 */
  send(message: TRequest): void
  
  /** 事件监听 */
  on(event: 'message', handler: (msg: TResponse) => void): void
  on(event: 'error', handler: (error: Error) => void): void
  on(event: 'close', handler: (code: number, reason: string) => void): void
  
  /** 一次性监听 */
  once(event: string, handler: (...args: any[]) => void): void
  
  /** 关闭通道 */
  close(): void
  
  /** 检查连接状态 */
  isConnected(): boolean
}

/**
 * WebSocket 连接状态
 */
export type WebSocketState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'

/**
 * @hope/realtime - SSE Errors
 *
 * 为调用方保留请求阶段、响应状态和重连上下文，便于排查 SSE 建连和流处理问题。
 */

export type SSEClientErrorKind = 'config' | 'request' | 'response' | 'parse' | 'stream'

export interface SSEClientErrorContext {
  kind: SSEClientErrorKind
  cause?: unknown
  url?: string
  method?: 'GET' | 'POST'
  status?: number
  statusText?: string
  chunk?: string
  reconnectAttempt: number
  maxReconnectAttempts?: number
}

export class SSEClientError extends Error {
  readonly kind: SSEClientErrorKind
  readonly url?: string
  readonly method?: 'GET' | 'POST'
  readonly status?: number
  readonly statusText?: string
  readonly chunk?: string
  readonly reconnectAttempt: number
  readonly maxReconnectAttempts?: number
  declare readonly cause?: unknown

  constructor(message: string, context: SSEClientErrorContext) {
    super(message)
    this.name = 'SSEClientError'
    this.kind = context.kind
    this.url = context.url
    this.method = context.method
    this.status = context.status
    this.statusText = context.statusText
    this.chunk = context.chunk
    this.reconnectAttempt = context.reconnectAttempt
    this.maxReconnectAttempts = context.maxReconnectAttempts
    this.cause = context.cause
  }
}

export function createSSEClientError(
  message: string,
  context: SSEClientErrorContext
): SSEClientError {
  return new SSEClientError(message, context)
}

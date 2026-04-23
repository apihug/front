/**
 * @hope/realtime - WebSocket Errors
 *
 * 为调用方保留原始事件和连接上下文，便于诊断握手失败、网络异常、消息解析失败等问题。
 */

export type WebSocketChannelErrorKind = 'parse' | 'transport'

export interface WebSocketChannelErrorContext {
  kind: WebSocketChannelErrorKind
  cause?: unknown
  event?: Event
  data?: unknown
  readyState: number
  url?: string
  protocol?: string
  extensions?: string
}

export interface WebSocketErrorSource {
  readyState: number
  url?: string
  protocol?: string
  extensions?: string
}

export class WebSocketChannelError extends Error {
  readonly kind: WebSocketChannelErrorKind
  readonly event?: Event
  readonly data?: unknown
  readonly readyState: number
  readonly url?: string
  readonly protocol?: string
  readonly extensions?: string
  declare readonly cause?: unknown

  constructor(message: string, context: WebSocketChannelErrorContext) {
    super(message)
    this.name = 'WebSocketChannelError'
    this.kind = context.kind
    this.event = context.event
    this.data = context.data
    this.readyState = context.readyState
    this.url = context.url
    this.protocol = context.protocol
    this.extensions = context.extensions
    this.cause = context.cause
  }
}

export function createWebSocketChannelError(
  source: WebSocketErrorSource,
  message: string,
  context: Omit<WebSocketChannelErrorContext, 'extensions' | 'protocol' | 'readyState' | 'url'>
): WebSocketChannelError {
  return new WebSocketChannelError(message, {
    ...context,
    readyState: source.readyState,
    url: source.url || undefined,
    protocol: source.protocol || undefined,
    extensions: source.extensions || undefined,
  })
}

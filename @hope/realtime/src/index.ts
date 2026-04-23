/**
 * @hope/realtime
 * 
 * Protocol-agnostic realtime communication library
 * 完全业务无关的实时通信框架
 */

// Configuration (IoC)
export {
  configureRealtimeClient,
  getRealtimeConfig,
  isRealtimeConfigured,
  resolveURL,
  toWebSocketURL,
  getLogger,
  consoleLogger,
} from './config'

export type {
  RealtimeConfig,
  HeadersProvider,
  Logger,
} from './config'

// Types
export type {
  SSEOptions,
  SSEStreamOptions,
  SSECallOptions,
  WebSocketOptions,
  WebSocketCallOptions,
  ReconnectOptions,
  HeartbeatOptions,
  RealtimeChannel,
  WebSocketState,
} from './types'

// SSE
export { SSEClient } from './sse/client'
export { SSEClientError } from './sse/error'
export type {
  SSEClientErrorContext,
  SSEClientErrorKind,
} from './sse/error'

// WebSocket
export { WebSocketClient } from './websocket/client'
export { WebSocketChannel } from './websocket/channel'
export { WebSocketChannelError } from './websocket/error'
export type {
  WebSocketChannelErrorContext,
  WebSocketChannelErrorKind,
} from './websocket/error'
export { EventEmitter } from './websocket/event-emitter'

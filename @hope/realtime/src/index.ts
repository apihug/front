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

// WebSocket
export { WebSocketClient } from './websocket/client'
export { WebSocketChannel } from './websocket/channel'
export { EventEmitter } from './websocket/event-emitter'

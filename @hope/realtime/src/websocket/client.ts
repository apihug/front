/**
 * @hope/realtime - WebSocket Client
 * 
 * WebSocket 客户端（支持心跳、重连）
 * 完全业务无关，支持泛型消息类型
 */

import { WebSocketChannel } from './channel'
import { createWebSocketChannelError } from './error'
import type { WebSocketOptions, RealtimeChannel } from '../types'
import { getRealtimeConfig, resolveURL, toWebSocketURL, getLogger } from '../config'

/**
 * WebSocket 客户端（泛型设计，业务无关）
 */
export class WebSocketClient {
  private url: string
  private options: WebSocketOptions
  private ws: WebSocket | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private manualClose = false

  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url
    
    // 合并全局配置和实例配置
    const globalConfig = getRealtimeConfig()
    const globalWSOptions = globalConfig?.websocket || {}
    
    this.options = {
      heartbeat: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        message: { type: 'ping', timestamp: Date.now() },
      },
      reconnect: {
        enabled: true,
        maxAttempts: 5,
        delay: 1000,
        maxDelay: 30000,
        backoff: 'exponential',
      },
      format: 'json',
      ...globalWSOptions,
      ...options,
    }
  }

  /**
   * 建立连接（返回 Promise）
   * @typeParam TRequest - 发送消息类型
   * @typeParam TResponse - 接收消息类型（默认同 TRequest）
   */
  async connect<TRequest = any, TResponse = TRequest>(): Promise<RealtimeChannel<TRequest, TResponse>> {
    return new Promise((resolve, reject) => {
      try {
        this.manualClose = false
        
        // 解析完整 URL 并转换为 WebSocket 协议
        const config = getRealtimeConfig()
        const httpURL = resolveURL(this.url, config?.baseURL)
        const wsURL = toWebSocketURL(httpURL)
        
        this.ws = new WebSocket(wsURL, this.options.protocols)
        const ws = this.ws
        const channel = new WebSocketChannel<TRequest, TResponse>(ws, this.options)
        const channelOnError = ws.onerror
        const channelOnClose = ws.onclose
        let connected = false
        let settled = false

        const resolveOnce = (value: RealtimeChannel<TRequest, TResponse> | PromiseLike<RealtimeChannel<TRequest, TResponse>>) => {
          if (settled) return
          settled = true
          resolve(value)
        }

        const rejectOnce = (reason?: unknown) => {
          if (settled) return
          settled = true
          reject(reason)
        }

        ws.onopen = () => {
          getLogger().info('WebSocket connected')
          connected = true
          this.clearReconnectTimer()
          this.reconnectAttempts = 0
          this.startHeartbeat()
          resolveOnce(channel)
        }

        ws.onerror = (event) => {
          channelOnError?.call(ws, event)

          if (!connected) {
            rejectOnce(createWebSocketChannelError(ws, 'WebSocket transport error', {
              kind: 'transport',
              cause: event,
              event,
            }))
          }
        }

        ws.onclose = (event) => {
          channelOnClose?.call(ws, event)
          getLogger().info('WebSocket closed:', event.code, event.reason)
          this.stopHeartbeat()
          
          // 非正常关闭且非手动关闭，尝试重连
          if (event.code !== 1000 && !this.manualClose && this.shouldReconnect()) {
            this.scheduleReconnect()
              .then(() => {
                if (!connected) {
                  resolveOnce(this.connect<TRequest, TResponse>())
                }
              })
              .catch(rejectOnce)
            return
          }

          if (!connected) {
            rejectOnce(createWebSocketChannelError(ws, 'WebSocket closed before connection was established', {
              kind: 'transport',
              cause: event,
              event,
            }))
          }
        }
        
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.manualClose = true
    this.stopHeartbeat()
    this.clearReconnectTimer()
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Client closed')
    }
  }

  // ========== 心跳机制 ==========

  private startHeartbeat(): void {
    if (!this.options.heartbeat?.enabled) return
    
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const message = this.options.heartbeat!.message!
        this.ws.send(JSON.stringify(message))
        getLogger().debug('Sent heartbeat ping')
      }
    }, this.options.heartbeat.interval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // ========== 重连机制 ==========

  private shouldReconnect(): boolean {
    if (!this.options.reconnect?.enabled) return false
    return this.reconnectAttempts < this.options.reconnect.maxAttempts
  }

  private async scheduleReconnect(): Promise<void> {
    const delay = this.getReconnectDelay()
    getLogger().info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)
    
    this.clearReconnectTimer()

    await new Promise<void>((resolve) => {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null
        resolve()
      }, delay)
    })
    this.reconnectAttempts++
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private getReconnectDelay(): number {
    const { delay, maxDelay, backoff } = this.options.reconnect!
    let calculatedDelay = delay
    
    if (backoff === 'exponential') {
      calculatedDelay = delay * Math.pow(2, this.reconnectAttempts)
    } else {
      calculatedDelay = delay * (this.reconnectAttempts + 1)
    }
    
    return Math.min(calculatedDelay, maxDelay)
  }
}

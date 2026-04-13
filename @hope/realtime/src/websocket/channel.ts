/**
 * @hope/realtime - WebSocket Channel
 * 
 * WebSocket 通道实现（RealtimeChannel 接口）
 */

import { EventEmitter } from './event-emitter'
import type { RealtimeChannel, WebSocketOptions } from '../types'
import { getLogger } from '../config'

/**
 * WebSocket 通道（双泛型设计）
 * @typeParam TRequest - 发送消息类型
 * @typeParam TResponse - 接收消息类型（默认同 TRequest）
 */
export class WebSocketChannel<TRequest = any, TResponse = TRequest> extends EventEmitter implements RealtimeChannel<TRequest, TResponse> {
  private ws: WebSocket
  private options: WebSocketOptions

  constructor(ws: WebSocket, options: WebSocketOptions) {
    super()
    this.ws = ws
    this.options = options

    // 绑定事件
    this.ws.onmessage = this.handleMessage.bind(this)
    this.ws.onerror = this.handleError.bind(this)
    this.ws.onclose = this.handleClose.bind(this)
  }

  /**
   * 发送消息
   */
  send(message: TRequest): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected')
    }
    
    const data = this.options.format === 'json'
      ? JSON.stringify(message)
      : message
    
    this.ws.send(data as string)
  }

  /**
   * 关闭通道
   */
  close(): void {
    this.ws.close(1000, 'Channel closed')
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.ws.readyState === WebSocket.OPEN
  }

  // ========== 内部事件处理 ==========

  private handleMessage(event: MessageEvent): void {
    try {
      const message = this.options.format === 'json'
        ? JSON.parse(event.data)
        : event.data
      
      // 过滤心跳响应
      if (this.isHeartbeatMessage(message)) {
        getLogger().debug('Received heartbeat pong')
        return
      }
      
      this.emit('message', message as TResponse)
    } catch (error) {
      getLogger().error('Failed to parse message:', error)
      this.emit('error', error as Error)
    }
  }

  private handleError(event: Event): void {
    this.emit('error', new Error('WebSocket error'))
  }

  private handleClose(event: CloseEvent): void {
    this.emit('close', event.code, event.reason)
  }

  private isHeartbeatMessage(data: any): boolean {
    return data?.type === 'pong' || data === 'pong'
  }
}

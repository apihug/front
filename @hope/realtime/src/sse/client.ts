/**
 * @hope/realtime - SSE Client
 * 
 * 基于 fetch + ReadableStream 的 SSE 客户端
 * 完全业务无关，支持泛型消息类型
 */

import type { SSEOptions, SSEStreamOptions } from '../types'
import { getRealtimeConfig, resolveURL, getLogger } from '../config'

/**
 * SSE 客户端（泛型设计，业务无关）
 */
export class SSEClient {
  private url: string
  private options: SSEOptions
  private abortController: AbortController | null = null
  private reconnectAttempts = 0

  constructor(url: string, options: SSEOptions = {}) {
    this.url = url
    
    // 合并全局配置和实例配置
    const globalConfig = getRealtimeConfig()
    const globalSSEOptions = globalConfig?.sse || {}
    
    this.options = {
      method: 'POST',
      format: 'ndjson',
      reconnect: {
        enabled: true,
        maxAttempts: 3,
        delay: 1000,
        maxDelay: 30000,
        backoff: 'exponential',
      },
      timeout: 30000,
      ...globalSSEOptions,
      ...options,
    }
  }

  /**
   * 创建流式连接（返回 AsyncIterable）
   * 
   * @param request - 请求数据
   * @param options - 流选项（可选注入 parser）
   */
  async *stream(
    request: any,
    options?: SSEStreamOptions
  ): AsyncIterable<any> {
    this.abortController = new AbortController()
    
    try {
      // 解析完整 URL
      const config = getRealtimeConfig()
      const fullURL = resolveURL(this.url, config?.baseURL)
      
      // 动态获取 headers
      const dynamicHeaders = config?.getHeaders 
        ? await config.getHeaders() 
        : {}
      
      const response = await fetch(fullURL, {
        method: this.options.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...dynamicHeaders,
          ...this.options.headers,
        },
        body: JSON.stringify(request),
        signal: options?.signal || this.abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        
        // 使用业务层提供的解析器
        if (options?.parser) {
          const messages = options.parser(chunk)
          for (const message of messages) {
            yield message
          }
        } else {
          // 默认：直接输出原始文本块
          yield chunk
        }
      }
      
      this.reconnectAttempts = 0
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        getLogger().debug('Stream aborted')
      } else {
        getLogger().error('Stream error:', error)
        options?.onError?.(error)
        
        // 重连逻辑
        if (this.shouldReconnect()) {
          await this.scheduleReconnect()
          // 递归重试
          yield* this.stream(request, options)
        } else {
          // 不重连时，重新抛出错误让调用者处理
          throw error
        }
      }
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  // ========== 内部方法 ==========

  private shouldReconnect(): boolean {
    if (!this.options.reconnect?.enabled) return false
    return this.reconnectAttempts < this.options.reconnect.maxAttempts
  }

  private async scheduleReconnect(): Promise<void> {
    const delay = this.getReconnectDelay()
    getLogger().info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    this.reconnectAttempts++
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

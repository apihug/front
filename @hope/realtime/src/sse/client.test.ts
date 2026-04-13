/**
 * @hope/realtime - SSE Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SSEClient } from './client'
import { configureRealtimeClient, resetRealtimeConfig } from '../config'

// 模拟 TextDecoder
const OriginalTextDecoder = globalThis.TextDecoder

beforeEach(() => {
  vi.stubGlobal(
    'TextDecoder',
    class {
      private decoder = new OriginalTextDecoder()
      decode(value: Uint8Array, opts?: any) {
        return this.decoder.decode(value, opts)
      }
    }
  )
})

// 创建 fetch mock
const createFetchMock = (chunks: string[], ok = true, delay = 0) => {
  const encoder = new TextEncoder()
  let index = 0
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    body: {
      getReader: () => ({
        read: async () => {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
          if (index < chunks.length) {
            return { done: false, value: encoder.encode(chunks[index++]) }
          }
          return { done: true, value: undefined }
        },
      }),
    },
  })
}

describe('SSEClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useFakeTimers()
    resetRealtimeConfig()
    // 默认配置 baseURL，使相对路径测试正常工作
    configureRealtimeClient({ baseURL: '' })
  })

  afterEach(() => {
    vi.useRealTimers()
    resetRealtimeConfig()
  })

  describe('Basic Streaming', () => {
    it('should stream raw text chunks without parser', async () => {
      const client = new SSEClient('/api/stream')
      const fetchMock = createFetchMock(['hello', ' ', 'world'])
      vi.stubGlobal('fetch', fetchMock)

      const chunks: string[] = []
      for await (const chunk of client.stream({ query: 'test' })) {
        chunks.push(chunk)
      }

      expect(chunks).toEqual(['hello', ' ', 'world'])
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/stream',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          }),
          body: JSON.stringify({ query: 'test' }),
        })
      )
    })

    it('should use custom parser to parse messages', async () => {
      const client = new SSEClient('/api/stream')
      const fetchMock = createFetchMock([
        '{"id":1}\n',
        '{"id":2}\n',
        '{"id":3}\n',
      ])
      vi.stubGlobal('fetch', fetchMock)

      const parser = (chunk: string) => {
        const lines = chunk.split('\n').filter(Boolean)
        return lines.map(line => JSON.parse(line))
      }

      const messages: any[] = []
      for await (const message of client.stream({}, { parser })) {
        messages.push(message)
      }

      expect(messages).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    })

    it('should support GET method', async () => {
      const client = new SSEClient('/api/stream', { method: 'GET' })
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      const chunks: string[] = []
      for await (const chunk of client.stream({} )) {
        chunks.push(chunk)
      }

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/stream',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should apply custom headers', async () => {
      const client = new SSEClient('/api/stream', {
        headers: {
          'X-Custom': 'header-value',
          'Authorization': 'Bearer token',
        },
      })
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of client.stream({})) {
        break
      }

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/stream',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'header-value',
            'Authorization': 'Bearer token',
          }),
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should throw error when response not ok', async () => {
      const client = new SSEClient('/api/stream', {
        reconnect: { enabled: false, maxAttempts: 0, delay: 0, maxDelay: 0, backoff: 'linear' },
      })
      const fetchMock = createFetchMock([], false)
      vi.stubGlobal('fetch', fetchMock)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        for await (const _ of client.stream({})) {
          // Should not reach here
        }
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        // Expected error
      }

      consoleErrorSpy.mockRestore()
    })

    it('should throw error when no reader', async () => {
      const client = new SSEClient('/api/stream', {
        reconnect: { enabled: false, maxAttempts: 0, delay: 0, maxDelay: 0, backoff: 'linear' },
      })
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      }))

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        for await (const _ of client.stream({})) {
          // Should not reach here
        }
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        // Expected error
      }

      consoleErrorSpy.mockRestore()
    })

    it('should call onError callback on error', async () => {
      const client = new SSEClient('/api/stream', {
        reconnect: { enabled: false, maxAttempts: 0, delay: 0, maxDelay: 0, backoff: 'linear' },
      })
      const fetchMock = createFetchMock([], false)
      vi.stubGlobal('fetch', fetchMock)

      const onError = vi.fn()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        for await (const _ of client.stream({}, { onError })) {
          // Should not reach here
        }
      } catch (error) {
        // Expected
      }

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Abort Signal', () => {
    it('should handle abort gracefully', async () => {
      const client = new SSEClient('/api/stream', {
        reconnect: { enabled: false, maxAttempts: 0, delay: 0, maxDelay: 0, backoff: 'linear' },
      })
      const abortController = new AbortController()
      abortController.abort()

      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      try {
        for await (const _ of client.stream({}, { signal: abortController.signal })) {
          // Should not reach here
        }
      } catch (error) {
        // Expected
      }

      await vi.advanceTimersByTimeAsync(0)
      
      consoleLogSpy.mockRestore()
    })
  })

  describe('Reconnection', () => {
    it('should reconnect on error with exponential backoff', async () => {
      const client = new SSEClient('/api/stream', {
        reconnect: {
          enabled: true,
          maxAttempts: 2,
          delay: 1000,
          maxDelay: 10000,
          backoff: 'exponential',
        },
      })

      let attemptCount = 0
      const fetchMock = vi.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('Network error')
        }
        return createFetchMock(['success'])()
      })
      vi.stubGlobal('fetch', fetchMock)

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const streamPromise = (async () => {
        const chunks: string[] = []
        for await (const chunk of client.stream({})) {
          chunks.push(chunk)
        }
        return chunks
      })()

      // 推进时间触发重连
      await vi.advanceTimersByTimeAsync(1100)

      const chunks = await streamPromise
      expect(chunks).toContain('success')
      expect(attemptCount).toBe(2)

      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('should respect maxAttempts', async () => {
      const client = new SSEClient('/api/stream', {
        reconnect: {
          enabled: true,
          maxAttempts: 2,
          delay: 100,
          maxDelay: 1000,
          backoff: 'linear',
        },
      })

      const fetchMock = vi.fn().mockRejectedValue(new Error('Persistent error'))
      vi.stubGlobal('fetch', fetchMock)

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const streamPromise = (async () => {
        try {
          for await (const _ of client.stream({})) {
            // Should not reach here
          }
        } catch (error) {
          return error
        }
      })()

      // 推进时间触发所有重连
      await vi.advanceTimersByTimeAsync(500)

      await streamPromise
      expect(fetchMock).toHaveBeenCalledTimes(3) // 初始 + 2次重连

      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    it('should not reconnect when disabled', async () => {
      const client = new SSEClient('/api/stream', {
        reconnect: { enabled: false, maxAttempts: 0, delay: 0, maxDelay: 0, backoff: 'linear' },
      })

      const fetchMock = vi.fn().mockRejectedValue(new Error('Error'))
      vi.stubGlobal('fetch', fetchMock)

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      try {
        for await (const _ of client.stream({})) {
          // Should not reach here
        }
      } catch (error) {
        // Expected
      }

      await vi.advanceTimersByTimeAsync(2000)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Close', () => {
    it('should close connection', () => {
      const client = new SSEClient('/api/stream')
      const abortMock = vi.fn()
      ;(client as any).abortController = { abort: abortMock }

      client.close()

      expect(abortMock).toHaveBeenCalled()
      expect((client as any).abortController).toBeNull()
    })

    it('should handle close when no active connection', () => {
      const client = new SSEClient('/api/stream')
      expect(() => client.close()).not.toThrow()
    })
  })

  describe('Configuration Integration', () => {
    it('should resolve relative URL with global baseURL', async () => {
      configureRealtimeClient({
        baseURL: 'http://api.example.com',
      })

      const client = new SSEClient('/api/stream')
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of client.stream({})) {
        break
      }

      expect(fetchMock).toHaveBeenCalledWith(
        'http://api.example.com/api/stream',
        expect.anything()
      )
    })

    it('should use absolute URL directly', async () => {
      configureRealtimeClient({
        baseURL: 'http://api.example.com',
      })

      const client = new SSEClient('https://other.example.com/api/stream')
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of client.stream({})) {
        break
      }

      expect(fetchMock).toHaveBeenCalledWith(
        'https://other.example.com/api/stream',
        expect.anything()
      )
    })

    it('should inject dynamic headers from global config', async () => {
      configureRealtimeClient({
        baseURL: 'http://api.example.com',
        getHeaders: () => ({
          'Authorization': 'Bearer global-token',
          'X-Request-ID': 'req-123',
        }),
      })

      const client = new SSEClient('/api/stream')
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of client.stream({})) {
        break
      }

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer global-token',
            'X-Request-ID': 'req-123',
          }),
        })
      )
    })

    it('should support async getHeaders', async () => {
      configureRealtimeClient({
        baseURL: 'http://api.example.com',
        getHeaders: async () => ({
          'Authorization': 'Bearer async-token',
        }),
      })

      const client = new SSEClient('/api/stream')
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of client.stream({})) {
        break
      }

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer async-token',
          }),
        })
      )
    })

    it('should merge global SSE options with instance options', async () => {
      configureRealtimeClient({
        baseURL: 'http://api.example.com',
        sse: {
          method: 'GET',
          headers: {
            'X-Global-Header': 'global-value',
          },
        },
      })

      const client = new SSEClient('/api/stream', {
        headers: {
          'X-Instance-Header': 'instance-value',
        },
      })
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of client.stream({})) {
        break
      }

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Instance-Header': 'instance-value',
          }),
        })
      )
    })

    it('should instance options override global options', async () => {
      configureRealtimeClient({
        baseURL: 'http://api.example.com',
        sse: {
          method: 'GET',
          timeout: 30000,
        },
      })

      const client = new SSEClient('/api/stream', {
        method: 'POST',
      })
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of client.stream({})) {
        break
      }

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should work without global config (absolute URL)', async () => {
      // No configureRealtimeClient call
      const client = new SSEClient('http://direct.example.com/api/stream')
      const fetchMock = createFetchMock(['data'])
      vi.stubGlobal('fetch', fetchMock)

      for await (const _ of client.stream({})) {
        break
      }

      expect(fetchMock).toHaveBeenCalledWith(
        'http://direct.example.com/api/stream',
        expect.anything()
      )
    })

    it('should throw error for relative URL without global config', async () => {
      // 重置配置，模拟未配置状态
      resetRealtimeConfig()
      
      // 禁用重连以避免超时
      const client = new SSEClient('/api/stream', {
        reconnect: { enabled: false, maxAttempts: 0, delay: 0, maxDelay: 0, backoff: 'linear' },
      })
      vi.stubGlobal('fetch', vi.fn())

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(async () => {
        for await (const _ of client.stream({})) {
          // Should not reach here
        }
      }).rejects.toThrow('[realtime] Cannot resolve relative URL without baseURL')

      consoleErrorSpy.mockRestore()
    })
  })
})

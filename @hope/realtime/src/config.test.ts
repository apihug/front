/**
 * @hope/realtime - Configuration Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureRealtimeClient,
  getRealtimeConfig,
  isRealtimeConfigured,
  resetRealtimeConfig,
  resolveURL,
  toWebSocketURL,
} from './config'

describe('RealtimeConfig IoC', () => {
  beforeEach(() => {
    resetRealtimeConfig()
  })

  afterEach(() => {
    resetRealtimeConfig()
  })

  describe('configureRealtimeClient', () => {
    it('should store configuration', () => {
      configureRealtimeClient({
        baseURL: 'http://localhost:8080',
      })

      const config = getRealtimeConfig()
      expect(config?.baseURL).toBe('http://localhost:8080')
    })

    it('should store getHeaders function', () => {
      const getHeaders = () => ({ Authorization: 'Bearer token123' })
      
      configureRealtimeClient({
        baseURL: 'http://localhost:8080',
        getHeaders,
      })

      const config = getRealtimeConfig()
      expect(config?.getHeaders).toBe(getHeaders)
    })

    it('should store SSE and WebSocket options', () => {
      configureRealtimeClient({
        baseURL: 'http://localhost:8080',
        sse: {
          method: 'POST',
          timeout: 60000,
        },
        websocket: {
          format: 'json',
          heartbeat: {
            enabled: true,
            interval: 15000,
            timeout: 3000,
          },
        },
      })

      const config = getRealtimeConfig()
      expect(config?.sse?.method).toBe('POST')
      expect(config?.sse?.timeout).toBe(60000)
      expect(config?.websocket?.format).toBe('json')
      expect(config?.websocket?.heartbeat?.interval).toBe(15000)
    })
  })

  describe('getRealtimeConfig', () => {
    it('should return null when not configured', () => {
      const config = getRealtimeConfig()
      expect(config).toBeNull()
    })

    it('should return config when configured', () => {
      configureRealtimeClient({
        baseURL: 'http://api.example.com',
      })

      const config = getRealtimeConfig()
      expect(config).not.toBeNull()
      expect(config?.baseURL).toBe('http://api.example.com')
    })
  })

  describe('isRealtimeConfigured', () => {
    it('should return false when not configured', () => {
      expect(isRealtimeConfigured()).toBe(false)
    })

    it('should return true when configured', () => {
      configureRealtimeClient({
        baseURL: 'http://localhost:8080',
      })

      expect(isRealtimeConfigured()).toBe(true)
    })
  })
})

describe('URL Utilities', () => {
  describe('resolveURL', () => {
    it('should return absolute HTTP URL as-is', () => {
      const url = resolveURL('http://api.example.com/v1/stream')
      expect(url).toBe('http://api.example.com/v1/stream')
    })

    it('should return absolute HTTPS URL as-is', () => {
      const url = resolveURL('https://api.example.com/v1/stream')
      expect(url).toBe('https://api.example.com/v1/stream')
    })

    it('should return WebSocket URL as-is', () => {
      expect(resolveURL('ws://localhost:8080/ws')).toBe('ws://localhost:8080/ws')
      expect(resolveURL('wss://localhost:8080/ws')).toBe('wss://localhost:8080/ws')
    })

    it('should resolve relative path with baseURL', () => {
      const url = resolveURL('/api/stream', 'http://localhost:8080')
      expect(url).toBe('http://localhost:8080/api/stream')
    })

    it('should handle baseURL with trailing slash', () => {
      const url = resolveURL('/api/stream', 'http://localhost:8080/')
      expect(url).toBe('http://localhost:8080/api/stream')
    })

    it('should handle path without leading slash', () => {
      const url = resolveURL('api/stream', 'http://localhost:8080')
      expect(url).toBe('http://localhost:8080/api/stream')
    })

    it('should throw error for relative path without baseURL', () => {
      expect(() => resolveURL('/api/stream')).toThrow(
        '[realtime] Cannot resolve relative URL without baseURL'
      )
      expect(() => resolveURL('/api/stream', undefined)).toThrow(
        '[realtime] Cannot resolve relative URL without baseURL'
      )
    })

    it('should handle empty string baseURL', () => {
      const url = resolveURL('/api/stream', '')
      expect(url).toBe('/api/stream')
    })
  })

  describe('toWebSocketURL', () => {
    it('should return ws:// URL as-is', () => {
      expect(toWebSocketURL('ws://localhost:8080/ws')).toBe('ws://localhost:8080/ws')
    })

    it('should return wss:// URL as-is', () => {
      expect(toWebSocketURL('wss://localhost:8080/ws')).toBe('wss://localhost:8080/ws')
    })

    it('should convert http:// to ws://', () => {
      expect(toWebSocketURL('http://localhost:8080/ws')).toBe('ws://localhost:8080/ws')
    })

    it('should convert https:// to wss://', () => {
      expect(toWebSocketURL('https://api.example.com/ws')).toBe('wss://api.example.com/ws')
    })

    it('should handle URL without protocol in browser', () => {
      // Mock window
      vi.stubGlobal('window', { location: { protocol: 'https:' } })
      
      expect(toWebSocketURL('localhost:8080/ws')).toBe('wss://localhost:8080/ws')
      
      vi.unstubAllGlobals()
    })

    it('should default to ws:// without protocol in non-browser', () => {
      // Ensure window is undefined
      vi.stubGlobal('window', undefined)
      
      expect(toWebSocketURL('localhost:8080/ws')).toBe('ws://localhost:8080/ws')
      
      vi.unstubAllGlobals()
    })
  })
})

describe('Integration: Dynamic Headers', () => {
  beforeEach(() => {
    resetRealtimeConfig()
  })

  afterEach(() => {
    resetRealtimeConfig()
  })

  it('should support async getHeaders', async () => {
    const asyncGetHeaders = vi.fn().mockResolvedValue({
      Authorization: 'Bearer async-token',
      'X-Request-ID': '12345',
    })

    configureRealtimeClient({
      baseURL: 'http://localhost:8080',
      getHeaders: asyncGetHeaders,
    })

    const config = getRealtimeConfig()
    const headers = await config?.getHeaders?.()

    expect(headers).toEqual({
      Authorization: 'Bearer async-token',
      'X-Request-ID': '12345',
    })
    expect(asyncGetHeaders).toHaveBeenCalledTimes(1)
  })

  it('should support sync getHeaders', async () => {
    const syncGetHeaders = vi.fn().mockReturnValue({
      Authorization: 'Bearer sync-token',
    })

    configureRealtimeClient({
      baseURL: 'http://localhost:8080',
      getHeaders: syncGetHeaders,
    })

    const config = getRealtimeConfig()
    const headers = await config?.getHeaders?.()

    expect(headers).toEqual({
      Authorization: 'Bearer sync-token',
    })
  })
})

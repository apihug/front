/**
 * @hope/realtime - WebSocket Client Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketClient } from './client'
import { WebSocketChannelError } from './error'
import { configureRealtimeClient, resetRealtimeConfig } from '../config'

class MockWebSocket {
  static OPEN = 1
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.OPEN
  url: string
  protocol = 'json'
  extensions = 'permessage-deflate'
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  send = vi.fn()
  close = vi.fn()

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  static reset() {
    MockWebSocket.instances = []
  }
}

describe('WebSocketClient', () => {
  beforeEach(() => {
    MockWebSocket.reset()
    resetRealtimeConfig()
    configureRealtimeClient({ baseURL: '' })
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    resetRealtimeConfig()
  })

  it('should reject initial connection with structured transport error', async () => {
    const client = new WebSocketClient('/ws')
    const connectPromise = client.connect()
    const ws = MockWebSocket.instances[0]!
    const event = new Event('error')

    ws.onerror?.(event)

    await expect(connectPromise).rejects.toMatchObject({
      name: 'WebSocketChannelError',
      kind: 'transport',
      message: 'WebSocket transport error',
      event,
      cause: event,
      url: 'ws:///ws',
    } satisfies Partial<WebSocketChannelError>)
  })

  it('should preserve channel error events after connection succeeds', async () => {
    const client = new WebSocketClient('/ws')
    const connectPromise = client.connect()
    const ws = MockWebSocket.instances[0]!
    ws.onopen?.()

    const channel = await connectPromise
    const onError = vi.fn()
    const event = new Event('error')

    channel.on('error', onError)
    ws.onerror?.(event)

    expect(onError).toHaveBeenCalledTimes(1)
    const [error] = onError.mock.calls[0]!
    expect(error).toBeInstanceOf(WebSocketChannelError)
    expect(error).toMatchObject({
      kind: 'transport',
      event,
      cause: event,
      url: 'ws:///ws',
    })
  })
})

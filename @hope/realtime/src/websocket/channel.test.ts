/**
 * @hope/realtime - WebSocket Channel Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketChannel } from './channel'
import { WebSocketChannelError } from './error'

type MockWebSocket = {
  readyState: number
  url: string
  protocol: string
  extensions: string
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onclose: ((event: CloseEvent) => void) | null
  send: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

function createMockWebSocket(): MockWebSocket {
  return {
    readyState: 1,
    url: 'ws://example.com/realtime',
    protocol: 'json',
    extensions: 'permessage-deflate',
    onmessage: null,
    onerror: null,
    onclose: null,
    send: vi.fn(),
    close: vi.fn(),
  }
}

describe('WebSocketChannel', () => {
  beforeEach(() => {
    vi.stubGlobal('WebSocket', {
      OPEN: 1,
      CLOSED: 3,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should emit structured transport errors with cause and socket context', () => {
    const ws = createMockWebSocket()
    const channel = new WebSocketChannel(ws as unknown as WebSocket, { format: 'json' })
    const onError = vi.fn()
    const transportEvent = new Event('error')

    channel.on('error', onError)
    ws.onerror?.(transportEvent)

    expect(onError).toHaveBeenCalledTimes(1)

    const [error] = onError.mock.calls[0]!
    expect(error).toBeInstanceOf(WebSocketChannelError)
    expect(error).toMatchObject({
      name: 'WebSocketChannelError',
      kind: 'transport',
      message: 'WebSocket transport error',
      event: transportEvent,
      cause: transportEvent,
      readyState: 1,
      url: 'ws://example.com/realtime',
      protocol: 'json',
      extensions: 'permessage-deflate',
    })
  })

  it('should emit structured parse errors with raw payload and original cause', () => {
    const ws = createMockWebSocket()
    const channel = new WebSocketChannel(ws as unknown as WebSocket, { format: 'json' })
    const onError = vi.fn()

    channel.on('error', onError)
    ws.onmessage?.({ data: '{invalid json' } as MessageEvent)

    expect(onError).toHaveBeenCalledTimes(1)

    const [error] = onError.mock.calls[0]!
    expect(error).toBeInstanceOf(WebSocketChannelError)
    expect(error.kind).toBe('parse')
    expect(error.message).toBe('Failed to parse WebSocket message')
    expect(error.data).toBe('{invalid json')
    expect(error.cause).toBeInstanceOf(Error)
    expect(error.readyState).toBe(1)
  })
})

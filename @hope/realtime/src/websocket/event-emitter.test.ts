/**
 * @hope/realtime - EventEmitter Tests
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from './event-emitter'
import { configureRealtimeClient, resetRealtimeConfig, consoleLogger } from '../config'

// 启用日志以便测试错误输出
beforeEach(() => {
  resetRealtimeConfig()
  configureRealtimeClient({ baseURL: '', logger: consoleLogger })
})

afterEach(() => {
  resetRealtimeConfig()
})

describe('EventEmitter', () => {
  describe('on', () => {
    it('should register event handler', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()

      emitter.on('test', handler)
      emitter.emit('test', 'arg1', 'arg2')

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('should support multiple handlers for same event', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.emit('test', 'data')

      expect(handler1).toHaveBeenCalledWith('data')
      expect(handler2).toHaveBeenCalledWith('data')
    })

    it('should support multiple events', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('event1', handler1)
      emitter.on('event2', handler2)

      emitter.emit('event1', 'data1')
      expect(handler1).toHaveBeenCalledWith('data1')
      expect(handler2).not.toHaveBeenCalled()

      emitter.emit('event2', 'data2')
      expect(handler2).toHaveBeenCalledWith('data2')
    })
  })

  describe('once', () => {
    it('should trigger handler only once', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()

      emitter.once('test', handler)

      emitter.emit('test', 'arg1')
      emitter.emit('test', 'arg2')

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith('arg1')
    })

    it('should remove handler after execution', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()

      emitter.once('test', handler)
      emitter.emit('test')

      const hasHandlers = (emitter as any).events.get('test')?.size > 0
      expect(hasHandlers).toBe(false)
    })
  })

  describe('off', () => {
    it('should remove specific handler', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.off('test', handler1)
      emitter.emit('test')

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should remove all handlers for event when no handler specified', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('test', handler1)
      emitter.on('test', handler2)
      emitter.off('test')
      emitter.emit('test')

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('should handle removing non-existent handler', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()

      expect(() => emitter.off('test', handler)).not.toThrow()
    })
  })

  describe('emit', () => {
    it('should pass multiple arguments to handler', () => {
      const emitter = new EventEmitter()
      const handler = vi.fn()

      emitter.on('test', handler)
      emitter.emit('test', 1, 'two', { three: 3 })

      expect(handler).toHaveBeenCalledWith(1, 'two', { three: 3 })
    })

    it('should handle errors in handlers gracefully', () => {
      const emitter = new EventEmitter()
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const normalHandler = vi.fn()
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      emitter.on('test', errorHandler)
      emitter.on('test', normalHandler)
      emitter.emit('test')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in handler for event'),
        expect.any(Error)
      )
      expect(normalHandler).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should do nothing when no handlers registered', () => {
      const emitter = new EventEmitter()
      expect(() => emitter.emit('nonexistent')).not.toThrow()
    })
  })

  describe('removeAllListeners', () => {
    it('should remove all event handlers', () => {
      const emitter = new EventEmitter()
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      emitter.on('event1', handler1)
      emitter.on('event2', handler2)
      emitter.removeAllListeners()
      emitter.emit('event1')
      emitter.emit('event2')

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })
})

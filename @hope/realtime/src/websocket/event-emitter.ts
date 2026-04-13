/**
 * @hope/realtime - Event Emitter
 * 
 * 简单的事件发射器（用于 WebSocket 通道）
 */

import { getLogger } from '../config'

export class EventEmitter {
  private events: Map<string, Set<Function>> = new Map()

  on(event: string, handler: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(handler)
  }

  once(event: string, handler: Function): void {
    const wrapper = (...args: any[]) => {
      handler(...args)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }

  off(event: string, handler?: Function): void {
    if (!handler) {
      this.events.delete(event)
      return
    }
    
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args)
        } catch (error) {
          getLogger().error(`Error in handler for event "${event}":`, error)
        }
      })
    }
  }

  removeAllListeners(): void {
    this.events.clear()
  }
}

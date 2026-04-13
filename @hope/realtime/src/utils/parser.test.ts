/**
 * @hope/realtime - Parser Utilities Tests
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createNDJSONParser, createSSEParser } from './parser'
import { configureRealtimeClient, resetRealtimeConfig, consoleLogger } from '../config'

// 启用日志以便测试错误输出
beforeEach(() => {
  resetRealtimeConfig()
  configureRealtimeClient({ baseURL: '', logger: consoleLogger })
})

afterEach(() => {
  resetRealtimeConfig()
})

describe('createNDJSONParser', () => {
  it('should parse single line JSON', () => {
    const parser = createNDJSONParser<{ id: number; text: string }>()
    
    const chunk = '{"id":1,"text":"hello"}\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(1)
    expect(messages[0]).toEqual({ id: 1, text: 'hello' })
  })

  it('should parse multiple lines JSON', () => {
    const parser = createNDJSONParser<{ id: number }>()
    
    const chunk = '{"id":1}\n{"id":2}\n{"id":3}\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(3)
    expect(messages[0]).toEqual({ id: 1 })
    expect(messages[1]).toEqual({ id: 2 })
    expect(messages[2]).toEqual({ id: 3 })
  })

  it('should handle incomplete lines with buffer', () => {
    const parser = createNDJSONParser<{ id: number }>()
    
    // 第一个 chunk：不完整的行
    const chunk1 = '{"id":1}\n{"id":'
    const messages1 = parser(chunk1)
    
    expect(messages1).toHaveLength(1)
    expect(messages1[0]).toEqual({ id: 1 })
    
    // 第二个 chunk：完成前面的行
    const chunk2 = '2}\n{"id":3}\n'
    const messages2 = parser(chunk2)
    
    expect(messages2).toHaveLength(2)
    expect(messages2[0]).toEqual({ id: 2 })
    expect(messages2[1]).toEqual({ id: 3 })
  })

  it('should skip empty lines', () => {
    const parser = createNDJSONParser<{ id: number }>()
    
    const chunk = '{"id":1}\n\n{"id":2}\n\n\n{"id":3}\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(3)
  })

  it('should handle parse errors gracefully', () => {
    const parser = createNDJSONParser<any>()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const chunk = '{"id":1}\ninvalid-json\n{"id":2}\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(2)
    expect(messages[0]).toEqual({ id: 1 })
    expect(messages[1]).toEqual({ id: 2 })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[realtime] NDJSON parse error:',
      'invalid-json',
      expect.any(Error)
    )
    
    consoleErrorSpy.mockRestore()
  })

  it('should maintain state across multiple calls', () => {
    const parser = createNDJSONParser<{ id: number }>()
    
    // 模拟流式接收
    const messages1 = parser('{"id"')
    const messages2 = parser(':1}\n{"i')
    const messages3 = parser('d":2}\n')
    
    expect(messages1).toHaveLength(0)
    expect(messages2).toHaveLength(1)
    expect(messages2[0]).toEqual({ id: 1 })
    expect(messages3).toHaveLength(1)
    expect(messages3[0]).toEqual({ id: 2 })
  })
})

describe('createSSEParser', () => {
  it('should parse SSE format with data prefix', () => {
    const parser = createSSEParser<{ id: number; text: string }>()
    
    const chunk = 'data:{"id":1,"text":"hello"}\n\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(1)
    expect(messages[0]).toEqual({ id: 1, text: 'hello' })
  })

  it('should parse multiple SSE messages', () => {
    const parser = createSSEParser<{ id: number }>()
    
    const chunk = 'data:{"id":1}\n\ndata:{"id":2}\n\ndata:{"id":3}\n\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(3)
    expect(messages[0]).toEqual({ id: 1 })
    expect(messages[1]).toEqual({ id: 2 })
    expect(messages[2]).toEqual({ id: 3 })
  })

  it('should handle multi-line data field', () => {
    const parser = createSSEParser<{ id: number; text: string }>()
    
    const chunk = 'data:{"id":1,\ndata:"text":"hello"}\n\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(1)
    expect(messages[0]).toEqual({ id: 1, text: 'hello' })
  })

  it('should handle incomplete SSE blocks with buffer', () => {
    const parser = createSSEParser<{ id: number }>()
    
    // 第一个 chunk：不完整的 SSE 块
    const chunk1 = 'data:{"id":1}\n\ndata:{"id":'
    const messages1 = parser(chunk1)
    
    expect(messages1).toHaveLength(1)
    expect(messages1[0]).toEqual({ id: 1 })
    
    // 第二个 chunk：完成前面的块
    const chunk2 = '2}\n\n'
    const messages2 = parser(chunk2)
    
    expect(messages2).toHaveLength(1)
    expect(messages2[0]).toEqual({ id: 2 })
  })

  it('should skip blocks without data field', () => {
    const parser = createSSEParser<{ id: number }>()
    
    const chunk = 'event:message\nid:123\n\ndata:{"id":1}\n\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(1)
    expect(messages[0]).toEqual({ id: 1 })
  })

  it('should handle parse errors gracefully', () => {
    const parser = createSSEParser<any>()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const chunk = 'data:{"id":1}\n\ndata:invalid-json\n\ndata:{"id":2}\n\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(2)
    expect(messages[0]).toEqual({ id: 1 })
    expect(messages[1]).toEqual({ id: 2 })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[realtime] SSE parse error:',
      'invalid-json',
      expect.any(Error)
    )
    
    consoleErrorSpy.mockRestore()
  })

  it('should maintain state across multiple calls', () => {
    const parser = createSSEParser<{ id: number }>()
    
    // 模拟流式接收
    const messages1 = parser('data:{"id')
    const messages2 = parser('":1}\n\ndata:{"i')
    const messages3 = parser('d":2}\n\n')
    
    expect(messages1).toHaveLength(0)
    expect(messages2).toHaveLength(1)
    expect(messages2[0]).toEqual({ id: 1 })
    expect(messages3).toHaveLength(1)
    expect(messages3[0]).toEqual({ id: 2 })
  })

  it('should handle data field with colon and spaces', () => {
    const parser = createSSEParser<{ message: string }>()
    
    const chunk = 'data: {"message":"hello: world"}\n\n'
    const messages = parser(chunk)
    
    expect(messages).toHaveLength(1)
    expect(messages[0]).toEqual({ message: 'hello: world' })
  })
})

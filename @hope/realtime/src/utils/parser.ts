/**
 * @hope/realtime - Parser Utilities
 * 
 * 通用消息解析器工具（业务层可选使用）
 */

import { getLogger } from '../config'

/**
 * 创建 NDJSON 解析器
 * 
 * @example
 * const parser = createNDJSONParser<MyMessage>()
 * const messages = parser(chunk)
 */
export function createNDJSONParser<T>(): (chunk: string) => T[] {
  let buffer = ''
  
  return (chunk: string) => {
    buffer += chunk
    const messages: T[] = []
    
    let lineEnd: number
    while ((lineEnd = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, lineEnd).trim()
      buffer = buffer.slice(lineEnd + 1)
      
      if (!line) continue
      
      try {
        messages.push(JSON.parse(line))
      } catch (error) {
        getLogger().error('NDJSON parse error:', line, error)
      }
    }
    
    return messages
  }
}

/**
 * 创建 SSE 格式解析器
 * 
 * @example
 * const parser = createSSEParser<MyMessage>()
 * const messages = parser(chunk)
 */
export function createSSEParser<T>(): (chunk: string) => T[] {
  let buffer = ''
  
  return (chunk: string) => {
    buffer += chunk
    const messages: T[] = []
    
    let blockEnd: number
    while ((blockEnd = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, blockEnd)
      buffer = buffer.slice(blockEnd + 2)
      
      let data = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('data:')) {
          data += line.slice(5).trim()
        }
      }
      
      if (data) {
        try {
          messages.push(JSON.parse(data))
        } catch (error) {
          getLogger().error('SSE parse error:', data, error)
        }
      }
    }
    
    return messages
  }
}

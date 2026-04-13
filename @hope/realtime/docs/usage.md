# @hope/realtime 使用手册

## 1. 快速开始

### 1.1 安装依赖

```bash
pnpm add @hope/realtime
```

### 1.2 应用层配置（IoC 注入）

在应用启动时配置全局参数：

```typescript
// apps/user-center/src/bootstrap.ts
import { configureRealtimeClient } from '@hope/realtime'
import { useAccessStore } from '@vben/stores'
import { preferences } from '@vben/preferences'
import { useAppConfig } from '@vben/hooks'

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD)

configureRealtimeClient({
  baseURL: apiURL,
  getHeaders: () => ({
    Authorization: `Bearer ${useAccessStore().accessToken}`,
    'Accept-Language': preferences.app.locale,
  }),
})
```

**配置项说明：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `baseURL` | `string` | 是 | API 基础地址 |
| `getHeaders` | `() => Record<string, string>` | 否 | 动态获取请求头（每次请求调用） |
| `sse` | `Partial<SSEOptions>` | 否 | SSE 全局默认配置 |
| `websocket` | `Partial<WebSocketOptions>` | 否 | WebSocket 全局默认配置 |
| `logger` | `Logger` | 否 | 日志器（默认静默） |

---

## 2. SSE 客户端

### 2.1 基本用法

```typescript
import { SSEClient } from '@hope/realtime'
import { createNDJSONParser } from '@hope/realtime/utils'

interface ChatMessage {
  content: string
  done: boolean
}

const client = new SSEClient('/api/chat/stream')
const parser = createNDJSONParser<ChatMessage>()

try {
  for await (const message of client.stream(request, { parser })) {
    console.log('收到消息:', message)
    if (message.done) break
  }
} finally {
  client.close()
}
```

### 2.2 SSEOptions 配置

```typescript
interface SSEOptions {
  method?: 'GET' | 'POST'        // HTTP 方法，默认 POST
  headers?: Record<string, string>  // 自定义请求头
  format?: 'sse' | 'ndjson'      // 消息格式，默认 ndjson
  timeout?: number               // 超时时间（ms），默认 30000
  reconnect?: ReconnectOptions   // 重连配置
}
```

### 2.3 SSEStreamOptions 配置

```typescript
interface SSEStreamOptions {
  signal?: AbortSignal           // 中止信号
  onError?: (error: Error) => void  // 错误回调
  parser?: (chunk: string) => any[]  // 消息解析器
  isStreamEnd?: (message: any) => boolean  // 流结束判断
}
```

### 2.4 重连配置

```typescript
const client = new SSEClient('/api/stream', {
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delay: 1000,
    maxDelay: 30000,
    backoff: 'exponential',  // 或 'linear'
  },
})
```

---

## 3. WebSocket 客户端

### 3.1 基本用法

```typescript
import { WebSocketClient } from '@hope/realtime'

const client = new WebSocketClient('ws://localhost:8080/chat')
const channel = await client.connect<Request, Response>()

// 监听消息
channel.on('message', (msg) => {
  console.log('收到:', msg)
})

// 监听错误
channel.on('error', (err) => {
  console.error('错误:', err)
})

// 监听关闭
channel.on('close', (code, reason) => {
  console.log('连接关闭:', code, reason)
})

// 发送消息
channel.send({ type: 'ping', data: 'hello' })

// 检查连接状态
if (channel.isConnected()) {
  console.log('连接正常')
}

// 关闭连接
channel.close()
```

### 3.2 WebSocketOptions 配置

```typescript
interface WebSocketOptions {
  protocols?: string | string[]    // 子协议
  heartbeat?: HeartbeatOptions     // 心跳配置
  reconnect?: ReconnectOptions     // 重连配置
  format?: 'text' | 'json'         // 消息格式，默认 json
}
```

### 3.3 心跳配置

```typescript
const client = new WebSocketClient('ws://localhost:8080', {
  heartbeat: {
    enabled: true,
    interval: 30000,   // 心跳间隔（ms）
    timeout: 5000,     // 超时时间（ms）
    message: { type: 'ping' },  // 心跳消息
  },
})
```

---

## 4. 解析器

### 4.1 内置 NDJSON 解析器

```typescript
import { createNDJSONParser } from '@hope/realtime/utils'

const parser = createNDJSONParser<MyMessage>()
```

### 4.2 自定义解析器

```typescript
// SSE 格式解析器
function createSSEParser<T>(): (chunk: string) => T[] {
  return (chunk: string) => {
    const lines = chunk.split('\n')
    const messages: T[] = []
    
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const jsonStr = line.slice(5).trim()
        if (jsonStr) {
          messages.push(JSON.parse(jsonStr))
        }
      }
    }
    
    return messages
  }
}
```

---

## 5. 业务层封装示例

### 5.1 API Service 封装

```typescript
// packages/aip-service/src/api/llm-runtime.ts
import { SSEClient } from '@hope/realtime'
import { createNDJSONParser } from '@hope/realtime/utils'
import type { SSECallOptions } from '@hope/realtime'

export const LlmRuntimeService = {
  async *chat(request: ChatRequest, options?: SSECallOptions) {
    const client = new SSEClient('/api/llm-runtime/chat', {
      method: 'POST',
      format: 'ndjson',
      ...options?.clientOptions,
    })

    const parser = options?.parser ?? createNDJSONParser<ChatResponse>()

    try {
      for await (const message of client.stream(request, {
        signal: options?.signal,
        onError: options?.onError,
        parser,
      })) {
        yield message

        if (options?.isStreamEnd?.(message)) {
          break
        }
      }
    } finally {
      client.close()
    }
  },
}
```

### 5.2 应用层调用

```typescript
// apps/user-center/src/store/chat.ts
import { LlmRuntimeService } from '@hope/aip-service'

async function sendMessage(content: string) {
  for await (const response of LlmRuntimeService.chat({
    agentId: 1,
    content,
    chatId: currentChatId,
  })) {
    // 处理流式响应
    if (response.content) {
      appendContent(response.content)
    }
    if (response.done) {
      break
    }
  }
}
```

---

## 6. 类型定义

```typescript
// 重连配置
interface ReconnectOptions {
  enabled: boolean
  maxAttempts: number
  delay: number
  maxDelay: number
  backoff: 'linear' | 'exponential'
}

// 心跳配置
interface HeartbeatOptions {
  enabled: boolean
  interval: number
  timeout: number
  message?: any
}

// 实时通道接口
interface RealtimeChannel<TRequest = any, TResponse = TRequest> {
  send(message: TRequest): void
  on(event: 'message', handler: (msg: TResponse) => void): void
  on(event: 'error', handler: (error: Error) => void): void
  on(event: 'close', handler: (code: number, reason: string) => void): void
  once(event: string, handler: (...args: any[]) => void): void
  close(): void
  isConnected(): boolean
}

// 业务层调用选项
interface SSECallOptions extends SSEStreamOptions {
  clientOptions?: Partial<SSEOptions>
}

interface WebSocketCallOptions {
  clientOptions?: Partial<WebSocketOptions>
}
```

---

## 7. 错误处理

### 7.1 捕获错误

```typescript
try {
  for await (const msg of client.stream(request, {
    onError: (err) => {
      console.error('流错误:', err)
    },
  })) {
    // 处理消息
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('用户取消')
  } else {
    console.error('请求失败:', error)
  }
}
```

### 7.2 中止请求

```typescript
const controller = new AbortController()

// 传递 signal
for await (const msg of client.stream(request, {
  signal: controller.signal,
})) {
  // 处理消息
}

// 需要中止时
controller.abort()
```

---

## 8. 调试

### 8.1 开启日志

```typescript
import { configureRealtimeClient, consoleLogger } from '@hope/realtime'

configureRealtimeClient({
  baseURL: apiURL,
  logger: consoleLogger,  // 开启控制台日志
})
```

### 8.2 日志输出示例

```
[realtime] Connecting to /api/chat/stream
[realtime] Received chunk: 256 bytes
[realtime] Parsed 2 messages
[realtime] Stream completed
```

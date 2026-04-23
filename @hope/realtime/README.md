# @hope/realtime

> Protocol-agnostic realtime communication library (SSE/WebSocket)

## 核心特性

- ✅ **完全业务无关**：泛型设计，支持任意消息类型
- ✅ **SSE 支持**：基于 fetch + ReadableStream，支持流式数据
- ✅ **WebSocket 支持**：内置心跳、自动重连
- ✅ **可插拔 Parser**：框架提供工具，业务层注入解析器
- ✅ **结构化错误**：统一透传 SSE / WebSocket 的上下文和底层 cause
- ✅ **类型安全**：完整的 TypeScript 支持

## 安装

```bash
pnpm add @hope/realtime
```

## 基本用法

### SSE 客户端

```typescript
import { SSEClient } from '@hope/realtime'
import { createNDJSONParser } from '@hope/realtime/utils'

const client = new SSEClient('/api/chat/stream')
const parser = createNDJSONParser<MyMessage>()

for await (const message of client.stream(request, { parser })) {
  console.log(message)
}
```

### WebSocket 客户端

```typescript
import { WebSocketClient, WebSocketChannelError } from '@hope/realtime'

const client = new WebSocketClient('ws://localhost:8080')

try {
  const channel = await client.connect<MyMessage>()
  channel.on('message', (msg) => console.log(msg))
  channel.on('error', (error) => {
    if (error instanceof WebSocketChannelError) {
      console.error(error.kind, error.url, error.readyState, error.cause)
    }
  })
  channel.send({ type: 'hello' })
} catch (error) {
  console.error('connect failed', error)
}
```

## 架构设计

详见：[`docs/realtime-communication-architecture.md`](../../docs/realtime-communication-architecture.md)

## 使用手册

详见：[`docs/usage.md`](./docs/usage.md)

## License

MIT

# @hope/api-core

> Shared API Client Container - 所有服务包共享的 HTTP 客户端容器

## 核心特性

- ✅ **IoC 架构**：应用层配置一次，所有服务包自动使用
- ✅ **类型安全**：完整的 TypeScript 泛型支持
- ✅ **统一错误处理**：集中式的请求/响应拦截
- ✅ **文件上传**：内置 multipart/form-data 支持
- ✅ **Schema 中立契约**：`RequestItem`/`ResponseItem` 保持框架无关

## 安装

```bash
pnpm add @hope/api-core
```

## 快速开始

```typescript
// apps/user-center/src/bootstrap.ts
import { configureApiClient } from '@hope/api-core'
import { requestClient } from './api/request'

configureApiClient(requestClient)
```

## UI 适配

`@hope/api-core` 只提供中立 Schema 契约，不提供 UI 渲染实现。

- Ant Design / Vben 适配请使用：`@hope/api-antd-adapter`

## 使用手册

详见：[`docs/usage.md`](docs/usage.md)

## License

MIT

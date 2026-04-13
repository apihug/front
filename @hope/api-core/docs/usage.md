# @hope/api-core 使用手册

## 1. 概述

`@hope/api-core` 是所有服务包共享的 HTTP 客户端容器，采用 **IoC（控制反转）** 架构设计：

- 应用层只需配置一次 `requestClient`
- 所有服务包（`@hope/aip-service`、`@hope/order-service` 等）自动使用
- 统一的类型定义和错误处理

> 说明：`RequestItem` / `ResponseItem` 属于 **框架无关 Schema 契约**。  
> 如果要把 Schema 转换为 AntD/Vben Form/Table 配置，请使用 `@hope/api-antd-adapter`。

## 2. 快速开始

### 2.1 安装依赖

```bash
pnpm add @hope/api-core
```

### 2.2 应用层配置（IoC 注入）

在应用启动时配置 HTTP 客户端：

```typescript
// apps/user-center/src/bootstrap.ts
import { configureApiClient } from '@hope/api-core'
import { requestClient } from './api/request'

// 配置 API 客户端（IoC 依赖注入）
// 注入应用层的 requestClient，之后所有 API Service 自动使用
configureApiClient(requestClient)
```

**配置时机要求：**
- 必须在应用启动阶段调用
- 必须在使用任何服务包之前完成配置
- 通常放在 `bootstrap.ts` 或 `main.ts` 中

---

## 3. 类型定义

### 3.1 ApiClient 接口

应用层的 `requestClient` 需实现此接口：

```typescript
interface ApiClient {
  get<T>(url: string, config?: ApiRequestConfig): Promise<T>
  post<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<T>
  put<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<T>
  delete<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<T>
  request<T>(url: string, config?: ApiRequestConfig): Promise<T>
}
```

### 3.2 请求配置

```typescript
interface ApiRequestConfig {
  params?: Record<string, any>      // URL 查询参数
  headers?: Record<string, string>  // 自定义请求头
  timeout?: number                  // 超时时间（ms）
  responseType?: 'json' | 'blob' | 'text' | 'arraybuffer'
  [key: string]: any                // 其他配置
}
```

### 3.3 请求额外配置

```typescript
interface RequestConfigExtra {
  anonymous?: boolean        // 是否匿名请求（不带 token）
  loading?: boolean          // 是否显示 loading
  customDev?: boolean        // 自定义开发环境配置
  lowLimitRiskyMode?: string // 低限制风险模式（敏感操作）
}
```

---

## 4. API 方法

### 4.1 GET 请求

```typescript
import { useGet } from '@hope/api-core'

// 基本用法
const user = await useGet<User>('/api/user/123')

// 带查询参数
const list = await useGet<PageResult<User>>('/api/users', {
  page: 1,
  size: 10,
  status: 'active',
})

// 带额外配置
const data = await useGet<Config>('/api/config', null, {
  anonymous: true,  // 匿名请求
  timeout: 5000,
})
```

### 4.2 POST 请求

```typescript
import { usePost } from '@hope/api-core'

// 基本用法
const result = await usePost<Result>('/api/user', {
  name: 'John',
  email: 'john@example.com',
})

// 带路径参数和查询参数
const data = await usePost<Result, CreateDto>(
  '/api/orders',
  { productId: 123, quantity: 2 },
  { couponCode: 'SAVE20' }
)
```

### 4.3 PUT 请求

```typescript
import { usePut } from '@hope/api-core'

const result = await usePut<Result>('/api/user/123', {
  name: 'John Updated',
  email: 'john.updated@example.com',
})
```

### 4.4 DELETE 请求

```typescript
import { useDelete } from '@hope/api-core'

// 基本用法
await useDelete<void>('/api/user/123')

// 带请求体
await useDelete<Result>('/api/items/batch', [1, 2, 3])
```

### 4.5 文件上传

```typescript
import { useUpload } from '@hope/api-core'

// 单文件上传
const result = await useUpload<UploadResult>('/api/upload', {
  filename: 'avatar',
  file: fileObject,
})

// 多文件上传
const result = await useUpload<UploadResult>('/api/upload/batch', {
  files: [file1, file2, file3],
})

// 带额外参数
const result = await useUpload<UploadResult>(
  '/api/upload',
  { file: fileObject },
  { category: 'avatar' }
)
```

### 4.6 路径参数替换

```typescript
import { pathToUrl } from '@hope/api-core'

// 替换路径参数
const url = pathToUrl('/api/users/{id}/posts/{postId}', 123, 456)
// 结果: '/api/users/123/posts/456'

// 配合请求使用
const post = await useGet<Post>(
  pathToUrl('/api/users/{id}/posts/{postId}', userId, postId)
)
```

---

## 5. 服务包封装示例

### 5.1 标准 API Service 封装

```typescript
// packages/aip-service/src/api/user-api.ts
import { useGet, usePost, usePut, useDelete, pathToUrl } from '@hope/api-core'
import type { ApiRequestConfig, RequestConfigExtra } from '@hope/api-core'

export const UserService = {
  /** 获取用户列表 */
  async list(params: ListParams, config?: ApiRequestConfig & RequestConfigExtra) {
    return useGet<PageResult<User>>('/api/users', params, config)
  },

  /** 获取单个用户 */
  async get(id: number, config?: ApiRequestConfig & RequestConfigExtra) {
    return useGet<User>(`/api/users/${id}`, null, config)
  },

  /** 创建用户 */
  async create(data: CreateUserDto, config?: ApiRequestConfig & RequestConfigExtra) {
    return usePost<User>('/api/users', data, null, config)
  },

  /** 更新用户 */
  async update(id: number, data: UpdateUserDto, config?: ApiRequestConfig & RequestConfigExtra) {
    return usePut<User>(`/api/users/${id}`, data, config)
  },

  /** 删除用户 */
  async delete(id: number, config?: ApiRequestConfig & RequestConfigExtra) {
    return useDelete<void>(`/api/users/${id}`, null, config)
  },
}
```

### 5.2 带权限标记的封装

```typescript
// packages/aip-service/src/api/admin-api.ts
import { useGet, usePost } from '@hope/api-core'

export const AdminService = {
  // 权限配置（供路由守卫使用）
  Permission: {
    getUsers: { anonymous: false },
    getPublicConfig: { anonymous: true },
  },

  /** 获取用户列表（需登录） */
  async getUsers(params: ListParams) {
    return useGet<PageResult<User>>('/api/admin/users', params)
  },

  /** 获取公开配置（无需登录） */
  async getPublicConfig() {
    return useGet<Config>('/api/public/config', null, { anonymous: true })
  },
}
```

---

## 6. 应用层 RequestClient 实现

### 6.1 基于 @vben/request 实现

```typescript
// apps/user-center/src/api/request.ts
import { RequestClient } from '@vben/request'
import { useAccessStore } from '@vben/stores'
import { preferences } from '@vben/preferences'

const apiURL = import.meta.env.VITE_GLOB_API_URL || ''

export const requestClient = new RequestClient({
  baseURL: apiURL,
})

// 请求拦截器：注入 token
requestClient.addRequestInterceptor({
  fulfilled: async (config) => {
    const accessStore = useAccessStore()
    config.headers.Authorization = `Bearer ${accessStore.accessToken}`
    config.headers['Accept-Language'] = preferences.app.locale
    return config
  },
})

// 响应拦截器：统一错误处理
requestClient.addResponseInterceptor({
  rejected: (error) => {
    // 处理 401、网络错误等
    if (error.response?.status === 401) {
      // 跳转登录
    }
    return Promise.reject(error)
  },
})
```

### 6.2 满足 ApiClient 接口

```typescript
// 确保 requestClient 实现了 ApiClient 接口
import type { ApiClient } from '@hope/api-core'

const requestClient: ApiClient = {
  get: (url, config) => client.get(url, config),
  post: (url, data, config) => client.post(url, data, config),
  put: (url, data, config) => client.put(url, data, config),
  delete: (url, data, config) => client.delete(url, data, config),
  request: (url, config) => client.request(url, config),
}
```

---

## 7. 错误处理

### 7.1 全局错误处理

在 `requestClient` 中配置响应拦截器：

```typescript
requestClient.addResponseInterceptor({
  rejected: (error) => {
    const status = error.response?.status

    switch (status) {
      case 401:
        // 未授权，跳转登录
        break
      case 403:
        // 禁止访问
        break
      case 404:
        // 资源不存在
        break
      case 500:
        // 服务器错误
        break
    }

    return Promise.reject(error)
  },
})
```

### 7.2 局部错误处理

```typescript
try {
  const result = await UserService.create(userData)
} catch (error) {
  if (error.response?.status === 400) {
    // 参数错误
    console.error('参数校验失败:', error.response.data)
  } else {
    // 其他错误
    console.error('请求失败:', error)
  }
}
```

---

## 8. 最佳实践

### 8.1 服务包目录结构

```
packages/aip-service/
├── src/
│   ├── api/
│   │   ├── user-api.ts       # 用户相关 API
│   │   ├── order-api.ts      # 订单相关 API
│   │   └── index.ts          # 统一导出
│   ├── types/
│   │   ├── user.ts           # 用户类型定义
│   │   └── index.ts
│   └── index.ts
└── package.json
```

### 8.2 类型安全

```typescript
// 定义请求和响应类型
interface CreateUserRequest {
  name: string
  email: string
  role?: string
}

interface CreateUserResponse {
  id: number
  name: string
  email: string
  createdAt: string
}

// 使用泛型确保类型安全
async function createUser(data: CreateUserRequest) {
  return usePost<CreateUserResponse>('/api/users', data)
}
```

### 8.3 请求取消

```typescript
import { AbortController } from 'axios'

const controller = new AbortController()

// 发起请求
const promise = useGet<User>('/api/user/123', null, {
  signal: controller.signal,
})

// 需要取消时
controller.abort()
```

---

## 9. 与 @hope/realtime 配合

`@hope/api-core` 处理同步请求，`@hope/realtime` 处理流式请求：

```typescript
// bootstrap.ts - 同时配置两个客户端
import { configureApiClient } from '@hope/api-core'
import { configureRealtimeClient } from '@hope/realtime'
import { requestClient } from './api/request'
import { useAccessStore } from '@vben/stores'

// 同步 API 客户端
configureApiClient(requestClient)

// 流式 API 客户端（SSE/WebSocket）
configureRealtimeClient({
  baseURL: apiURL,
  getHeaders: () => ({
    Authorization: `Bearer ${useAccessStore().accessToken}`,
  }),
})
```

---

## 10. 常见问题

### Q1: 未配置错误

```
Error: [api-core] API client not configured.
```

**解决方案：** 确保在 `bootstrap.ts` 中调用 `configureApiClient(requestClient)`

### Q2: Token 未携带

**解决方案：** 在 `requestClient` 的请求拦截器中注入 Authorization 头

### Q3: 跨包调用 404

**解决方案：** 确保 `package.json` 中声明了 workspace 依赖：
```json
{
  "dependencies": {
    "@hope/api-core": "workspace:*"
  }
}
```

# ApiHug Front

> 基于 [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) 的企业级前端扩展项目

## 项目概述

本项目是对官方 Vben Admin 框架的扩展实现：

- **享受官方升级红利**：最大程度利用 Vben 的基础设施和持续更新
- **满足定制化需求**：团队专属的扩展库和业务模块

## 项目结构

```
front/
├── vben.zip                   # 官方 Vue Vben Admin Snapshot
│                              # https://github.com/vbenjs/vue-vben-admin
│
├── @hope/                     # 扩展核心库
│   ├── api/                   # HTTP 客户端容器 (IoC 架构)
│   ├── api-antd-adapter/      # Ant Design / Vben UI 适配器
│   └── realtime/              # 实时通信库 (SSE/WebSocket)
│
└── admin-center/              # 业务应用
                               # 依赖 @hope/* 和 vben/* 包
```

### 扩展库说明

| 包名 | 说明 |
|------|------|
| `@hope/api` | HTTP 客户端容器，提供 IoC 架构、统一错误处理、文件上传 |
| `@hope/api-antd-adapter` | 将 ApiHug Schema 转换为 Ant Design / Vben UI 配置 |
| `@hope/realtime` | 协议无关的实时通信库，支持 SSE 和 WebSocket |

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8

### Clone 项目

```bash
git clone --depth 1  https://github.com/apihug/front.git
```

### 安装依赖

```bash
# 根目录安装（monorepo）
pnpm install

# 或分别安装
cd vben && pnpm install
cd ../@hope/api && pnpm install
cd ../@hope/api-antd-adapter && pnpm install
cd ../@hope/realtime && pnpm install
cd ../admin-center && pnpm install
```

### 启动开发服务器

```bash
cd admin-center
pnpm dev
```

## 架构原则

```
┌─────────────────────────────────────────────────────────┐
│                     admin-center                         │
│                    (业务应用层)                           │
├─────────────────────────────────────────────────────────┤
│  @hope/api-antd-adapter  │  @hope/realtime               │
│     (UI 适配层)          │    (实时通信)                  │
├─────────────────────────────────────────────────────────┤
│                   @hope/api                         │
│                   (核心 API 层)                          │
├─────────────────────────────────────────────────────────┤
│                      vben/*                              │
│                 (官方基础设施)                           │
└─────────────────────────────────────────────────────────┘
```

- 扩展库 (`@hope/*`) 专注团队定制化需求
- 官方升级时，最大程度复用 Vben 基础设施
- 业务应用层 (`admin-center`) 组合使用扩展和官方包



## SDK

所有 api 将会生成 SDK 到 `@sdk` (generated SDK package `@sdk/{domain}-{module}`)目录 参考规则 [apihug-impl-front-vben-guide.md](https://github.com/apihug/skills/blob/main/rules/apihug-impl-front-vben-guide.md)。


## Build Local

```pnpm vben:zip```


## License

MIT

## Refer

1. [Quick Start](https://apihug.github.io/zhCN-docs/start.html)
2. [Front](https://github.com/apihug/front)
3. [Skill](https://github.com/apihug/skills)
4. [Rapid Application Build Archetype](https://github.com/apihug/apihug-archetype)

😙 SDK 版本： <a target="_blank" href="https://search.maven.org/artifact/com.apihug/it-bom"><img src="https://img.shields.io/maven-central/v/com.apihug/it-bom.svg?label=Maven%20Central" /></a> 

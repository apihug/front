# ApiHug Front

> 基于 [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) 的企业级前端扩展项目

## 项目概述

本项目是对官方 Vben Admin 框架的扩展实现，通过 Git Submodule 机制：

- **享受官方升级红利**：最大程度利用 Vben 的基础设施和持续更新
- **满足定制化需求**：团队专属的扩展库和业务模块

## 项目结构

```
front/
├── vben/                      # [Submodule] 官方 Vue Vben Admin
│                              # https://github.com/vbenjs/vue-vben-admin
│
├── @hope/                     # 扩展核心库
│   ├── api-core/              # HTTP 客户端容器 (IoC 架构)
│   ├── api-antd-adapter/      # Ant Design / Vben UI 适配器
│   └── realtime/              # 实时通信库 (SSE/WebSocket)
│
└── admin-center/              # 业务应用
                               # 依赖 @hope/* 和 vben/* 包
```

### 扩展库说明

| 包名 | 说明 |
|------|------|
| `@hope/api-core` | HTTP 客户端容器，提供 IoC 架构、统一错误处理、文件上传 |
| `@hope/api-antd-adapter` | 将 ApiHug Schema 转换为 Ant Design / Vben UI 配置 |
| `@hope/realtime` | 协议无关的实时通信库，支持 SSE 和 WebSocket |

## 快速开始

### 前置要求

- Node.js >= 18
- pnpm >= 8

### Clone 项目

```bash
# 推荐：一键浅克隆（front + vben submodule 都只取最新提交）
git clone --depth 1 --recurse-submodules --shallow-submodules https://github.com/apihug/front.git

# 等效分步写法
# git clone --depth 1 https://github.com/apihug/front.git
# cd front
# git submodule update --init --depth 1
```

### 已克隆项目后初始化 Submodule

```bash
# 如果已经 clone 了主仓库，补拉 submodule（浅克隆）
git submodule update --init --depth 1
```

### 安装依赖

```bash
# 根目录安装（monorepo）
pnpm install

# 或分别安装
cd vben && pnpm install
cd ../@hope/api-core && pnpm install
cd ../@hope/api-antd-adapter && pnpm install
cd ../@hope/realtime && pnpm install
cd ../admin-center && pnpm install
```

### 启动开发服务器

```bash
cd admin-center
pnpm dev
```

## Submodule 操作指南

### 更新 Vben 到最新版本

```bash
# 更新 submodule 到远程最新
git submodule update --remote vben

# 或进入 submodule 目录操作
cd vben
git pull origin main
cd ..
git add vben
git commit -m "chore: update vben submodule"
```

### 切换 Vben 版本/分支

```bash
cd vben
git checkout v5.5.0  # 切换到特定 tag
# 或
git checkout main     # 切换到主分支
cd ..
git add vben
git commit -m "chore: pin vben to v5.5.0"
```

### 团队协作注意

当 `vben` submodule 有更新时：

```bash
# 拉取主仓库更新后，同步 submodule
git pull
git submodule update --init --recursive
```

### 常见问题

**Q: Submodule 显示为空目录？**

```bash
git submodule update --init --recursive
```

**Q: Submodule 状态异常？**

```bash
# 检查状态
git submodule status

# 重新初始化
git submodule deinit -f vben
git submodule update --init --depth 1 vben
```

**Q: 需要完整历史记录？**

```bash
# 将浅克隆转为完整克隆
git -C vben fetch --unshallow
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
│                   @hope/api-core                         │
│                   (核心 API 层)                          │
├─────────────────────────────────────────────────────────┤
│                      vben/*                              │
│                 (官方基础设施)                           │
└─────────────────────────────────────────────────────────┘
```

- 扩展库 (`@hope/*`) 专注团队定制化需求
- 官方升级时，最大程度复用 Vben 基础设施
- 业务应用层 (`admin-center`) 组合使用扩展和官方包

## License

MIT

# @hope/api-antd-adapter

> Convert ApiHug `RequestItem` / `ResponseItem` schema to Ant Design / Vben UI config.

## Design Boundary

- `@hope/api`: transport + neutral schema contract
- `@hope/api-antd-adapter`: UI rendering adapter (AntD / Vben)

No AntD/Vben-specific structures should be placed in `@hope/api`.

## Install

```bash
pnpm add @hope/api-antd-adapter @hope/api
```

## Quick Start

```ts
import { toVbenFormSchema, toAntdTableColumns } from '@hope/api-antd-adapter'
import { RequestSchema, ResponseSchema } from '@hope/aip-app-sdk/schema'

const formSchema = toVbenFormSchema(RequestSchema.CreateCustomerRequest)
const columns = toAntdTableColumns(ResponseSchema.CustomerSummary)
```

## Usage Guide

See [`docs/usage.md`](./docs/usage.md).

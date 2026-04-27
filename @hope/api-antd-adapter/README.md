# @hope/api-antd-adapter

Convert neutral ApiHug `RequestItem` / `ResponseItem` schema into AntD-style and Vben form/table config.

## Design Boundary

- `@hope/api`: transport + neutral schema contract
- `@hope/api-antd-adapter`: UI rendering adapter for AntD-style configs and Vben

No AntD or Vben-specific structures should be placed in `@hope/api`.
This package returns plain config objects and does not directly import `ant-design-vue` or `antdv-next`.

## Install

```bash
pnpm add @hope/api-antd-adapter @hope/api
```

Bring your own UI runtime in the app layer. In this repository, the generated configs are consumed by `antdv-next` and Vben.

## Quick Start

```ts
import { toAntdTableColumns, toVbenFormSchema } from '@hope/api-antd-adapter'
import { RequestSchema, ResponseSchema } from '@hope/aip-app-sdk/schema'

const formSchema = toVbenFormSchema(RequestSchema.CreateCustomerRequest, {
  objectMode: 'json',
})

const columns = toAntdTableColumns(ResponseSchema.CustomerSummary)
```

## What The Adapter Owns

- Vben `fieldName` mapping from neutral request schema
- Vben-native `rules` generation using `'required'`, `'selectRequired'`, or `zod`
- `valueFormat` for upload normalization and JSON editor parsing
- enum option rendering
- nested response `path` mapping for tables
- component selection from scalar type, enum metadata, and `ui.widget`

## Neutral Schema Conventions

- Request schema stays in `RequestItem[]`
- Response schema stays in `ResponseItem[]`
- Per-field UI overrides go into `ui.widget` and `ui.props`
- Object fields default to `objectMode: 'manual'` in generated schema, then the adapter can resolve them as `json`, `string`, or `skip`

## Usage Guide

See [`docs/usage.md`](./docs/usage.md).

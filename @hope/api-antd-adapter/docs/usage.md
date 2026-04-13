# @hope/api-antd-adapter 使用手册

## 1. 目标

将 ApiHug 生成的中立 Schema：

- `RequestItem[]`
- `ResponseItem[]`

转换为：

- Ant Design Form 字段配置
- Vben Form Schema
- Ant Design Table 列
- Vxe Table 列

## 2. 基本用法

```ts
import {
  toAntdFormFields,
  toAntdTableColumns,
  toVbenFormSchema,
  toVxeTableColumns,
} from '@hope/api-antd-adapter'
import { RequestSchema, ResponseSchema } from '@hope/aip-app-sdk/schema'

const createCustomerForm = toVbenFormSchema(RequestSchema.CreateCustomerRequest)
const customerColumns = toAntdTableColumns(ResponseSchema.CustomerSummary)
```

## 3. i18n 与显示策略

```ts
const formSchema = toVbenFormSchema(RequestSchema.CreateCustomerRequest, {
  t: (key, fallback) => i18n.global.t(key) || fallback || key,
  enumLabelPolicy: 'description2',
  objectMode: 'json',
})
```

`enumLabelPolicy` 可选值：

- `description`
- `description2`
- `name`
- `code`

`objectMode` 可选值：

- `json`: 将对象字段按 JSON 文本输入处理
- `skip`: 跳过对象字段，交给业务页面手写
- `string`: 退化为普通输入框

## 4. 日期格式化

```ts
const columns = toAntdTableColumns(ResponseSchema.ApiKeySummary, {
  formatDate(value, schema) {
    if (!value) return ''
    // 这里可按 schema.dateFormat 接入 dayjs
    return String(value)
  },
})
```

## 5. 建议实践

- 将 adapter 作为 UI 层依赖，不要放入 `@hope/api-core`
- 复杂对象（`nodeKind=object`）优先走 `objectMode='skip'` + 自定义组件
- 生成 Schema 后可在页面二次 merge（补充宽度、排序、特殊渲染）

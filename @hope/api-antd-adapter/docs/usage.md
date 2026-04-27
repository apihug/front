# @hope/api-antd-adapter Usage

## Goal

Convert neutral ApiHug schema:

- `RequestItem[]`
- `ResponseItem[]`

into:

- AntD-style form fields
- Vben form schema
- AntD-style table columns
- Vxe table columns

This package only returns plain config objects. It does not directly import `ant-design-vue` or `antdv-next`.
In this repository, those outputs are consumed by `antdv-next` and Vben at the app layer.

## Basic Usage

```ts
import {
  toAntdFormFields,
  toAntdTableColumns,
  toVbenFormSchema,
  toVxeTableColumns,
} from '@hope/api-antd-adapter'
import { RequestSchema, ResponseSchema } from '@hope/aip-app-sdk/schema'

const createCustomerForm = toVbenFormSchema(RequestSchema.CreateCustomerRequest, {
  objectMode: 'json',
})

const customerFields = toAntdFormFields(RequestSchema.CreateCustomerRequest)
const customerColumns = toAntdTableColumns(ResponseSchema.CustomerSummary)
const customerVxeColumns = toVxeTableColumns(ResponseSchema.CustomerSummary)
```

## Adapter Context

```ts
const formSchema = toVbenFormSchema(RequestSchema.CreateCustomerRequest, {
  t: (key, fallback) => i18n.global.t(key) || fallback || key,
  enumLabelPolicy: 'description2',
  objectMode: 'json',
})
```

Supported context fields:

- `t`: translate `i18key`
- `enumLabelPolicy`: `description | description2 | name | code`
- `objectMode`: `json | skip | string`
- `formatDate`: custom response date formatting for tables

## Vben Form Mapping

The adapter maps neutral request schema into the Vben contract described by the local Vben docs:

- `key` or `name` -> `fieldName`
- `title` / `description` / `i18key` -> `label` and `help`
- `ui.widget` -> explicit component override
- `ui.props` -> merged into `componentProps`
- `required` -> `'required'` or `'selectRequired'` for simple cases
- advanced validation -> `zod` rules
- upload fields and JSON editor fields -> `valueFormat`

Example output shape:

```ts
[
  {
    fieldName: 'email',
    label: 'Email',
    component: 'Input',
    rules: z.string().email(),
  },
  {
    fieldName: 'attachments',
    label: 'Attachments',
    component: 'Upload',
    valueFormat(value) {
      return Array.isArray(value) ? value.map((item) => item.originFileObj ?? item) : undefined
    },
  },
]
```

## Validation Strategy

The adapter intentionally does not emit AntD-style rule arrays for Vben forms.

It uses:

- `'required'` for simple text/number required checks
- `'selectRequired'` for select/date/time style components
- `zod` for:
  - arrays
  - uploads
  - JSON textareas
  - `email`
  - `uuid`
  - numeric ranges and `multipleOf`
  - string length and regex checks
  - min/max item counts

## Object Field Strategy

Generated schema can stay neutral with `objectMode: 'manual'`.

The adapter can then resolve object fields in one of three ways:

- `json`: render a JSON textarea in forms and JSON-string cells in tables
- `string`: degrade to plain string input/rendering
- `skip`: omit the field/column from default auto rendering

Per-field schema can override the global adapter choice with `objectMode: 'json'`, `objectMode: 'string'`, or `objectMode: 'skip'`.

## Enum Strategy

When `enumRef` is present:

- forms use `Select`
- array enums use `Select` with `mode: 'multiple'`
- tables render enum labels through the configured `enumLabelPolicy`

## Nested Response Path

Use `path` when the API payload is nested but the column still needs a flat schema entry.

```ts
{
  key: 'city',
  dataIndex: 'city',
  path: 'address.city',
  title: 'City',
  nodeKind: 'scalar',
  scalarType: 'string',
  tsType: 'string',
  container: 'single',
}
```

The adapter will:

- map AntD `dataIndex` to `['address', 'city']`
- map Vxe `field` to `'address.city'`

## UI Hints

Use neutral `ui` hints rather than framework-specific schema:

```ts
{
  key: 'payload',
  name: 'payload',
  nodeKind: 'object',
  scalarType: 'unknown',
  tsType: 'CreatePayload',
  container: 'single',
  objectMode: 'json',
  ui: {
    widget: 'Textarea',
    props: {
      autoSize: { minRows: 4, maxRows: 12 },
    },
  },
}
```

## Date Formatting In Tables

```ts
const columns = toAntdTableColumns(ResponseSchema.ApiKeySummary, {
  formatDate(value, schema) {
    if (!value) return ''
    return dayjs(value).format(schema.dateFormat || 'YYYY-MM-DD HH:mm:ss')
  },
})
```

## Recommended Practice

- Keep the schema package neutral. Do not leak Vben-only fields into `@hope/api`.
- Keep Java generation simple and stable.
- Put rendering behavior into the adapter.
- Merge page-specific customizations after adapter output instead of hardcoding them into the generator.

import type { RequestItem, ResponseItem } from '@hope/api'

export type EnumLabelPolicy = 'description' | 'description2' | 'name' | 'code'

export interface AdapterContext {
  t?: (i18key: string, fallback?: string) => string
  enumLabelPolicy?: EnumLabelPolicy
  objectMode?: 'json' | 'skip' | 'string'
  formatDate?: (
    value: unknown,
    schema: Pick<RequestItem | ResponseItem, 'scalarType' | 'format' | 'dateFormat'>,
  ) => string
}

export interface AntdSelectOption {
  label: string
  value: string | number
  disabled?: boolean
  raw?: unknown
}

export interface AntdFormRule {
  required?: boolean
  type?: 'array' | 'boolean' | 'email' | 'number' | 'object' | 'string'
  min?: number
  max?: number
  pattern?: RegExp
  message?: string
}

export interface AntdFormField {
  field: string
  label: string
  component:
    | 'DatePicker'
    | 'Input'
    | 'InputNumber'
    | 'Select'
    | 'Switch'
    | 'TextArea'
    | 'TimePicker'
    | 'Upload'
  componentProps?: Record<string, unknown>
  required?: boolean
  rules?: AntdFormRule[]
  source?: RequestItem['source']
  schema: RequestItem
}

export interface VbenFormSchemaLike {
  field: string
  label: string
  component: string
  required?: boolean
  componentProps?: Record<string, unknown>
  rules?: AntdFormRule[]
  help?: string
  schema: RequestItem
}

export interface AntdTableColumn {
  key: string
  dataIndex: string
  title: string
  sorter?: boolean
  ellipsis?: boolean
  customRender?: (ctx: { text: unknown; record: Record<string, unknown> }) => string
  schema: ResponseItem
}

export interface VxeTableColumnLike {
  field: string
  title: string
  sortable?: boolean
  formatter?: (ctx: { cellValue: unknown; row: Record<string, unknown> }) => string
  schema: ResponseItem
}

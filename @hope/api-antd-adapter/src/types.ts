import type { RequestItem, ResponseItem } from '@hope/api'
import type { ZodTypeAny } from 'zod'

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

export type AdapterFormComponent =
  | 'DatePicker'
  | 'Input'
  | 'InputNumber'
  | 'RangePicker'
  | 'Select'
  | 'Switch'
  | 'Textarea'
  | 'TimePicker'
  | 'Upload'
  | (Record<never, never> & string)

export interface AntdFormField {
  field: string
  label: string
  component: AdapterFormComponent
  componentProps?: Record<string, unknown>
  required?: boolean
  rules?: AntdFormRule[]
  source?: RequestItem['source']
  schema: RequestItem
}

export type VbenFormRuleLike = 'required' | 'selectRequired' | ZodTypeAny | null

export type VbenValueFormatLike = (
  value: any,
  setValue: (fieldName: string, value: any) => void,
  values: Record<string, any>,
) => any

export interface VbenFormSchemaLike {
  fieldName: string
  label: string
  component: AdapterFormComponent
  required?: boolean
  componentProps?: Record<string, unknown>
  help?: string
  rules?: VbenFormRuleLike
  valueFormat?: VbenValueFormatLike
}

export interface AntdTableColumn {
  key: string
  dataIndex: string | string[]
  title: string
  sorter?: boolean
  ellipsis?: boolean
  customRender?: (ctx: { text: unknown; record: Record<string, unknown> }) => string
  schema: ResponseItem
  [key: string]: any
}

export interface VxeTableColumnLike {
  field: string
  title: string
  sortable?: boolean
  formatter?: (ctx: { cellValue: unknown; row: Record<string, unknown> }) => string
  schema: ResponseItem
  [key: string]: any
}

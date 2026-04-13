import type { RequestItem, SchemaEnumMeta, SchemaEnumRef } from '@hope/api-core'

import type {
  AdapterContext,
  AntdFormField,
  AntdFormRule,
  AntdSelectOption,
  EnumLabelPolicy,
  VbenFormSchemaLike,
} from './types'

const DEFAULT_CONTEXT: Required<Pick<AdapterContext, 'enumLabelPolicy' | 'objectMode'>> = {
  enumLabelPolicy: 'description2',
  objectMode: 'json',
}

function withDefaults(ctx?: AdapterContext) {
  return { ...DEFAULT_CONTEXT, ...(ctx ?? {}) }
}

function resolveLabel(item: RequestItem, ctx?: AdapterContext): string {
  const fallback = item.title || item.description || item.name
  return ctx?.t ? ctx.t(item.i18key, fallback) : fallback
}

function parseNumber(value?: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parsePattern(pattern?: string): RegExp | undefined {
  if (!pattern) {
    return undefined
  }
  try {
    return new RegExp(pattern)
  } catch {
    return undefined
  }
}

function enumOptionLabel(
  name: string,
  meta: SchemaEnumMeta,
  policy: EnumLabelPolicy,
): string {
  if (policy === 'description') {
    return meta.description || meta.description2 || name
  }
  if (policy === 'description2') {
    return meta.description2 || meta.description || name
  }
  if (policy === 'code') {
    return `${meta.code ?? name}`
  }
  return name
}

export function toEnumOptions(
  enumRef?: SchemaEnumRef,
  ctx?: AdapterContext,
): AntdSelectOption[] {
  if (!enumRef) {
    return []
  }
  const policy = withDefaults(ctx).enumLabelPolicy
  return Object.entries(enumRef).map(([name, meta]) => ({
    label: enumOptionLabel(name, meta || {}, policy),
    value: name,
    disabled: meta?.deprecated === true,
    raw: meta,
  }))
}

function resolveComponent(item: RequestItem, ctx?: AdapterContext): AntdFormField['component'] {
  if (item.nodeKind === 'file') {
    return 'Upload'
  }
  if (item.nodeKind === 'enum') {
    return 'Select'
  }
  if (item.nodeKind === 'object') {
    return withDefaults(ctx).objectMode === 'json' ? 'TextArea' : 'Input'
  }
  switch (item.scalarType) {
    case 'boolean':
      return 'Switch'
    case 'integer':
    case 'long':
    case 'float':
    case 'double':
    case 'decimal':
    case 'number':
      return 'InputNumber'
    case 'date':
    case 'date-time':
      return 'DatePicker'
    case 'time':
      return 'TimePicker'
    default:
      return 'Input'
  }
}

function resolveComponentProps(
  item: RequestItem,
  component: AntdFormField['component'],
  ctx?: AdapterContext,
): Record<string, unknown> | undefined {
  const props: Record<string, unknown> = {}

  if (component === 'Select' && item.enumRef) {
    props.options = toEnumOptions(item.enumRef, ctx)
  }

  if (component === 'Upload') {
    props.maxCount = item.container === 'array' ? undefined : 1
  }

  if (component === 'DatePicker' && item.dateFormat) {
    props.format = item.dateFormat
    props.valueFormat = item.dateFormat
  }

  if (component === 'TimePicker' && item.dateFormat) {
    props.format = item.dateFormat
    props.valueFormat = item.dateFormat
  }

  if (item.nodeKind === 'object' && withDefaults(ctx).objectMode === 'json') {
    props.autoSize = { minRows: 3, maxRows: 10 }
    props.placeholder = `JSON: ${item.tsType}`
  }

  return Object.keys(props).length > 0 ? props : undefined
}

function buildRules(item: RequestItem, label: string): AntdFormRule[] {
  const rules: AntdFormRule[] = []
  const validation = item.validation

  if (item.required) {
    rules.push({ required: true, message: `${label} is required` })
  }

  if (!validation) {
    return rules
  }

  if (validation.email) {
    rules.push({ type: 'email', message: `${label} is invalid` })
  }

  if (validation.minLength !== undefined || validation.maxLength !== undefined) {
    rules.push({
      type: 'string',
      min: validation.minLength,
      max: validation.maxLength,
      message: `${label} length is out of range`,
    })
  }

  if (validation.minimum !== undefined || validation.maximum !== undefined) {
    rules.push({
      type: 'number',
      min: parseNumber(validation.minimum),
      max: parseNumber(validation.maximum),
      message: `${label} value is out of range`,
    })
  }

  if (validation.minItems !== undefined || validation.maxItems !== undefined) {
    rules.push({
      type: 'array',
      min: validation.minItems,
      max: validation.maxItems,
      message: `${label} item count is out of range`,
    })
  }

  const pattern = parsePattern(validation.pattern)
  if (pattern) {
    rules.push({ pattern, message: `${label} format is invalid` })
  }

  return rules
}

export function toAntdFormFields(
  requestSchema: RequestItem[],
  ctx?: AdapterContext,
): AntdFormField[] {
  return requestSchema
    .map((item) => {
      if (item.nodeKind === 'object' && withDefaults(ctx).objectMode === 'skip') {
        return null
      }
      const label = resolveLabel(item, ctx)
      const component = resolveComponent(item, ctx)
      return {
        field: item.key || item.name,
        label,
        component,
        componentProps: resolveComponentProps(item, component, ctx),
        required: item.required,
        rules: buildRules(item, label),
        source: item.source,
        schema: item,
      } as AntdFormField
    })
    .filter((item): item is AntdFormField => item !== null)
}

export function toVbenFormSchema(
  requestSchema: RequestItem[],
  ctx?: AdapterContext,
): VbenFormSchemaLike[] {
  return toAntdFormFields(requestSchema, ctx).map((field) => ({
    field: field.field,
    label: field.label,
    component: field.component,
    required: field.required,
    componentProps: field.componentProps,
    rules: field.rules,
    schema: field.schema,
  }))
}

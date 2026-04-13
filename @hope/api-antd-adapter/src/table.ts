import type { ResponseItem, SchemaEnumMeta } from '@hope/api'

import type {
  AdapterContext,
  AntdTableColumn,
  EnumLabelPolicy,
  VxeTableColumnLike,
} from './types'

function enumLabel(name: string, meta: SchemaEnumMeta, policy: EnumLabelPolicy): string {
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

function resolveLabel(item: ResponseItem, ctx?: AdapterContext): string {
  const fallback = item.title || item.description || item.dataIndex
  return ctx?.t ? ctx.t(item.i18key, fallback) : fallback
}

function stringifyUnknown(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`
  }
  if (Array.isArray(value)) {
    return value.map(stringifyUnknown).filter(Boolean).join(', ')
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function renderCell(value: unknown, item: ResponseItem, ctx?: AdapterContext): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (item.nodeKind === 'enum' && item.enumRef && typeof value === 'string') {
    const policy = ctx?.enumLabelPolicy ?? 'description2'
    const meta = item.enumRef[value]
    if (meta) {
      return enumLabel(value, meta, policy)
    }
  }

  if (
    (item.scalarType === 'date' ||
      item.scalarType === 'date-time' ||
      item.scalarType === 'time') &&
    ctx?.formatDate
  ) {
    return ctx.formatDate(value, item)
  }

  if (item.nodeKind === 'object' && item.objectMode === 'manual') {
    return '[Object]'
  }

  return stringifyUnknown(value)
}

export function toAntdTableColumns(
  responseSchema: ResponseItem[],
  ctx?: AdapterContext,
): AntdTableColumn[] {
  return responseSchema.map((item) => ({
    key: item.key || item.dataIndex,
    dataIndex: item.dataIndex,
    title: resolveLabel(item, ctx),
    sorter:
      item.scalarType === 'integer' ||
      item.scalarType === 'long' ||
      item.scalarType === 'float' ||
      item.scalarType === 'double' ||
      item.scalarType === 'decimal' ||
      item.scalarType === 'number',
    ellipsis: true,
    customRender: ({ text }) => renderCell(text, item, ctx),
    schema: item,
  }))
}

export function toVxeTableColumns(
  responseSchema: ResponseItem[],
  ctx?: AdapterContext,
): VxeTableColumnLike[] {
  return responseSchema.map((item) => ({
    field: item.dataIndex,
    title: resolveLabel(item, ctx),
    sortable:
      item.scalarType === 'integer' ||
      item.scalarType === 'long' ||
      item.scalarType === 'float' ||
      item.scalarType === 'double' ||
      item.scalarType === 'decimal' ||
      item.scalarType === 'number',
    formatter: ({ cellValue }) => renderCell(cellValue, item, ctx),
    schema: item,
  }))
}

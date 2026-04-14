import type { ResponseItem, SchemaEnumMeta } from '@hope/api'

import type {
  AdapterContext,
  AntdTableColumn,
  EnumLabelPolicy,
  VxeTableColumnLike,
} from './types'

function isNumericScalarType(scalarType: ResponseItem['scalarType']) {
  return [
    'integer',
    'long',
    'float',
    'double',
    'decimal',
    'number',
  ].includes(scalarType)
}

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

function readUiProps(item: ResponseItem): Record<string, unknown> | undefined {
  const props = item.ui?.props
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    return undefined
  }
  return props as Record<string, unknown>
}

function resolveObjectMode(item: ResponseItem, ctx?: AdapterContext) {
  if (item.objectMode && item.objectMode !== 'manual') {
    return item.objectMode
  }
  if (ctx?.objectMode) {
    return ctx.objectMode
  }
  return 'json'
}

function resolveDataPath(item: ResponseItem) {
  return item.path || item.dataIndex
}

function resolveAntdDataIndex(item: ResponseItem) {
  const path = resolveDataPath(item)
  return path.includes('.') ? path.split('.') : path
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

function renderEnumValue(
  value: unknown,
  item: ResponseItem,
  ctx?: AdapterContext,
): string | undefined {
  if (!item.enumRef) {
    return undefined
  }

  const policy = ctx?.enumLabelPolicy ?? 'description2'
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry !== 'string') {
          return stringifyUnknown(entry)
        }
        const meta = item.enumRef?.[entry]
        return meta ? enumLabel(entry, meta, policy) : entry
      })
      .filter(Boolean)
      .join(', ')
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const meta = item.enumRef[value]
  return meta ? enumLabel(value, meta, policy) : value
}

function renderTemporalValue(
  value: unknown,
  item: ResponseItem,
  ctx?: AdapterContext,
): string | undefined {
  if (!ctx?.formatDate) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => ctx.formatDate?.(entry, item))
      .filter(Boolean)
      .join(', ')
  }

  return ctx.formatDate(value, item)
}

function renderCell(value: unknown, item: ResponseItem, ctx?: AdapterContext): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (item.nodeKind === 'enum' && item.enumRef) {
    return renderEnumValue(value, item, ctx) ?? stringifyUnknown(value)
  }

  if (
    (item.scalarType === 'date' ||
      item.scalarType === 'date-time' ||
      item.scalarType === 'time') &&
    ctx?.formatDate
  ) {
    return renderTemporalValue(value, item, ctx) ?? stringifyUnknown(value)
  }

  if (item.nodeKind === 'object') {
    return stringifyUnknown(value)
  }

  return stringifyUnknown(value)
}

export function toAntdTableColumns(
  responseSchema: ResponseItem[],
  ctx?: AdapterContext,
): AntdTableColumn[] {
  return responseSchema.flatMap((item) => {
      if (item.nodeKind === 'object' && resolveObjectMode(item, ctx) === 'skip') {
        return []
      }

      const uiProps = readUiProps(item)
      const column: AntdTableColumn = {
        key: item.key || resolveDataPath(item),
        dataIndex: resolveAntdDataIndex(item),
        title: resolveLabel(item, ctx),
        sorter: item.container === 'single' && isNumericScalarType(item.scalarType),
        ellipsis: true,
        align:
          item.container === 'single' && isNumericScalarType(item.scalarType)
            ? 'right'
            : undefined,
        customRender: ({ text }: { text: unknown; record: Record<string, unknown> }) =>
          renderCell(text, item, ctx),
        ...(uiProps ?? {}),
        schema: item,
      }
      return [column]
    })
}

export function toVxeTableColumns(
  responseSchema: ResponseItem[],
  ctx?: AdapterContext,
): VxeTableColumnLike[] {
  return responseSchema.flatMap((item) => {
      if (item.nodeKind === 'object' && resolveObjectMode(item, ctx) === 'skip') {
        return []
      }

      const uiProps = readUiProps(item)
      const column: VxeTableColumnLike = {
        field: resolveDataPath(item),
        title: resolveLabel(item, ctx),
        sortable: item.container === 'single' && isNumericScalarType(item.scalarType),
        align:
          item.container === 'single' && isNumericScalarType(item.scalarType)
            ? 'right'
            : undefined,
        formatter: ({ cellValue }: { cellValue: unknown; row: Record<string, unknown> }) =>
          renderCell(cellValue, item, ctx),
        ...(uiProps ?? {}),
        schema: item,
      }
      return [column]
    })
}

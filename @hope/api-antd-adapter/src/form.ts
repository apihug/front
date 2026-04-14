import type {
  RequestItem,
  SchemaEnumMeta,
  SchemaEnumRef,
  SchemaScalarType,
  SchemaValidation,
} from '@hope/api'

import type {
  AdapterContext,
  AdapterFormComponent,
  AntdFormField,
  AntdFormRule,
  AntdSelectOption,
  EnumLabelPolicy,
  VbenFormRuleLike,
  VbenFormSchemaLike,
  VbenValueFormatLike,
} from './types'

import { z } from 'zod'

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

function resolveHelpText(item: RequestItem): string | undefined {
  if (!item.title || !item.description) {
    return undefined
  }
  return item.title === item.description ? undefined : item.description
}

function parseNumber(value?: null | string): number | undefined {
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

function isNumericScalarType(scalarType: SchemaScalarType): boolean {
  return [
    'integer',
    'long',
    'float',
    'double',
    'decimal',
    'number',
  ].includes(scalarType)
}

function isIntegerScalarType(scalarType: SchemaScalarType): boolean {
  return scalarType === 'integer' || scalarType === 'long'
}

function isStringScalarType(scalarType: SchemaScalarType): boolean {
  return [
    'string',
    'date',
    'date-time',
    'email',
    'time',
    'uuid',
  ].includes(scalarType)
}

function isSelectLikeComponent(component: AdapterFormComponent): boolean {
  return ['DatePicker', 'RangePicker', 'Select', 'TimePicker'].includes(component)
}

function isTagArrayScalar(item: RequestItem): boolean {
  return (
    item.container === 'array' &&
    item.nodeKind === 'scalar' &&
    ['string', 'email', 'uuid'].includes(item.scalarType)
  )
}

function hasCustomWidget(item: RequestItem): boolean {
  return typeof item.ui?.widget === 'string' && item.ui.widget.trim().length > 0
}

function readUiProps(item: RequestItem): Record<string, unknown> | undefined {
  const props = item.ui?.props
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    return undefined
  }
  return props as Record<string, unknown>
}

function resolveObjectMode(item: RequestItem, ctx?: AdapterContext) {
  if (item.objectMode && item.objectMode !== 'manual') {
    return item.objectMode
  }
  if (ctx?.objectMode) {
    return ctx.objectMode
  }
  return DEFAULT_CONTEXT.objectMode
}

function usesJsonEditor(item: RequestItem, ctx?: AdapterContext): boolean {
  if (hasCustomWidget(item)) {
    return false
  }
  if (item.nodeKind === 'object') {
    return resolveObjectMode(item, ctx) === 'json'
  }
  return item.container === 'array' && !isTagArrayScalar(item) && item.nodeKind !== 'enum' && item.nodeKind !== 'file'
}

function resolveComponent(item: RequestItem, ctx?: AdapterContext): AdapterFormComponent {
  if (hasCustomWidget(item)) {
    return item.ui!.widget as AdapterFormComponent
  }
  if (item.nodeKind === 'file') {
    return 'Upload'
  }
  if (item.nodeKind === 'enum') {
    return 'Select'
  }
  if (usesJsonEditor(item, ctx)) {
    return 'Textarea'
  }
  if (isTagArrayScalar(item)) {
    return 'Select'
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

function resolveJsonPlaceholder(item: RequestItem): string {
  return item.container === 'array'
    ? `JSON Array<${item.tsType}>`
    : `JSON: ${item.tsType}`
}

function mergeProps(
  base?: Record<string, unknown>,
  extension?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const merged = {
    ...(base ?? {}),
    ...(extension ?? {}),
  }
  return Object.keys(merged).length > 0 ? merged : undefined
}

function resolveComponentProps(
  item: RequestItem,
  component: AdapterFormComponent,
  ctx?: AdapterContext,
): Record<string, unknown> | undefined {
  const props: Record<string, unknown> = {}
  const uiProps = readUiProps(item)

  if (component === 'Select') {
    if (item.enumRef) {
      props.options = toEnumOptions(item.enumRef, ctx)
    }
    if (item.container === 'array' && uiProps?.mode === undefined) {
      props.mode = item.enumRef ? 'multiple' : 'tags'
    }
  }

  if (component === 'Upload') {
    props.beforeUpload = () => false
    props.maxCount = item.container === 'array' ? undefined : 1
    if (item.container === 'array' && uiProps?.multiple === undefined) {
      props.multiple = true
    }
  }

  if (
    (component === 'DatePicker' ||
      component === 'RangePicker' ||
      component === 'TimePicker') &&
    item.dateFormat
  ) {
    props.format = item.dateFormat
    props.valueFormat = item.dateFormat
  }

  if (usesJsonEditor(item, ctx)) {
    props.autoSize = { minRows: 3, maxRows: 10 }
    props.placeholder = resolveJsonPlaceholder(item)
  }

  return mergeProps(props, uiProps)
}

function buildRules(item: RequestItem, label: string): AntdFormRule[] {
  const rules: AntdFormRule[] = []
  const validation = item.validation
  const arrayMin =
    validation?.minItems ?? (item.required && (item.container === 'array' || item.nodeKind === 'file') ? 1 : undefined)

  if (arrayMin !== undefined || validation?.maxItems !== undefined) {
    rules.push({
      type: 'array',
      min: arrayMin,
      max: validation?.maxItems,
      message:
        arrayMin === 1 && validation?.maxItems === undefined
          ? `${label} is required`
          : `${label} item count is out of range`,
    })
  } else if (item.required) {
    rules.push({ required: true, message: `${label} is required` })
  }

  if (!validation) {
    return rules
  }

  if (item.scalarType === 'email' || validation.email) {
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

  const minimum = parseNumber(validation.minimum)
  const maximum = parseNumber(validation.maximum)
  const decimalMin = parseNumber(validation.decimalMin)
  const decimalMax = parseNumber(validation.decimalMax)
  if (
    minimum !== undefined ||
    maximum !== undefined ||
    decimalMin !== undefined ||
    decimalMax !== undefined
  ) {
    rules.push({
      type: 'number',
      min: minimum ?? decimalMin,
      max: maximum ?? decimalMax,
      message: `${label} value is out of range`,
    })
  }

  const pattern = parsePattern(validation.pattern)
  if (pattern) {
    rules.push({ pattern, message: `${label} format is invalid` })
  }

  return rules
}

function hasExtendedValidation(validation?: SchemaValidation): boolean {
  if (!validation) {
    return false
  }
  return [
    validation.multipleOf,
    validation.maximum,
    validation.minimum,
    validation.decimalMax,
    validation.decimalMin,
    validation.digitsInteger,
    validation.digitsFraction,
    validation.maxLength,
    validation.minLength,
    validation.maxItems,
    validation.minItems,
    validation.pattern,
    validation.timeConstraintType,
  ].some((value) => value !== undefined && value !== null && value !== '')
}

function buildEnumValueSchema(item: RequestItem, label: string) {
  const enumValues = Object.keys(item.enumRef ?? {})
  if (enumValues.length === 0) {
    return z
      .string({
        invalid_type_error: `${label} is invalid`,
        required_error: `${label} is required`,
      })
      .min(1, { message: `${label} is required` })
  }
  return z.enum(enumValues as [string, ...string[]], {
    invalid_type_error: `${label} is invalid`,
    required_error: `${label} is required`,
  })
}

function applyStringValidation(
  rule: z.ZodString,
  item: RequestItem,
  label: string,
) {
  let nextRule = rule
  const validation = item.validation

  if (item.required) {
    nextRule = nextRule.min(1, { message: `${label} is required` })
  }

  if (item.scalarType === 'email' || validation?.email) {
    nextRule = nextRule.email({ message: `${label} is invalid` })
  }

  if (item.scalarType === 'uuid') {
    nextRule = nextRule.uuid({ message: `${label} is invalid` })
  }

  if (validation?.minLength !== undefined) {
    nextRule = nextRule.min(validation.minLength, {
      message: `${label} length is out of range`,
    })
  }

  if (validation?.maxLength !== undefined) {
    nextRule = nextRule.max(validation.maxLength, {
      message: `${label} length is out of range`,
    })
  }

  const pattern = parsePattern(validation?.pattern)
  if (pattern) {
    nextRule = nextRule.regex(pattern, { message: `${label} format is invalid` })
  }

  return nextRule
}

function applyNumberValidation(
  rule: z.ZodNumber,
  item: RequestItem,
  label: string,
) {
  let nextRule = rule
  const validation = item.validation
  const minimum = parseNumber(validation?.minimum) ?? parseNumber(validation?.decimalMin)
  const maximum = parseNumber(validation?.maximum) ?? parseNumber(validation?.decimalMax)

  if (isIntegerScalarType(item.scalarType)) {
    nextRule = nextRule.int({ message: `${label} must be an integer` })
  }

  if (minimum !== undefined) {
    nextRule = validation?.exclusiveMinimum
      ? nextRule.gt(minimum, { message: `${label} value is out of range` })
      : nextRule.min(minimum, { message: `${label} value is out of range` })
  }

  if (maximum !== undefined) {
    nextRule = validation?.exclusiveMaximum
      ? nextRule.lt(maximum, { message: `${label} value is out of range` })
      : nextRule.max(maximum, { message: `${label} value is out of range` })
  }

  const multipleOf = parseNumber(validation?.multipleOf)
  if (multipleOf !== undefined) {
    nextRule = nextRule.multipleOf(multipleOf, {
      message: `${label} value is out of range`,
    })
  }

  if (
    validation?.digitsInteger !== undefined ||
    validation?.digitsFraction !== undefined
  ) {
    return nextRule.refine((value: number) => {
      const [integerPart = '', fractionPart = ''] = `${Math.abs(value)}`.split('.')
      if (
        validation?.digitsInteger !== undefined &&
        integerPart.length > validation.digitsInteger
      ) {
        return false
      }
      if (
        validation?.digitsFraction !== undefined &&
        fractionPart.length > validation.digitsFraction
      ) {
        return false
      }
      return true
    }, `${label} value is out of range`)
  }

  return nextRule
}

function applyTimeConstraint(
  value: string,
  timeConstraintType?: string,
) {
  if (!timeConstraintType) {
    return true
  }

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return false
  }

  const now = Date.now()
  switch (timeConstraintType) {
    case 'FUTURE':
      return timestamp > now
    case 'FUTURE_OR_PRESENT':
      return timestamp >= now
    case 'PAST':
      return timestamp < now
    case 'PAST_OR_PRESENT':
      return timestamp <= now
    default:
      return true
  }
}

function applyArrayValidation<T extends z.ZodTypeAny>(
  rule: z.ZodArray<T>,
  item: RequestItem,
  label: string,
): z.ZodArray<T> {
  let nextRule = rule
  const validation = item.validation
  const minimum = validation?.minItems ?? (item.required ? 1 : undefined)

  if (minimum !== undefined) {
    nextRule = nextRule.min(minimum, {
      message:
        minimum === 1 && validation?.maxItems === undefined
          ? `${label} is required`
          : `${label} item count is out of range`,
    })
  }

  if (validation?.maxItems !== undefined) {
    nextRule = nextRule.max(validation.maxItems, {
      message: `${label} item count is out of range`,
    })
  }

  return nextRule
}

function optionalizeRule(rule: z.ZodTypeAny) {
  return z.preprocess((value: unknown) => {
    if (value === '' || value === null) {
      return undefined
    }
    return value
  }, rule.optional())
}

function buildJsonSchemaRule(item: RequestItem, label: string) {
  const arrayValueRule =
    item.container === 'array'
      ? applyArrayValidation(
          z.array(
            buildScalarValueRule({
              ...item,
              container: 'single',
            }, label),
          ),
          item,
          label,
        )
      : null

  const baseRule = z
    .string({
      invalid_type_error: `${label} must be valid JSON`,
      required_error: `${label} is required`,
    })
    .superRefine((value: string, refineContext: z.RefinementCtx) => {
      const trimmed = value.trim()
      if (!trimmed) {
        if (item.required) {
          refineContext.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} is required`,
          })
        }
        return
      }

      let parsedValue: unknown
      try {
        parsedValue = JSON.parse(trimmed)
      } catch {
        refineContext.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be valid JSON`,
        })
        return
      }

      if (item.container === 'array') {
        if (!Array.isArray(parsedValue)) {
          refineContext.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} must be a JSON array`,
          })
          return
        }
        if (arrayValueRule) {
          const parsedResult = arrayValueRule.safeParse(parsedValue)
          if (!parsedResult.success) {
            for (const issue of parsedResult.error.issues) {
              refineContext.addIssue({
                code: z.ZodIssueCode.custom,
                message: issue.message,
                path: issue.path,
              })
            }
          }
        }
        return
      }

      if (
        parsedValue === null ||
        typeof parsedValue !== 'object' ||
        Array.isArray(parsedValue)
      ) {
        refineContext.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a JSON object`,
        })
      }
    })

  return item.required ? baseRule : optionalizeRule(baseRule)
}

function buildUploadSchemaRule(item: RequestItem, label: string) {
  let uploadRule = z.array(z.unknown())

  if (item.container !== 'array') {
    uploadRule = uploadRule.max(1, {
      message: `${label} accepts only one file`,
    })
  }

  uploadRule = applyArrayValidation(uploadRule, item, label)
  return item.required ? uploadRule : optionalizeRule(uploadRule)
}

function buildTemporalStringSchema(item: RequestItem, label: string) {
  let rule = applyStringValidation(
    z.string({
      invalid_type_error: `${label} is invalid`,
      required_error: `${label} is required`,
    }),
    item,
    label,
  )

  const timeConstraintType = item.validation?.timeConstraintType
  if (timeConstraintType && item.scalarType !== 'time') {
    return rule.refine(
      (value: string) => applyTimeConstraint(value, timeConstraintType),
      `${label} is invalid`,
    )
  }

  return rule
}

function buildScalarValueRule(item: RequestItem, label: string) {
  if (item.nodeKind === 'enum') {
    return buildEnumValueSchema(item, label)
  }

  if (item.nodeKind === 'file') {
    return buildUploadSchemaRule(item, label)
  }

  if (item.nodeKind === 'object') {
    return z.any()
  }

  if (item.scalarType === 'boolean') {
    let rule = z.boolean({
      invalid_type_error: `${label} is invalid`,
      required_error: `${label} is required`,
    })

    if (item.validation?.assertable !== undefined) {
      return rule.refine(
        (value: boolean) => value === item.validation?.assertable,
        `${label} is invalid`,
      )
    }

    return rule
  }

  if (isNumericScalarType(item.scalarType)) {
    return applyNumberValidation(
      z.number({
        invalid_type_error: `${label} must be a number`,
        required_error: `${label} is required`,
      }),
      item,
      label,
    )
  }

  if (item.scalarType === 'date' || item.scalarType === 'date-time' || item.scalarType === 'time') {
    return buildTemporalStringSchema(item, label)
  }

  if (isStringScalarType(item.scalarType)) {
    return applyStringValidation(
      z.string({
        invalid_type_error: `${label} is invalid`,
        required_error: `${label} is required`,
      }),
      item,
      label,
    )
  }

  return applyStringValidation(
    z.string({
      invalid_type_error: `${label} is invalid`,
      required_error: `${label} is required`,
    }),
    item,
    label,
  )
}

function buildZodRule(
  item: RequestItem,
  label: string,
  ctx?: AdapterContext,
) {
  if (
    usesJsonEditor(item, ctx)
  ) {
    return buildJsonSchemaRule(item, label)
  }

  if (item.nodeKind === 'file') {
    return buildUploadSchemaRule(item, label)
  }

  const baseValueRule = buildScalarValueRule(item, label)
  const valueRule =
    item.container === 'array'
      ? applyArrayValidation(z.array(baseValueRule), item, label)
      : baseValueRule

  if (item.required) {
    return valueRule
  }

  return optionalizeRule(valueRule)
}

function shouldUseZodRule(
  item: RequestItem,
  ctx?: AdapterContext,
) {
  if (item.nodeKind === 'file') {
    return true
  }

  if (item.container === 'array') {
    return true
  }

  if (
    usesJsonEditor(item, ctx)
  ) {
    return true
  }

  if (item.scalarType === 'email' || item.scalarType === 'uuid') {
    return true
  }

  return hasExtendedValidation(item.validation)
}

function buildVbenRule(
  item: RequestItem,
  component: AdapterFormComponent,
  label: string,
  ctx?: AdapterContext,
): VbenFormRuleLike | undefined {
  if (!item.required && !shouldUseZodRule(item, ctx)) {
    return undefined
  }

  if (!shouldUseZodRule(item, ctx)) {
    return isSelectLikeComponent(component) ? 'selectRequired' : 'required'
  }

  return buildZodRule(item, label, ctx)
}

function normalizeUploadFileEntry(value: unknown) {
  if (!value || typeof value !== 'object') {
    return value
  }

  const entry = value as Record<string, unknown>
  const originFile = entry.originFileObj
  return originFile ?? value
}

function buildValueFormat(
  item: RequestItem,
  component: AdapterFormComponent,
  ctx?: AdapterContext,
): VbenValueFormatLike | undefined {
  if (component === 'Upload' && !hasCustomWidget(item)) {
    return (value) => {
      const normalizedList = Array.isArray(value)
        ? value.map(normalizeUploadFileEntry).filter(Boolean)
        : []

      if (normalizedList.length === 0) {
        return undefined
      }

      return item.container === 'array' ? normalizedList : normalizedList[0]
    }
  }

  if (
    usesJsonEditor(item, ctx)
  ) {
    return (value) => {
      if (typeof value !== 'string') {
        return value
      }

      const trimmed = value.trim()
      if (!trimmed) {
        return undefined
      }

      return JSON.parse(trimmed)
    }
  }

  return undefined
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

export function toAntdFormFields(
  requestSchema: RequestItem[],
  ctx?: AdapterContext,
): AntdFormField[] {
  return requestSchema
    .map((item) => {
      if (item.nodeKind === 'object' && resolveObjectMode(item, ctx) === 'skip') {
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
  return requestSchema.flatMap((item) => {
      if (item.nodeKind === 'object' && resolveObjectMode(item, ctx) === 'skip') {
        return []
      }

      const label = resolveLabel(item, ctx)
      const component = resolveComponent(item, ctx)

      const schema: VbenFormSchemaLike = {
        fieldName: item.key || item.name,
        label,
        component,
        required: item.required,
        componentProps: resolveComponentProps(item, component, ctx),
        help: resolveHelpText(item),
        rules: buildVbenRule(item, component, label, ctx),
        valueFormat: buildValueFormat(item, component, ctx),
      }
      return [schema]
    })
}

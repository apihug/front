/**
 * @hope/api-core - Shared Type Definitions
 *
 * 所有服务包共享的通用类型定义
 */

// ============================================================================
// Error Types - 错误处理相关
// ============================================================================

export interface ProblemPhaseType {
  readonly code: 1 | 2 | 4
  readonly title: 'CONTROLLER' | 'SERVICE' | 'DOMAIN'
  readonly description: 'Controller' | 'Service' | 'Domain'
  readonly description2: '表单层' | '服务层' | '领域层'
}

export interface ProblemSeverityType {
  readonly code: 1 | 2 | 4 | 8
  readonly title: 'LOW' | 'WARN' | 'ERROR' | 'FATAL'
  readonly description: 'Low' | 'Warn' | 'Error' | 'Fatal'
  readonly description2: '低,无影响' | '警告,业务错误可重试' | '错误,业务无法进行' | '灾难,数据破坏'
}

export interface ProblemPhase {
  readonly CONTROLLER: ProblemPhaseType
  readonly SERVICE: ProblemPhaseType
  readonly DOMAIN: ProblemPhaseType
}

export interface ProblemSeverity {
  readonly LOW: ProblemSeverityType
  readonly WARN: ProblemSeverityType
  readonly ERROR: ProblemSeverityType
  readonly FATAL: ProblemSeverityType
}

export type ProblemPhaseKey = keyof ProblemPhase
export type ProblemSeverityKey = keyof ProblemSeverity

/**
 * Error
 * 错误对象
 */
export interface ApiError {
  /**
   * @description error code, 错误码
   * @format int32
   * @example 1000001001
   */
  code: number

  /**
   * @description error title, 错误标题
   * @example "USER_NAME_EMPTY"
   */
  title: string

  /**
   * @description error description, 错误描述
   * @example "username should not be empty"
   */
  description?: string

  /**
   * @description error description2, 错误描述(第二语言)
   * @example "用户名不可以为空"
   */
  description2?: string

  /**
   * @description whether this error is deprecated
   * @example true|false
   */
  deprecated?: boolean

  /**
   * @description field name, 字段
   * @example "name"
   */
  field?: string

  /**
   * @description field path, 字段路径
   * @example "user.name"
   */
  path?: string

  /**
   * @description input value(which rejected),输入值(被拒绝的)
   * @example "Jake.Bush"
   */
  rejectedValue?: string

  /**
   * @description tips, 使用提示
   * @example "价格必须是正数:1000.12"
   */
  tips?: string

  /**
   * @description constraint rule, 校验规则
   * @example "POSITIVE|NOT_EMPTY|REG_EXP"
   */
  constraint?: string

  /**
   * @description phase of the error thrown, 错误阶段
   * @example "DOMAIN:表示在领域层"
   */
  phase?: ProblemPhaseKey

  /**
   * @description severity of the error, 错误程度
   * @example "ERROR: 表示业务中断"
   */
  severity?: ProblemSeverityKey

  /**
   * @description business domain, 领域
   * @example "order"
   */
  domain?: string

  /**
   * @description 其他属性(KV), flat to normal fields refer to the problem details of hope/spring
   * @example "扩展属性, Key-Value 对"
   */
  properties?: Record<string, any>

  /**
   * @description status of the http response
   * @example "200,401"
   */
  httpStatus?: number
}

/**
 * List of errors
 * 错误对象列表
 */
export type ApiErrors = ApiError[]

// ============================================================================
// Response Types - 响应结构相关
// ============================================================================

export interface ResponseBody<T = any> {
  code: number
  data?: T
  message: string
  errors?: ApiError[]
}

interface ResponseMap {
  blob: Blob
  text: string
  arrayBuffer: ArrayBuffer
  stream: ReadableStream<Uint8Array>
  document: Document
}
export type ResponseType = keyof ResponseMap | 'json'

// ============================================================================
// Pagination Types - 分页相关
// ============================================================================

/**
 * 分页查询对象
 * Page request parameters
 */
export interface PageRequest {
  /**
   * @description Zero-based page index (0..N)
   * @example 42
   */
  page: number

  /**
   * @description The size of the page to be returned, default 20, max: 1024
   * @example 10
   */
  size: number

  /**
   * @description infinite scroll load this is the last offset if any key specific
   * @example "101234"
   */
  offset?: string

  /**
   * @description `Sorting criteria in the format: property,(asc|desc). Default sort order is ascending. Multiple sort criteria are supported.`
   * @example `id,desc`
   */
  sort?: string[]
}

/**
 * 分页数据集
 */
export interface PageableResult<T> {
  /**
   * @description page index, 当前页码 (from Zero 0)
   */
  pageIndex: number

  /**
   * @description page size, 本页对象数量
   */
  pageSize: number

  /**
   * @description total count, 总数
   */
  totalCount: number

  /**
   * @description total page number, 总页数
   */
  totalPage: number

  /**
   * @description data payload 数据集
   */
  data: T[]
}

// ============================================================================
// Schema Types - 动态表单/表格元数据
// ============================================================================

export type SchemaNodeKind = 'scalar' | 'enum' | 'object' | 'file'

export type SchemaContainer = 'single' | 'array'

export type SchemaScalarType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'integer'
  | 'long'
  | 'float'
  | 'double'
  | 'decimal'
  | 'date'
  | 'date-time'
  | 'time'
  | 'email'
  | 'uuid'
  | 'binary'
  | 'unknown'

export type SchemaFieldSource =
  | 'body'
  | 'query'
  | 'path'
  | 'header'
  | 'cookie'
  | 'session'
  | 'response'

export interface SchemaEnumMeta {
  code?: number | string
  description?: string
  description2?: string
  deprecated?: boolean
  [key: string]: any
}

export type SchemaEnumRef = Record<string, SchemaEnumMeta>

export interface SchemaValidation {
  multipleOf?: string
  maximum?: string
  minimum?: string
  exclusiveMaximum?: boolean
  exclusiveMinimum?: boolean
  decimalMax?: string
  decimalMin?: string
  digitsInteger?: number
  digitsFraction?: number
  assertable?: boolean
  maxLength?: number
  minLength?: number
  pattern?: string
  email?: boolean
  maxItems?: number
  minItems?: number
  timeConstraintType?: string
}

/**
 * Framework-neutral UI hints.
 * Adapter modules (e.g. @hope/api-antd-adapter) can interpret this object.
 */
export interface SchemaUiHint {
  widget?: string
  props?: Record<string, any>
  [key: string]: any
}

/**
 * Request field schema for dynamic form generation.
 *
 * This metadata is framework-agnostic by design. Do not mix AntD/Vben-specific
 * runtime structures directly into this contract.
 */
export interface RequestItem {
  key: string
  /**
   * Alias of key for backward readability. Keep generated value same as key.
   */
  name: string
  i18key: string
  description?: string
  title?: string
  source?: Exclude<SchemaFieldSource, 'response'>
  nodeKind: SchemaNodeKind
  scalarType: SchemaScalarType
  tsType: string
  container: SchemaContainer
  required?: boolean
  format?: string
  dateFormat?: string
  enumRef?: SchemaEnumRef
  /**
   * OBJECT kind rendering strategy.
   * - manual: require custom renderer
   * - json: treat as JSON editor/text area
   */
  objectMode?: 'json' | 'manual'
  validation?: SchemaValidation
  ui?: SchemaUiHint
}

/**
 * Response field schema for list/table/detail rendering.
 */
export interface ResponseItem {
  key: string
  /**
   * Alias used by AntD/Vben table ecosystems.
   */
  dataIndex: string
  path?: string
  i18key: string
  description?: string
  title?: string
  source?: 'response'
  nodeKind: SchemaNodeKind
  scalarType: SchemaScalarType
  tsType: string
  container: SchemaContainer
  format?: string
  dateFormat?: string
  enumRef?: SchemaEnumRef
  objectMode?: 'json' | 'manual'
  ui?: SchemaUiHint
}

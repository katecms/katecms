import {
  BinaryOperationNode,
  ColumnNode,
  ColumnUpdateNode,
  IdentifierNode,
  InsertQueryNode,
  OperationNodeTransformer,
  PrimitiveValueListNode,
  ReferenceNode,
  ValueNode,
} from 'kysely'
import type {
  KyselyPlugin,
  OperationNode,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  RootOperationNode,
  UnknownRow,
} from 'kysely'

const JSON_COLUMNS = new Set([
  'avatar',
  'fields',
  'blocks',
  'value',
  'data',
  'variants',
])

const TIMESTAMP_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'published_at',
  'applied_at',
])

function readColumnName(node: OperationNode | undefined): string | undefined {
  if (!node) {
    return undefined
  }
  if (ColumnNode.is(node)) {
    return node.column.name
  }
  if (IdentifierNode.is(node)) {
    return node.name
  }
  if (ReferenceNode.is(node) && ColumnNode.is(node.column)) {
    return node.column.column.name
  }
  return undefined
}

function findInsertColumns(stack: readonly OperationNode[]): string[] | undefined {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const node = stack[index]
    if (node && InsertQueryNode.is(node)) {
      return node.columns?.map(column => column.column.name)
    }
  }
  return undefined
}

class ColumnValueTransformer extends OperationNodeTransformer {
  readonly #serialize: (column: string, value: unknown) => unknown

  constructor(serialize: (column: string, value: unknown) => unknown) {
    super()
    this.#serialize = serialize
  }

  protected override transformPrimitiveValueList(
    node: PrimitiveValueListNode,
  ): PrimitiveValueListNode {
    const columns = findInsertColumns(this.nodeStack)
    if (!columns?.length) {
      return node
    }
    return PrimitiveValueListNode.create(
      node.values.map((value, index) => this.#serialize(columns[index] ?? '', value)),
    )
  }

  protected override transformValue(node: ValueNode): ValueNode {
    const parent = this.nodeStack[this.nodeStack.length - 2]
    let column: string | undefined
    if (parent && ColumnUpdateNode.is(parent)) {
      column = readColumnName(parent.column)
    }
    else if (parent && BinaryOperationNode.is(parent)) {
      column = readColumnName(parent.leftOperand)
    }
    if (!column) {
      return node
    }
    return ValueNode.create(this.#serialize(column, node.value))
  }
}

function serializeSqliteValue(column: string, value: unknown): unknown {
  if (value == null) {
    return value
  }
  if (JSON_COLUMNS.has(column)) {
    return JSON.stringify(value)
  }
  if (TIMESTAMP_COLUMNS.has(column) && value instanceof Date) {
    return value.toISOString()
  }
  if (column === 'autoload' && typeof value === 'boolean') {
    return value ? 1 : 0
  }
  return value
}

function parseSqliteValue(column: string, value: unknown): unknown {
  if (value == null) {
    return value
  }
  if (JSON_COLUMNS.has(column) && typeof value === 'string') {
    try {
      return JSON.parse(value)
    }
    catch {
      return value
    }
  }
  if (TIMESTAMP_COLUMNS.has(column) && typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date
  }
  if (column === 'autoload') {
    return value === true || value === 1 || value === '1'
  }
  return value
}

function parseSqliteRow(row: UnknownRow): UnknownRow {
  const parsed: UnknownRow = { ...row }
  for (const [column, value] of Object.entries(row)) {
    parsed[column] = parseSqliteValue(column, value)
  }
  return parsed
}

/** JSON text, ISO dates, and 0/1 booleans ↔ the shared Kysely `Database` types. */
export class SqliteValuePlugin implements KyselyPlugin {
  readonly #transformer = new ColumnValueTransformer(serializeSqliteValue)

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    return this.#transformer.transformNode(args.node) as RootOperationNode
  }

  async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return {
      ...args.result,
      rows: args.result.rows.map(row => parseSqliteRow(row)),
    }
  }
}

function serializePostgresValue(column: string, value: unknown): unknown {
  if (value == null) {
    return value
  }
  if (JSON_COLUMNS.has(column)) {
    return JSON.stringify(value)
  }
  return value
}

/** JSON.stringify every jsonb bind so `pg` never sends arrays/primitives as SQL types. */
export class PostgresJsonPlugin implements KyselyPlugin {
  readonly #transformer = new ColumnValueTransformer(serializePostgresValue)

  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    return this.#transformer.transformNode(args.node) as RootOperationNode
  }

  async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return args.result
  }
}

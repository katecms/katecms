import { describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import type {
  ActualFieldIndex,
  Database,
  DesiredFieldIndex,
  Field,
  IndexSyncDiff,
} from '../src/core'
import {
  applyFieldIndexDiff,
  buildCreateIndexSql,
  buildDropIndexSql,
  buildIndexExpression,
  buildIndexName,
  collectDesiredFieldIndexes,
  computeIndexDiff,
  indexDefinitionsMatch,
  isManagedFieldIndexName,
} from '../src/core'

describe('field index definitions', () => {
  it('builds partial expression indexes from indexed scalar fields', () => {
    const { desired, warnings } = collectDesiredFieldIndexes({
      products: {
        labels: { name: 'Products' },
        fields: {
          price: { label: 'Price', type: 'number', indexed: true },
          color: { label: 'Color', type: 'text', indexed: true },
          thumbnail: { label: 'Thumb', type: 'image', indexed: true } as Field,
        },
      },
    })

    expect(warnings).toHaveLength(1)
    expect(desired).toHaveLength(2)
    expect(buildIndexName('products', 'price')).toBe('collections_fld__products__price_idx')
    expect(buildIndexExpression('price', 'number')).toBe('((fields->>\'price\')::numeric)')
    expect(buildCreateIndexSql(desired[0]!)).toBe(
      'CREATE INDEX IF NOT EXISTS collections_fld__products__price_idx ON collections (((fields->>\'price\')::numeric)) WHERE type = \'products\'',
    )
  })

  it('detects missing indexes to create', () => {
    const desired: DesiredFieldIndex[] = [{
      collectionSlug: 'products',
      fieldName: 'price',
      fieldPath: ['price'],
      fieldType: 'number',
      indexName: 'collections_fld__products__price_idx',
      expression: '((fields->>\'price\')::numeric)',
    }]
    const actual: ActualFieldIndex[] = []

    const diff = computeIndexDiff(desired, actual)
    expect(diff.hasChanges).toBe(true)
    expect(diff.toCreate).toHaveLength(1)
    expect(diff.changes).toHaveLength(1)
    expect(diff.changes[0]?.action).toBe('create')
  })

  it('detects obsolete indexes to drop', () => {
    const desired: DesiredFieldIndex[] = []
    const actual: ActualFieldIndex[] = [{
      indexName: 'collections_fld__products__price_idx',
      indexDef: 'CREATE INDEX collections_fld__products__price_idx ON public.collections USING btree (((fields ->> \'price\'::text))::numeric) WHERE (type = \'products\'::text)',
    }]

    const diff = computeIndexDiff(desired, actual)
    expect(diff.hasChanges).toBe(true)
    expect(diff.toDrop).toHaveLength(1)
    expect(diff.changes[0]?.action).toBe('drop')
  })

  it('recreates indexes when the expression changes', () => {
    const desired: DesiredFieldIndex[] = [{
      collectionSlug: 'products',
      fieldName: 'price',
      fieldPath: ['price'],
      fieldType: 'number',
      indexName: 'collections_fld__products__price_idx',
      expression: '((fields->>\'price\')::numeric)',
    }]
    const actual: ActualFieldIndex[] = [{
      indexName: 'collections_fld__products__price_idx',
      indexDef: 'CREATE INDEX collections_fld__products__price_idx ON public.collections USING btree ((fields ->> \'price\'::text)) WHERE (type = \'products\'::text)',
    }]

    const diff = computeIndexDiff(desired, actual)
    expect(diff.hasChanges).toBe(true)
    expect(diff.changes.map(change => change.action)).toEqual(['drop', 'create'])
  })

  it('matches equivalent PostgreSQL index definitions', () => {
    const expected = '((fields->>\'price\')::numeric)'
    const actual = 'CREATE INDEX collections_fld__products__price_idx ON public.collections USING btree (((fields ->> \'price\'::text))::numeric) WHERE (type = \'products\'::text)'
    expect(indexDefinitionsMatch(actual, expected)).toBe(true)
  })

  it('does not treat schema indexes as managed field indexes', () => {
    expect(isManagedFieldIndexName('collections_fld__pages__price_idx')).toBe(true)
    expect(isManagedFieldIndexName('collections_status_idx')).toBe(false)
    expect(isManagedFieldIndexName('collections_author_id_idx')).toBe(false)
    expect(isManagedFieldIndexName('collections_parent_id_idx')).toBe(false)
  })

  it('names nested indexes so they cannot look like the parent field', () => {
    const { desired } = collectDesiredFieldIndexes({
      products: {
        labels: { name: 'Products' },
        fields: {
          title: { label: 'Title', type: 'text', indexed: true },
          seo: {
            type: 'group',
            label: 'SEO',
            subFields: {
              title: { label: 'SEO title', type: 'text', indexed: true },
            },
          },
        },
      },
    })
    expect(desired.map(item => item.indexName).sort()).toEqual([
      'collections_fld__products__n__seo__title_idx',
      'collections_fld__products__title_idx',
    ])
  })

  it('throws when a generated index name exceeds 63 bytes', () => {
    expect(() => collectDesiredFieldIndexes({
      very_long_collection_slug_name: {
        labels: { name: 'Long' },
        fields: {
          very_long_field_name_too: { label: 'X', type: 'text', indexed: true },
        },
      },
    })).toThrow(/63/)
  })

  it('does not drop indexes whose names core cannot parse', () => {
    const diff = computeIndexDiff([], [{
      indexName: 'collections_status_idx',
      indexDef: 'CREATE INDEX collections_status_idx ON collections (status)',
    }])
    expect(diff.hasChanges).toBe(false)
    expect(diff.toDrop).toEqual([])
  })
})

function fakeDb(log: string[]): Kysely<Database> {
  const executor = {
    transformQuery: (node: unknown) => node,
    compileQuery: (node: { sqlFragments?: string[] }) => ({
      sql: (node.sqlFragments ?? []).join(''),
      parameters: [],
    }),
    executeQuery: async (compiled: { sql: string }) => {
      log.push(compiled.sql)
      return { rows: [] }
    },
    withPlugins() {
      return executor
    },
  }
  const trx = { getExecutor: () => executor }
  return {
    transaction: () => ({
      execute: async <T>(fn: (inner: typeof trx) => Promise<T>) => fn(trx),
    }),
  } as unknown as Kysely<Database>
}

describe('applyFieldIndexDiff', () => {
  it('is a no-op when the diff has no changes', async () => {
    const diff: IndexSyncDiff = {
      hasChanges: false,
      toCreate: [],
      toDrop: [],
      changes: [],
    }
    const result = await applyFieldIndexDiff(null as unknown as Kysely<Database>, diff)
    expect(result).toEqual({ created: [], dropped: [] })
  })

  it('rejects SQL that was not produced by computeIndexDiff', async () => {
    const diff: IndexSyncDiff = {
      hasChanges: true,
      toCreate: [],
      toDrop: [],
      changes: [{
        indexName: 'collections_fld__products__price_idx',
        action: 'drop',
        sql: 'DROP TABLE collections',
      }],
    }
    await expect(applyFieldIndexDiff(null as unknown as Kysely<Database>, diff))
      .rejects.toThrow(/unexpected DROP INDEX/)
  })

  it('executes drop then create inside a transaction', async () => {
    const desired: DesiredFieldIndex = {
      collectionSlug: 'products',
      fieldName: 'price',
      fieldPath: ['price'],
      fieldType: 'number',
      indexName: 'collections_fld__products__price_idx',
      expression: buildIndexExpression('price', 'number'),
    }
    const diff: IndexSyncDiff = {
      hasChanges: true,
      toCreate: [desired],
      toDrop: [],
      changes: [
        {
          indexName: desired.indexName,
          action: 'drop',
          sql: buildDropIndexSql(desired.indexName),
        },
        {
          indexName: desired.indexName,
          collectionSlug: desired.collectionSlug,
          fieldName: desired.fieldName,
          fieldType: desired.fieldType,
          action: 'create',
          sql: buildCreateIndexSql(desired),
        },
      ],
    }

    const log: string[] = []
    const result = await applyFieldIndexDiff(fakeDb(log), diff)
    expect(result).toEqual({
      created: [desired.indexName],
      dropped: [desired.indexName],
    })
    expect(log[0]).toContain('pg_advisory_xact_lock')
    expect(log.slice(1)).toEqual([
      buildDropIndexSql(desired.indexName),
      buildCreateIndexSql(desired),
    ])
  })
})

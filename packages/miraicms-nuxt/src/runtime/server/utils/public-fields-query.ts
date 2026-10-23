import { fieldsQueryUsesRegexp } from '@miraicms/core'
import type { FieldsQuery } from '@miraicms/core'
import { fail } from './collections'

/**
 * Public collection and term queries accept field filters.
 * Regexp compares are rejected: a pattern bound into PostgreSQL `~` can stall the database.
 */
export function rejectPublicRegexp(query: FieldsQuery | undefined): FieldsQuery | undefined {
  if (fieldsQueryUsesRegexp(query)) {
    fail(400, 'Invalid fieldsQuery.')
  }
  return query
}

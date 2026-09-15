import { useRuntimeConfig } from '#imports'
import {
  buildFormValues,
  can,
  formatRequiredFieldsError,
  validateRequiredFields,
} from '@miraicms/core'
import type { Fields, OptionFields, OptionPageDefinition, OptionPages, RoleHolder, RoleMap } from '@miraicms/core'
import { fail, readFields } from './collections'
import type { AdminOptionMeta } from '../../utils/options'

export { fail, readFields }

export function getOptionPages(): OptionPages {
  return useRuntimeConfig().miraicms?.options ?? {}
}

export function getOptionPageDefinition(slug: string): OptionPageDefinition | undefined {
  return getOptionPages()[slug]
}

export function requireOptionPage(slug: string): OptionPageDefinition {
  const page = getOptionPageDefinition(slug)
  if (!page) {
    fail(404, 'Options page not found.')
  }
  return page
}

export function readOptionPageSlug(raw: string | undefined): string {
  const slug = typeof raw === 'string' ? raw.trim() : ''
  if (!slug) {
    fail(400, 'Options page is required.')
  }
  return slug
}

export function toOptionMeta(slug: string, def: OptionPageDefinition): AdminOptionMeta {
  return {
    slug,
    labels: {
      name: def.labels.name,
    },
    fields: def.fields ?? {},
  }
}

export function optionPageFields(fields: OptionFields | undefined): Fields {
  return (fields ?? {}) as Fields
}

export function toStoredOptionValues(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  return {}
}

export function resolveOptionValues(
  fields: Fields,
  stored: unknown,
): Record<string, unknown> {
  return {
    ...buildFormValues(fields),
    ...toStoredOptionValues(stored),
  }
}

export function requireOptionFields(fields: Fields, values: Record<string, unknown>): void {
  const issues = validateRequiredFields(fields, values)
  if (issues.length > 0) {
    fail(422, formatRequiredFieldsError(issues))
  }
}

export function optionFlags(
  actor: RoleHolder | null,
  roles: RoleMap,
  slug: string,
): { canRead: boolean, canUpdate: boolean } {
  if (!actor) {
    return { canRead: false, canUpdate: false }
  }
  return {
    canRead: can(actor, 'options', 'read', { roles, scope: slug }),
    canUpdate: can(actor, 'options', 'update', { roles, scope: slug }),
  }
}

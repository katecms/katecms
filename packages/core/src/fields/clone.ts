import type { Field, Fields } from '../config'

export interface ResolveCloneFieldsResult {
  fields: Fields
  warnings: string[]
}

function cloneValue<T>(value: T): T {
  return structuredClone(value)
}

function prefixField(field: Field, prefix: string, prefixLabel: boolean, cloneLabel: string): Field {
  const copy = cloneValue(field)
  if (prefixLabel && 'label' in copy && typeof copy.label === 'string') {
    copy.label = `${cloneLabel} ${copy.label}`
  }
  if (copy.type === 'group' && copy.subFields) {
    copy.subFields = prefixFields(copy.subFields, prefix, prefixLabel, cloneLabel)
  }
  if (copy.type === 'repeater' && copy.subFields) {
    copy.subFields = prefixFields(copy.subFields, prefix, prefixLabel, cloneLabel)
  }
  if (copy.type === 'flexible_content') {
    const layouts: typeof copy.layouts = {}
    for (const [layoutKey, layout] of Object.entries(copy.layouts ?? {})) {
      layouts[layoutKey] = {
        ...layout,
        subFields: prefixFields(layout.subFields ?? {}, prefix, prefixLabel, cloneLabel),
      }
    }
    copy.layouts = layouts
  }
  return copy
}

function prefixFields(fields: Fields, prefix: string, prefixLabel: boolean, cloneLabel: string): Fields {
  const result: Fields = {}
  for (const [key, field] of Object.entries(fields)) {
    result[`${prefix}${key}`] = prefixField(field, prefix, prefixLabel, cloneLabel)
  }
  return result
}

function lookupSource(registry: Fields, sourceKey: string): Field | undefined {
  if (sourceKey in registry) {
    return registry[sourceKey]
  }
  for (const field of Object.values(registry)) {
    if (field.type === 'group' && field.subFields) {
      const nested = lookupSource(field.subFields, sourceKey)
      if (nested) {
        return nested
      }
    }
    if ((field.type === 'tab' || field.type === 'accordion') && field.panels) {
      for (const panel of field.panels) {
        const nested = lookupSource(panel.subFields ?? {}, sourceKey)
        if (nested) {
          return nested
        }
      }
    }
  }
  return undefined
}

/**
 * Expand `clone` fields into copies of the referenced fields.
 *
 * - `prefixName: true` prefixes copied keys with `{cloneKey}_`.
 * - `display: 'group'` wraps copies in a group named after the clone field.
 * - `display: 'seamless'` (default) splices copies into the parent map.
 */
export function resolveCloneFields(fields: Fields, registry: Fields = fields): ResolveCloneFieldsResult {
  const warnings: string[] = []
  const result: Fields = {}

  for (const [key, field] of Object.entries(fields)) {
    if (field.type === 'group') {
      const nested = resolveCloneFields(field.subFields ?? {}, registry)
      warnings.push(...nested.warnings)
      result[key] = { ...field, subFields: nested.fields }
      continue
    }

    if (field.type === 'repeater') {
      const nested = resolveCloneFields(field.subFields ?? {}, registry)
      warnings.push(...nested.warnings)
      result[key] = { ...field, subFields: nested.fields }
      continue
    }

    if (field.type === 'flexible_content') {
      const layouts: NonNullable<typeof field.layouts> = {}
      for (const [layoutKey, layout] of Object.entries(field.layouts ?? {})) {
        const nested = resolveCloneFields(layout.subFields ?? {}, registry)
        warnings.push(...nested.warnings)
        layouts[layoutKey] = { ...layout, subFields: nested.fields }
      }
      result[key] = { ...field, layouts }
      continue
    }

    if (field.type === 'tab' || field.type === 'accordion') {
      const panels = (field.panels ?? []).map((panel) => {
        const nested = resolveCloneFields(panel.subFields ?? {}, registry)
        warnings.push(...nested.warnings)
        return { ...panel, subFields: nested.fields }
      })
      result[key] = { ...field, panels }
      continue
    }

    if (field.type !== 'clone') {
      result[key] = field
      continue
    }

    const copies: Fields = {}
    const prefix = field.prefixName ? `${key}_` : ''
    for (const sourceKey of field.clone) {
      const source = lookupSource(registry, sourceKey)
      if (!source) {
        warnings.push(`Clone field "${key}" references unknown field "${sourceKey}".`)
        continue
      }
      if (source.type === 'clone') {
        warnings.push(`Clone field "${key}" cannot clone another clone field "${sourceKey}".`)
        continue
      }
      const destKey = `${prefix}${sourceKey}`
      copies[destKey] = prefixField(source, prefix, field.prefixLabel === true, field.label)
    }

    if (field.display === 'group') {
      result[key] = {
        type: 'group',
        label: field.label,
        instructions: field.instructions,
        required: field.required,
        conditionalLogic: field.conditionalLogic,
        position: field.position,
        columnWidth: field.columnWidth,
        subFields: copies,
      }
      continue
    }

    for (const [destKey, copy] of Object.entries(copies)) {
      if (destKey in result) {
        warnings.push(`Clone field "${key}" skipped duplicate key "${destKey}".`)
        continue
      }
      result[destKey] = copy
    }
  }

  return { fields: result, warnings }
}

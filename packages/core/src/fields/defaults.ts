import type { Field, Fields } from '../config'
import { isLayoutOnlyFieldType } from './layout'

type PanelContainerField = Extract<Field, { type: 'tab' | 'accordion' }>
type GroupFieldConfig = Extract<Field, { type: 'group' }>

function isPanelContainerField(field: Field): field is PanelContainerField {
  return field.type === 'tab' || field.type === 'accordion'
}

/** Default value for a nested field (mirrors group/repeater seeding). */
export function createFieldDefault(field: Field): unknown {
  if (field.type === 'group') {
    return createGroupDefaults(field)
  }
  if (isPanelContainerField(field)) {
    return undefined
  }
  if (field.type === 'repeater' || field.type === 'flexible_content' || field.type === 'gallery') {
    return []
  }
  if (field.type === 'form') {
    return field.multiple ? [] : field.allowNull ? null : undefined
  }
  if ('defaultValue' in field) {
    return field.defaultValue
  }
  return undefined
}

export function createGroupDefaults(field: GroupFieldConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, subField] of Object.entries(field.subFields ?? {})) {
    if (isLayoutOnlyFieldType(subField.type)) {
      if (isPanelContainerField(subField)) {
        Object.assign(result, collectPanelDefaults(subField))
      }
      continue
    }
    result[key] = createFieldDefault(subField)
  }
  return result
}

/** Flat defaults for every subField inside tab/accordion panels. */
export function collectPanelDefaults(field: PanelContainerField): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const panel of field.panels ?? []) {
    for (const [key, subField] of Object.entries(panel.subFields ?? {})) {
      if (isLayoutOnlyFieldType(subField.type)) {
        if (isPanelContainerField(subField)) {
          Object.assign(result, collectPanelDefaults(subField))
        }
        continue
      }
      result[key] = createFieldDefault(subField)
    }
  }
  return result
}

/** All value keys owned by a panel container (not the container key itself). */
export function collectPanelKeys(field: PanelContainerField): string[] {
  return Object.keys(collectPanelDefaults(field))
}

/**
 * Ensure a group object has defaults for real subfields and hoisted panel keys.
 * Layout-only keys (`tab` / `accordion` / …) are never stored on the group.
 */
export function ensureGroupDefaults(
  value: unknown,
  field: GroupFieldConfig,
): Record<string, unknown> {
  const current = value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
  let changed = !value || typeof value !== 'object' || Array.isArray(value)

  for (const [key, subField] of Object.entries(field.subFields ?? {})) {
    if (isLayoutOnlyFieldType(subField.type)) {
      if (key in current) {
        Reflect.deleteProperty(current, key)
        changed = true
      }
      if (isPanelContainerField(subField)) {
        for (const [panelKey, panelDefault] of Object.entries(collectPanelDefaults(subField))) {
          if (!(panelKey in current)) {
            current[panelKey] = panelDefault
            changed = true
          }
          else if (subField.panels) {
            const panelField = findPanelSubField(subField, panelKey)
            if (panelField?.type === 'group') {
              const normalized = ensureGroupDefaults(current[panelKey], panelField)
              if (normalized !== current[panelKey]) {
                current[panelKey] = normalized
                changed = true
              }
            }
            else if (panelField?.type === 'repeater' && !Array.isArray(current[panelKey])) {
              current[panelKey] = []
              changed = true
            }
          }
        }
      }
      continue
    }

    if (!(key in current)) {
      current[key] = createFieldDefault(subField)
      changed = true
      continue
    }

    if (
      (subField.type === 'repeater' || subField.type === 'gallery')
      && !Array.isArray(current[key])
    ) {
      current[key] = []
      changed = true
      continue
    }

    if (subField.type === 'group') {
      const normalized = ensureGroupDefaults(current[key], subField)
      if (normalized !== current[key]) {
        current[key] = normalized
        changed = true
      }
    }
  }

  return changed ? current : (value as Record<string, unknown>)
}

function findPanelSubField(field: PanelContainerField, key: string): Field | undefined {
  for (const panel of field.panels ?? []) {
    if (key in (panel.subFields ?? {})) {
      return panel.subFields[key]
    }
  }
  return undefined
}

/** Seed root form values from a fields map (layout fields hoist panel keys). */
export function buildFormValues(fields: Fields): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(fields)) {
    if (isLayoutOnlyFieldType(field.type)) {
      if (isPanelContainerField(field)) {
        Object.assign(result, collectPanelDefaults(field))
      }
      continue
    }
    if ('defaultValue' in field) {
      result[key] = field.defaultValue
    }
    else if (field.type === 'group') {
      result[key] = createGroupDefaults(field)
    }
    else if (field.type === 'repeater' || field.type === 'flexible_content' || field.type === 'gallery') {
      result[key] = []
    }
    else if (field.type === 'open_street_map' && field.multiple) {
      result[key] = []
    }
    else if (field.type === 'form') {
      result[key] = field.multiple ? [] : field.allowNull ? null : undefined
    }
    else {
      result[key] = undefined
    }
  }
  return result
}

/**
 * Keys that should stay in the form store while these fields are visible.
 * Layout containers contribute their panel keys, not their own key.
 */
export function collectVisibleValueKeys(entries: [string, Field][]): Set<string> {
  const keys = new Set<string>()
  for (const [key, field] of entries) {
    if (isLayoutOnlyFieldType(field.type)) {
      if (isPanelContainerField(field)) {
        for (const panelKey of collectPanelKeys(field)) {
          keys.add(panelKey)
        }
      }
      continue
    }
    keys.add(key)
  }
  return keys
}

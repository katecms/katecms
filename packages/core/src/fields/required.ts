import type { Field, Fields } from '../config'
import { isMediaItem } from '../media'
import { isColorArrayValue, isLinkValue } from './values'
import { isOsmMarker } from './osm'
import { isLayoutOnlyFieldType } from './layout'
import { FLEXIBLE_CONTENT_LAYOUT_KEY } from './structure'
import { isVisible } from './visibility'

export interface RequiredFieldIssue {
  /** Matches the admin `field-key` (`group_sub`, `repeater_0_title`). */
  key: string
  label: string
  message: string
}

function childKey(prefix: string, name: string): string {
  return prefix ? `${prefix}_${name}` : name
}

function fieldLabel(field: Field, name: string): string {
  const label = 'label' in field ? field.label : undefined
  return label?.trim() || name
}

function requiredMessage(label: string): string {
  return `${label} is required.`
}

function wysiwygText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isBlankString(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

function isChoiceEmpty(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isChoiceEmpty)
  }
  if (value && typeof value === 'object') {
    const raw = (value as { value?: unknown }).value
    if (raw !== undefined) {
      return isChoiceEmpty(raw)
    }
  }
  if (typeof value === 'number') {
    return Number.isNaN(value)
  }
  return isBlankString(value)
}

function isMediaEmpty(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value === 'number') {
    return !Number.isFinite(value) || value <= 0
  }
  if (typeof value === 'string') {
    return value.trim() === ''
  }
  return !isMediaItem(value)
}

function isRelationEmpty(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value === 'number') {
    return !Number.isFinite(value) || value <= 0
  }
  if (value && typeof value === 'object' && 'id' in value) {
    return isRelationEmpty((value as { id: unknown }).id)
  }
  return isBlankString(value)
}

function asGroup(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(row => asGroup(row))
}

/** Whether a field value counts as empty for `required`. */
export function isFieldValueEmpty(field: Field, value: unknown): boolean {
  switch (field.type) {
    case 'true_false':
      return value !== true
    case 'number':
    case 'range':
      if (value === '' || value == null) {
        return true
      }
      return typeof value === 'number' ? Number.isNaN(value) : Number.isNaN(Number(value))
    case 'wysiwyg':
      return wysiwygText(value) === ''
    case 'image':
    case 'file':
      return isMediaEmpty(value)
    case 'gallery':
      return isMediaEmpty(value)
    case 'link':
      if (typeof value === 'string') {
        return value.trim() === ''
      }
      return !isLinkValue(value) || value.url.trim() === ''
    case 'color_picker':
      if (typeof value === 'string') {
        return value.trim() === ''
      }
      return !isColorArrayValue(value) || !value.hex?.trim()
    case 'open_street_map':
      if (Array.isArray(value)) {
        return value.length === 0 || !value.some(isOsmMarker)
      }
      return !isOsmMarker(value)
    case 'user':
    case 'post_object':
    case 'form':
    case 'page_link':
    case 'relationship':
    case 'dictionary':
      return isRelationEmpty(value)
    case 'select':
    case 'checkbox':
    case 'radio':
    case 'image_select':
    case 'button_group':
      return isChoiceEmpty(value)
    case 'repeater':
    case 'flexible_content':
      return !Array.isArray(value) || value.length === 0
    case 'group':
    case 'tab':
    case 'accordion':
    case 'separator':
    case 'message':
      return false
    default:
      if (typeof value === 'number') {
        return Number.isNaN(value)
      }
      return isBlankString(value)
  }
}

function walkFields(
  fields: Fields,
  values: Record<string, unknown>,
  prefix: string,
  issues: RequiredFieldIssue[],
): void {
  for (const [name, field] of Object.entries(fields)) {
    const key = childKey(prefix, name)
    if (!isVisible(field.conditionalLogic, values)) {
      continue
    }

    if (field.type === 'tab' || field.type === 'accordion') {
      for (const panel of field.panels ?? []) {
        walkFields(panel.subFields ?? {}, values, key, issues)
      }
      continue
    }

    if (isLayoutOnlyFieldType(field.type)) {
      continue
    }

    if (field.type === 'group') {
      walkFields(field.subFields ?? {}, asGroup(values[name]), key, issues)
      continue
    }

    if (field.type === 'repeater') {
      const rows = asRows(values[name])
      if (field.required && rows.length === 0) {
        const label = fieldLabel(field, name)
        issues.push({ key, label, message: requiredMessage(label) })
      }
      rows.forEach((row, index) => {
        walkFields(field.subFields ?? {}, row, `${key}_${index}`, issues)
      })
      continue
    }

    if (field.type === 'flexible_content') {
      const rows = asRows(values[name])
      if (field.required && rows.length === 0) {
        const label = fieldLabel(field, name)
        issues.push({ key, label, message: requiredMessage(label) })
      }
      rows.forEach((row, index) => {
        const layoutName = String(row[FLEXIBLE_CONTENT_LAYOUT_KEY] ?? '')
        const layout = field.layouts?.[layoutName]
        if (layout) {
          walkFields(layout.subFields ?? {}, row, `${key}_${index}`, issues)
        }
      })
      continue
    }

    if (field.required && isFieldValueEmpty(field, values[name])) {
      const label = fieldLabel(field, name)
      issues.push({ key, label, message: requiredMessage(label) })
    }
  }
}

/** Visible `required` fields that are empty. Nested keys match the admin UI. */
export function validateRequiredFields(
  fields: Fields,
  values: Record<string, unknown> = {},
): RequiredFieldIssue[] {
  const issues: RequiredFieldIssue[] = []
  walkFields(fields, values, '', issues)
  return issues
}

export function formatRequiredFieldsError(issues: RequiredFieldIssue[]): string {
  if (issues.length === 0) {
    return ''
  }
  if (issues.length === 1) {
    return issues[0]!.message
  }
  const labels = [...new Set(issues.map(issue => issue.label).filter(Boolean))]
  if (labels.length === 0) {
    return 'Please fill in the required fields.'
  }
  return `Please fill in the required fields: ${labels.join(', ')}.`
}

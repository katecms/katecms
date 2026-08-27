import type { Condition, ConditionalLogic, Operator } from '../config'

export type { Condition, ConditionalLogic, Operator }

/** Current form state: field name → value. */
export type FormValues = Record<string, unknown>

/** Cap `matches` patterns so a crafted regex cannot hang the process. */
export const MAX_MATCHES_PATTERN_LENGTH = 200

const TEXT_LIKE: Operator[] = [
  'empty',
  'notEmpty',
  'equal',
  'notEqual',
  'matches',
  'contains',
]
const PRESENCE_ONLY: Operator[] = ['empty', 'notEmpty']
const CHOICE: Operator[] = ['empty', 'notEmpty', 'equal', 'notEqual']
const RELATIONAL: Operator[] = [
  'equal',
  'notEqual',
  'contains',
  'notContains',
  'empty',
  'notEmpty',
  'gt',
  'lt',
]

/**
 * Operators allowed per field type. Types not listed here are not used as
 * condition sources (layout, group, repeater, …).
 */
export const FIELD_OPERATORS: Record<string, Operator[]> = {
  text: TEXT_LIKE,
  textarea: TEXT_LIKE,
  email: TEXT_LIKE,
  url: TEXT_LIKE,
  password: TEXT_LIKE,

  number: ['empty', 'notEmpty', 'equal', 'notEqual', 'contains', 'gt', 'lt'],
  range: ['empty', 'notEmpty', 'equal', 'notEqual', 'gt', 'lt'],

  wysiwyg: ['empty', 'notEmpty', 'matches', 'contains'],
  oembed: ['empty', 'notEmpty', 'contains'],

  image: PRESENCE_ONLY,
  file: PRESENCE_ONLY,
  gallery: PRESENCE_ONLY,
  link: PRESENCE_ONLY,
  open_street_map: PRESENCE_ONLY,
  date_picker: PRESENCE_ONLY,
  date_time_picker: PRESENCE_ONLY,
  time_picker: PRESENCE_ONLY,
  color_picker: PRESENCE_ONLY,

  select: ['empty', 'notEmpty', 'contains', 'equal', 'notEqual', 'gt', 'lt'],
  checkbox: ['empty', 'notEmpty', 'equal', 'notEqual', 'gt', 'lt'],
  image_select: ['empty', 'notEmpty', 'equal', 'notEqual', 'gt', 'lt'],
  radio: CHOICE,
  button_group: CHOICE,

  true_false: ['equal', 'notEqual'],

  page_link: RELATIONAL,
  post_object: RELATIONAL,
  relationship: RELATIONAL,
  user: RELATIONAL,
  dictionary: RELATIONAL,
}

export function isOperatorAllowed(type: string, operator: Operator): boolean {
  return FIELD_OPERATORS[type]?.includes(operator) ?? false
}

function isEmpty(raw: unknown): boolean {
  if (Array.isArray(raw)) {
    return raw.length === 0
  }
  return raw == null || raw === '' || raw === false
}

/** Evaluate one condition against a raw field value. */
export function evaluateCondition(condition: Condition, raw: unknown): boolean {
  const arr = Array.isArray(raw) ? raw.map(String) : null
  const target = condition.value == null ? '' : String(condition.value)

  switch (condition.operator) {
    case 'empty':
      return isEmpty(raw)
    case 'notEmpty':
      return !isEmpty(raw)
    case 'equal':
      return arr ? arr.includes(target) : String(raw ?? '') === target
    case 'notEqual':
      return arr ? !arr.includes(target) : String(raw ?? '') !== target
    case 'contains':
      return arr ? arr.includes(target) : String(raw ?? '').includes(target)
    case 'notContains':
      return arr ? !arr.includes(target) : !String(raw ?? '').includes(target)
    case 'matches':
      if (target.length > MAX_MATCHES_PATTERN_LENGTH) {
        return false
      }
      try {
        return new RegExp(target).test(String(raw ?? ''))
      }
      catch {
        return false
      }
    case 'gt':
      return (arr ? arr.length : Number(raw)) > Number(condition.value)
    case 'lt':
      return (arr ? arr.length : Number(raw)) < Number(condition.value)
    default:
      return false
  }
}

/**
 * Whether a field should be visible given the current form values.
 * Missing or empty logic means always visible.
 * Groups are OR; conditions inside a group are AND.
 */
export function isVisible(
  logic: ConditionalLogic | undefined | null,
  values: FormValues,
): boolean {
  if (!logic || logic.length === 0) {
    return true
  }
  return logic.some(group =>
    group.every(rule => evaluateCondition(rule, values[rule.field])),
  )
}

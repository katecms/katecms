import { describe, expect, it } from 'vitest'
import type { Field, Fields } from '../src'
import {
  buildFormValues,
  collectVisibleValueKeys,
  createFieldDefault,
  evaluateCondition,
  MAX_MATCHES_PATTERN_LENGTH,
  isLayoutOnlyFieldType,
  isOperatorAllowed,
  isVisible,
  resolveCloneFields,
} from '../src'

const text = (overrides: Partial<Extract<Field, { type: 'text' }>> = {}): Extract<Field, { type: 'text' }> => ({
  type: 'text',
  label: 'Title',
  ...overrides,
})

describe('isVisible', () => {
  it('is true when logic is missing or empty', () => {
    expect(isVisible(undefined, {})).toBe(true)
    expect(isVisible([], { a: 1 })).toBe(true)
  })

  it('ORs groups and ANDs conditions inside a group', () => {
    const logic = [
      [
        { field: 'status', operator: 'equal' as const, value: 'draft' },
        { field: 'title', operator: 'notEmpty' as const },
      ],
      [{ field: 'flag', operator: 'equal' as const, value: true }],
    ]
    expect(isVisible(logic, { status: 'draft', title: 'Hi', flag: false })).toBe(true)
    expect(isVisible(logic, { status: 'draft', title: '', flag: false })).toBe(false)
    expect(isVisible(logic, { status: 'published', title: '', flag: true })).toBe(true)
  })
})

describe('evaluateCondition', () => {
  it('handles empty / notEmpty / equal / contains / gt', () => {
    expect(evaluateCondition({ field: 'a', operator: 'empty' }, '')).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'empty' }, [])).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'notEmpty' }, 'x')).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'equal', value: 'yes' }, 'yes')).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'equal', value: 'yes' }, ['yes', 'no'])).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'contains', value: 'ab' }, 'xabc')).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'gt', value: 2 }, 5)).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'gt', value: 2 }, ['a', 'b', 'c'])).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'matches', value: '^a+$' }, 'aaa')).toBe(true)
    expect(evaluateCondition({ field: 'a', operator: 'matches', value: '(' }, 'aaa')).toBe(false)
    expect(evaluateCondition(
      { field: 'a', operator: 'matches', value: 'a'.repeat(MAX_MATCHES_PATTERN_LENGTH + 1) },
      'a',
    )).toBe(false)
  })
})

describe('isOperatorAllowed', () => {
  it('allows text operators and rejects unknown types', () => {
    expect(isOperatorAllowed('text', 'contains')).toBe(true)
    expect(isOperatorAllowed('true_false', 'equal')).toBe(true)
    expect(isOperatorAllowed('true_false', 'contains')).toBe(false)
    expect(isOperatorAllowed('group', 'equal')).toBe(false)
  })
})

describe('buildFormValues', () => {
  it('seeds defaults and hoists tab/accordion panel keys', () => {
    const fields: Fields = {
      title: text({ defaultValue: 'Hello' }),
      body: { type: 'textarea', label: 'Body' },
      gallery: { type: 'gallery', label: 'Gallery' },
      meta: {
        type: 'group',
        label: 'Meta',
        subFields: {
          seo: text({ defaultValue: 'seo' }),
        },
      },
      tabs: {
        type: 'tab',
        panels: [
          {
            label: 'Main',
            subFields: {
              excerpt: text({ defaultValue: 'ex' }),
            },
          },
        ],
      },
    }
    const values = buildFormValues(fields)
    expect(values.title).toBe('Hello')
    expect(values.body).toBeUndefined()
    expect(values.gallery).toEqual([])
    expect(values.meta).toEqual({ seo: 'seo' })
    expect(values.tabs).toBeUndefined()
    expect(values.excerpt).toBe('ex')
  })

  it('does not store layout-only field keys', () => {
    expect(isLayoutOnlyFieldType('tab')).toBe(true)
    expect(createFieldDefault({ type: 'separator', label: 'Line' })).toBeUndefined()
    const keys = collectVisibleValueKeys([
      ['tabs', { type: 'tab', panels: [{ label: 'A', subFields: { n: text() } }] }],
      ['title', text()],
    ])
    expect([...keys].sort()).toEqual(['n', 'title'])
  })
})

describe('resolveCloneFields', () => {
  it('expands clone fields into prefixed copies', () => {
    const { fields, warnings } = resolveCloneFields({
      title: text(),
      copy: {
        type: 'clone',
        label: 'Copy',
        clone: ['title'],
        prefixName: true,
      },
    })
    expect(warnings).toEqual([])
    expect(fields.copy).toBeUndefined()
    expect(fields.copy_title).toMatchObject({ type: 'text', label: 'Title' })
  })
})

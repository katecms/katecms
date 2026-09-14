import { describe, expect, it } from 'vitest'
import type { Field, Fields } from '../src'
import {
  buildFormValues,
  collectVisibleValueKeys,
  createFieldDefault,
  DATE_FIELD_FORMATS,
  choiceMapLookup,
  decodeChoiceValue,
  emptyOsmAddress,
  encodeChoiceValue,
  evaluateCondition,
  FLEXIBLE_CONTENT_LAYOUT_KEY,
  formatDate,
  isLayoutOnlyFieldType,
  encodeUserFieldValue,
  encodeRelationEntryValue,
  encodeRelationTermValue,
  filterUsersByRole,
  formatRequiredFieldsError,
  isFieldValueEmpty,
  isOsmMarker,
  isRelationEntryValue,
  isRelationTermValue,
  isSelectChoiceGroup,
  isOperatorAllowed,
  isUserFieldValue,
  isVisible,
  MAX_MATCHES_PATTERN_LENGTH,
  osmAddressFromNominatim,
  pageLinkUrl,
  pageLinkUrls,
  parseDate,
  relationFieldId,
  relationFieldIds,
  ROW_COLLAPSED_KEY,
  selectChoiceLookup,
  selectChoiceValue,
  toRelationEntryValue,
  toRelationTermValue,
  toUserFieldValue,
  userFieldId,
  validateRequiredFields,
  walkSelectChoices,
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

describe('choice encode/decode', () => {
  it('round-trips mapped choices for each returnFormat', () => {
    const lookup = choiceMapLookup({ a: 'Alpha', b: 'Beta' })
    expect(encodeChoiceValue('a', lookup)).toBe('a')
    expect(encodeChoiceValue('a', lookup, 'label')).toBe('Alpha')
    expect(encodeChoiceValue('a', lookup, 'array')).toEqual({ value: 'a', label: 'Alpha' })
    expect(decodeChoiceValue('a', lookup)).toBe('a')
    expect(decodeChoiceValue('Alpha', lookup, 'label')).toBe('a')
    expect(decodeChoiceValue({ value: 'b', label: 'Beta' }, lookup, 'array')).toBe('b')
    expect(decodeChoiceValue(null, lookup, 'label')).toBe('')
  })

  it('walks select groups and resolves labels', () => {
    const choices = [
      { lbl: 'One', val: 1 },
      { type: 'group' as const, title: 'More', childs: [{ lbl: 'Two', val: 'two' }] },
    ]
    expect(isSelectChoiceGroup(choices[1]!)).toBe(true)
    const seen: string[] = []
    walkSelectChoices(choices, opt => seen.push(String(selectChoiceValue(opt))))
    expect(seen).toEqual(['1', 'two'])
    const lookup = selectChoiceLookup(choices)
    expect(encodeChoiceValue('two', lookup, 'label')).toBe('Two')
    expect(decodeChoiceValue('Two', lookup, 'label')).toBe('two')
  })
})

describe('date field formats', () => {
  it('formats and parses returnFormat strings', () => {
    const date = new Date(2024, 0, 5, 9, 7, 3)
    expect(formatDate(date, DATE_FIELD_FORMATS.date.return)).toBe('2024-01-05')
    expect(formatDate(date, DATE_FIELD_FORMATS.datetime.return)).toBe('2024-01-05 09:07')
    expect(formatDate(date, DATE_FIELD_FORMATS.time.return)).toBe('09:07')
    const parsed = parseDate('2024-01-05 09:07', DATE_FIELD_FORMATS.datetime.return)
    expect(parsed?.getFullYear()).toBe(2024)
    expect(parsed?.getMonth()).toBe(0)
    expect(parsed?.getDate()).toBe(5)
    expect(parsed?.getHours()).toBe(9)
    expect(parseDate('nope', DATE_FIELD_FORMATS.date.return)).toBeNull()
  })
})

describe('open street map helpers', () => {
  it('builds empty addresses and recognizes markers', () => {
    const address = emptyOsmAddress()
    expect(address.city).toBe('')
    expect(address['ISO3166-2-lvl4']).toBe('')
    expect(isOsmMarker({ lat: 1, lng: 2 })).toBe(true)
    expect(isOsmMarker({ lat: '1', lng: 2 })).toBe(false)
    expect(osmAddressFromNominatim({ city: 'Hamburg', road: 1 as never }).city).toBe('Hamburg')
    expect(osmAddressFromNominatim({ city: 'Hamburg', road: 1 as never }).road).toBe('')
  })
})

describe('user field helpers', () => {
  const ada = toUserFieldValue({
    id: 1,
    email: 'ada@example.com',
    name: 'Ada',
    avatar: null,
    role: 'owner',
    status: 'active',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
  })

  it('strips extra keys and serializes created_at', () => {
    expect(ada).toEqual({
      id: 1,
      email: 'ada@example.com',
      name: 'Ada',
      avatar: null,
      role: 'owner',
      status: 'active',
      created_at: '2024-01-01T00:00:00.000Z',
    })
    expect(ada).not.toHaveProperty('password_hash')
    expect(toUserFieldValue({
      ...ada,
      password_hash: 'secret',
    } as typeof ada & { password_hash: string })).not.toHaveProperty('password_hash')
    expect(isUserFieldValue(ada)).toBe(true)
    expect(isUserFieldValue({ id: 1, email: 'a@b.c' })).toBe(false)
  })

  it('reads ids from stored values and encodes returnFormat', () => {
    expect(userFieldId(ada)).toBe('1')
    expect(userFieldId(7)).toBe('7')
    expect(userFieldId(null)).toBe('')
    expect(encodeUserFieldValue(ada, 'id')).toBe(1)
    expect(encodeUserFieldValue(ada, 'array')).toEqual(ada)
  })

  it('filters by role', () => {
    const editor = toUserFieldValue({
      ...ada,
      id: 2,
      email: 'ed@example.com',
      role: 'editor',
    })
    expect(filterUsersByRole([ada, editor], 'all')).toEqual([ada, editor])
    expect(filterUsersByRole([ada, editor], 'editor')).toEqual([editor])
    expect(filterUsersByRole([ada, editor], ['owner', 'editor'])).toEqual([ada, editor])
  })
})

describe('relation field helpers', () => {
  const page = toRelationEntryValue({
    id: 12,
    type: 'pages',
    title: 'About',
    slug: 'about',
    slugPath: 'about',
    url: '/inf/about',
  })
  const term = toRelationTermValue({
    id: 4,
    type: 'categories',
    title: 'News',
    slug: 'news',
    slugPath: 'news',
    parentId: null,
    depth: 0,
  })

  it('reads ids and encodes returnFormat', () => {
    expect(isRelationEntryValue(page)).toBe(true)
    expect(isRelationTermValue(term)).toBe(true)
    expect(relationFieldId(page)).toBe('12')
    expect(relationFieldId(12)).toBe('12')
    expect(relationFieldIds([page, 7])).toEqual(['12', '7'])
    expect(encodeRelationEntryValue(page, 'id')).toBe(12)
    expect(encodeRelationEntryValue(page, 'object')).toEqual(page)
    expect(encodeRelationTermValue(term, 'id')).toBe(4)
  })

  it('reads page_link URLs', () => {
    expect(pageLinkUrl('/inf/about')).toBe('/inf/about')
    expect(pageLinkUrl(page)).toBe('/inf/about')
    expect(pageLinkUrls([page, '/posts/hello'])).toEqual(['/inf/about', '/posts/hello'])
  })
})


describe('structure keys', () => {
  it('keeps reserved row keys stable', () => {
    expect(ROW_COLLAPSED_KEY).toBe('__miraicmsCollapsed')
    expect(FLEXIBLE_CONTENT_LAYOUT_KEY).toBe('fc_layout')
  })
})

describe('validateRequiredFields', () => {
  it('flags empty required values and skips hidden / filled fields', () => {
    const fields: Fields = {
      title: text({ required: true }),
      optional: text(),
      hidden: text({
        required: true,
        conditionalLogic: [[{ field: 'title', operator: 'equal', value: 'show' }]],
      }),
      body: { type: 'wysiwyg', label: 'Body', required: true },
      agree: { type: 'true_false', label: 'Agree', required: true },
      count: { type: 'number', label: 'Count', required: true },
    }

    const issues = validateRequiredFields(fields, {
      title: '  ',
      optional: '',
      hidden: '',
      body: '<p><br></p>',
      agree: false,
      count: 0,
    })
    expect(issues.map(issue => issue.key)).toEqual(['title', 'body', 'agree'])
    expect(isFieldValueEmpty(fields.count!, 0)).toBe(false)
    expect(formatRequiredFieldsError(issues)).toBe(
      'Please fill in the required fields: Title, Body, Agree.',
    )
  })

  it('walks groups, tabs, and repeater rows with admin field-keys', () => {
    const fields: Fields = {
      meta: {
        type: 'group',
        label: 'Meta',
        subFields: {
          seo: text({ required: true, label: 'SEO' }),
        },
      },
      tabs: {
        type: 'tab',
        panels: [
          {
            label: 'Main',
            subFields: {
              excerpt: text({ required: true, label: 'Excerpt' }),
            },
          },
        ],
      },
      items: {
        type: 'repeater',
        label: 'Items',
        required: true,
        subFields: {
          name: text({ required: true, label: 'Name' }),
        },
      },
    }

    expect(validateRequiredFields(fields, {}).map(issue => issue.key)).toEqual([
      'meta_seo',
      'tabs_excerpt',
      'items',
    ])

    expect(validateRequiredFields(fields, {
      meta: { seo: 'ok' },
      excerpt: 'ok',
      items: [{ name: '' }],
    }).map(issue => issue.key)).toEqual(['items_0_name'])
  })
})

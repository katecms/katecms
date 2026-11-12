import { describe, expect, it } from 'vitest'
import { buildFormValues, formatDate, isMediaItem, isUserFieldValue, isVisible, ROW_COLLAPSED_KEY } from '../src/browser'

describe('browser entry', () => {
  it('exports field helpers used by the admin UI', () => {
    expect(isVisible(undefined, {})).toBe(true)
    expect(buildFormValues({
      title: { type: 'text', label: 'Title', defaultValue: 'Hello' },
    })).toEqual({ title: 'Hello' })
    expect(formatDate(new Date(2024, 0, 2), 'YYYY-MM-DD')).toBe('2024-01-02')
    expect(isMediaItem({ url: '/uploads/a.jpg' })).toBe(true)
    expect(isUserFieldValue({
      id: 1,
      email: 'ada@example.com',
      name: null,
      avatar: null,
      role: 'owner',
      status: 'active',
      created_at: '2024-01-01T00:00:00.000Z',
    })).toBe(true)
    expect(ROW_COLLAPSED_KEY).toBe('__katecmsCollapsed')
  })
})

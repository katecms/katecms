import { describe, expect, it } from 'vitest'
import { buildFormValues, formatDate, isMediaItem, isVisible, ROW_COLLAPSED_KEY } from '../src/browser'

describe('browser entry', () => {
  it('exports field helpers used by the admin UI', () => {
    expect(isVisible(undefined, {})).toBe(true)
    expect(buildFormValues({
      title: { type: 'text', label: 'Title', defaultValue: 'Hello' },
    })).toEqual({ title: 'Hello' })
    expect(formatDate(new Date(2024, 0, 2), 'YYYY-MM-DD')).toBe('2024-01-02')
    expect(isMediaItem({ url: '/uploads/a.jpg' })).toBe(true)
    expect(ROW_COLLAPSED_KEY).toBe('__miraicmsCollapsed')
  })
})

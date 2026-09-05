import { describe, expect, it } from 'vitest'
import { buildFormValues, isVisible } from '../src/browser'

describe('browser entry', () => {
  it('exports field helpers used by the admin UI', () => {
    expect(isVisible(undefined, {})).toBe(true)
    expect(buildFormValues({
      title: { type: 'text', label: 'Title', defaultValue: 'Hello' },
    })).toEqual({ title: 'Hello' })
  })
})

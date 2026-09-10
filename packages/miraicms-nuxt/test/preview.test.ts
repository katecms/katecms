import { describe, expect, it } from 'vitest'
import {
  isTruthyQueryParam,
  parsePublicStatusParam,
  resolvePublicStatuses,
} from '../src/runtime/utils/preview'

describe('public resolve preview params', () => {
  it('treats 1/true/yes/on as preview flags', () => {
    expect(isTruthyQueryParam('1')).toBe(true)
    expect(isTruthyQueryParam('true')).toBe(true)
    expect(isTruthyQueryParam(['yes'])).toBe(true)
    expect(isTruthyQueryParam('off')).toBe(false)
    expect(isTruthyQueryParam(undefined)).toBe(false)
  })

  it('parses status and drops trash', () => {
    expect(parsePublicStatusParam('draft')).toEqual(['draft'])
    expect(parsePublicStatusParam('published,draft')).toEqual(['published', 'draft'])
    expect(parsePublicStatusParam('trash')).toBeNull()
  })

  it('stays published-only without authorized preview', () => {
    expect(resolvePublicStatuses({
      previewRequested: true,
      previewAllowed: false,
      requested: ['draft'],
    })).toEqual({ statuses: ['published'], preview: false })
  })

  it('allows drafts when preview is granted', () => {
    expect(resolvePublicStatuses({
      previewRequested: true,
      previewAllowed: true,
    })).toEqual({ statuses: ['published', 'draft'], preview: true })

    expect(resolvePublicStatuses({
      previewRequested: true,
      previewAllowed: true,
      requested: ['draft'],
    })).toEqual({ statuses: ['draft'], preview: true })
  })
})

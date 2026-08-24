import { describe, expect, it } from 'vitest'
import {
  autop,
  createBlockInstance,
  ensureBlockIds,
  isValidBlockId,
  newBlockId,
  nl2br,
} from '../src/core'

describe('newBlockId', () => {
  it('returns an anchor-safe id', () => {
    const id = newBlockId()
    expect(isValidBlockId(id)).toBe(true)
    expect(id).toHaveLength(10)
    expect(newBlockId()).not.toBe(id)
  })

  it('rejects unsafe manual ids', () => {
    expect(isValidBlockId('Hero')).toBe(true)
    expect(isValidBlockId('1abc')).toBe(false)
    expect(isValidBlockId('ab-cd')).toBe(false)
  })
})

describe('ensureBlockIds', () => {
  it('keeps valid ids and fills missing ones', () => {
    const [kept, generated] = ensureBlockIds([
      { id: 'heroBlock1', name: 'hero', data: { t: 1 } },
      { name: 'cta' },
    ])
    expect(kept?.id).toBe('heroBlock1')
    expect(kept?.data).toEqual({ t: 1 })
    expect(isValidBlockId(generated?.id)).toBe(true)
    expect(generated?.name).toBe('cta')
    expect(createBlockInstance('hero').name).toBe('hero')
  })
})

describe('nl2br / autop', () => {
  it('converts newlines', () => {
    expect(nl2br('a\nb')).toBe('a<br>b')
    expect(nl2br('<b>x</b>')).toBe('&lt;b&gt;x&lt;/b&gt;')
    expect(autop('one\n\ntwo\nlines')).toBe('<p>one</p><p>two<br>lines</p>')
  })
})

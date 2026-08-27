import { describe, expect, it } from 'vitest'
import { transliterate } from '../src'

describe('transliterate', () => {
  it('maps Cyrillic to Latin and leaves other characters', () => {
    expect(transliterate('фото')).toBe('foto')
    expect(transliterate('Київ')).toBe('Kiyiv')
    expect(transliterate('О нас')).toBe('O nas')
    expect(transliterate('hello-ё')).toBe('hello-yo')
  })
})

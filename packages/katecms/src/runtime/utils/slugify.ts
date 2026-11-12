import { transliterate } from '@katecms/core'

/** Lowercase slug with Cyrillic → Latin transliteration. */
export function slugify(title: string): string {
  return transliterate(title.trim())
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

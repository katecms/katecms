import type { RelationEntryValue, RelationTermValue } from '@miraicms/core'

export type RelationPickerEntry = RelationEntryValue & {
  termIds?: number[]
}

export interface RelationArchiveOption {
  type: string
  title: string
  url: string
}

export interface RelationEntriesResponse {
  entries: RelationPickerEntry[]
  archives?: RelationArchiveOption[]
}

export interface RelationTermsResponse {
  dictionary: {
    slug: string
    labels: {
      name: string
      singularName: string
    }
  }
  terms: RelationTermValue[]
  canCreate: boolean
}

export function relationEntriesApi(options?: {
  postType?: string[]
  dictionary?: string[]
  featured?: boolean
  archives?: boolean
  q?: string
}): string {
  const params = new URLSearchParams()
  if (options?.postType?.length) {
    params.set('postType', options.postType.join(','))
  }
  if (options?.dictionary?.length) {
    params.set('dictionary', options.dictionary.join(','))
  }
  if (options?.featured) {
    params.set('featured', '1')
  }
  if (options?.archives) {
    params.set('archives', '1')
  }
  if (options?.q) {
    params.set('q', options.q)
  }
  const query = params.toString()
  return `/api/_miraicms/relation/entries${query ? `?${query}` : ''}`
}

export function relationTermsApi(dictionary: string): string {
  return `/api/_miraicms/relation/terms?dictionary=${encodeURIComponent(dictionary)}`
}

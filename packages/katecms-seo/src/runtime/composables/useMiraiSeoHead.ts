import { computed, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { useAsyncData, useHead, useRequestFetch } from '#imports'

export interface MiraiSeoHeadInput {
  title?: string | null
  entryId?: number | null
  termId?: number | null
  path?: string | null
  isArchive?: boolean
}

interface SeoHeadPayload {
  title: string
  description: string
  canonical: string
  image: string
  robots: string | null
  jsonLd: Record<string, unknown>
}

/** Apply the public title, description, canonical, robots, and JSON-LD for one CMS page. */
export function useMiraiSeoHead(input: MaybeRefOrGetter<MiraiSeoHeadInput>) {
  const requestFetch = useRequestFetch()
  const source = computed(() => toValue(input))

  const { data } = useAsyncData(
    () => `katecms-seo-head:${source.value.entryId ?? 0}:${source.value.termId ?? 0}:${source.value.path ?? ''}:${source.value.isArchive ? 1 : 0}`,
    () => requestFetch<SeoHeadPayload>('/api/_katecms/seo/head', {
      query: {
        title: source.value.title || undefined,
        entryId: source.value.entryId || undefined,
        termId: source.value.termId || undefined,
        path: source.value.path || undefined,
        archive: source.value.isArchive ? '1' : undefined,
      },
    }),
    { watch: [source] },
  )

  useHead(() => {
    const head = data.value
    if (!head) {
      return {}
    }
    const meta = [
      head.description ? { name: 'description', content: head.description } : undefined,
      head.robots ? { name: 'robots', content: head.robots } : undefined,
      { property: 'og:title', content: head.title },
      head.description ? { property: 'og:description', content: head.description } : undefined,
      head.image ? { property: 'og:image', content: head.image } : undefined,
      { property: 'og:url', content: head.canonical },
    ].filter((item): item is { name: string, content: string } | { property: string, content: string } => !!item)

    return {
      title: head.title,
      meta,
      link: [{ rel: 'canonical', href: head.canonical }],
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify(head.jsonLd).replace(/</g, '\\u003c'),
      }],
    }
  })
}

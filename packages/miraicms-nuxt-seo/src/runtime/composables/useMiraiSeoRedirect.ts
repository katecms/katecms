import { useRequestFetch, useRoute } from '#imports'

export async function useMiraiSeoRedirect(): Promise<{ to: string, statusCode: number } | null> {
  const path = useRoute().path
  if (!path || path === '/' || path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/_nuxt')) {
    return null
  }
  try {
    const data = await useRequestFetch()<{ to: string | null, statusCode: number }>(
      '/api/_miraicms/seo/redirect',
      { query: { path } },
    )
    const statusCode = data?.statusCode || 301
    if (statusCode === 410 || statusCode === 451) {
      return { to: '', statusCode }
    }
    if (!data?.to || data.to === path) {
      return null
    }
    return { to: data.to, statusCode }
  }
  catch {
    return null
  }
}

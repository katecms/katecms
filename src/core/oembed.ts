/** Subset of an oEmbed response that the CMS needs. */
export interface OembedResponse {
  type?: string
  html?: string
  title?: string
  width?: number
  height?: number
  thumbnail_url?: string
  provider_name?: string
}

export type OembedResult
  = | { ok: true, data: OembedResponse }
    | { ok: false, error: string, status: 422 | 404 | 502 }

/** Known providers and their oEmbed endpoints (no API keys). */
export const OEMBED_PROVIDERS: { pattern: RegExp, endpoint: string }[] = [
  { pattern: /(?:youtube\.com|youtu\.be)/i, endpoint: 'https://www.youtube.com/oembed' },
  { pattern: /vimeo\.com/i, endpoint: 'https://vimeo.com/api/oembed.json' },
  { pattern: /(?:twitter\.com|x\.com)/i, endpoint: 'https://publish.twitter.com/oembed' },
  { pattern: /soundcloud\.com/i, endpoint: 'https://soundcloud.com/oembed' },
  { pattern: /flickr\.com/i, endpoint: 'https://www.flickr.com/services/oembed' },
]

const USER_AGENT = 'miraicms-oembed'

export type ParseSafeUrlResult
  = | { ok: true, url: URL }
    | { ok: false, error: string }

/**
 * Basic SSRF guard: only http(s), and reject localhost / private / link-local
 * hosts. This is not a complete defense (DNS is not resolved) but blocks the
 * obvious attempts to reach an internal network.
 */
export function parseSafeUrl(raw: string): ParseSafeUrlResult {
  let parsed: URL
  try {
    parsed = new URL(raw)
  }
  catch {
    return { ok: false, error: 'Enter a valid URL.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http(s) URLs are allowed.' }
  }

  const host = parsed.hostname.toLowerCase()
  const isPrivate
    = host === 'localhost'
      || host.endsWith('.local')
      || host === '::1'
      || /^(?:127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(host)
      || /^172\.(?:1[6-9]|2\d|3[01])\./.test(host)
      || /^(?:fc|fd)/i.test(host)

  if (isPrivate) {
    return { ok: false, error: 'This host is not allowed.' }
  }

  return { ok: true, url: parsed }
}

/** Build a provider oEmbed endpoint URL with query parameters. */
export function buildOembedEndpoint(
  endpoint: string,
  target: string,
  maxwidth?: string,
  maxheight?: string,
): string {
  const url = new URL(endpoint)
  url.searchParams.set('url', target)
  url.searchParams.set('format', 'json')
  if (maxwidth) {
    url.searchParams.set('maxwidth', maxwidth)
  }
  if (maxheight) {
    url.searchParams.set('maxheight', maxheight)
  }
  return url.toString()
}

/** Parse `<link rel="alternate" type="application/json+oembed" href="...">`. */
export function parseOembedLink(html: string): string | null {
  const link = html.match(/<link[^>]+application\/json\+oembed[^>]*>/i)?.[0]
  const href = link?.match(/href=["']([^"']+)["']/i)?.[1]
  if (!href) {
    return null
  }
  return href.replace(/&amp;/g, '&')
}

export interface FetchOembedOptions {
  url: string
  maxwidth?: string
  maxheight?: string
  /** Injected `fetch`. Defaults to global fetch. */
  fetch?: typeof fetch
}

async function discoverEndpoint(
  target: string,
  fetchFn: typeof fetch,
): Promise<string | null> {
  const res = await fetchFn(target, { headers: { 'user-agent': USER_AGENT } })
  if (!res.ok) {
    return null
  }
  return parseOembedLink(await res.text())
}

/**
 * Resolve oEmbed data for a public URL. Tries known providers first, then
 * HTML discovery. Auth stays in the HTTP adapter so this is not an open proxy
 * by itself.
 */
export async function fetchOembed(options: FetchOembedOptions): Promise<OembedResult> {
  const target = options.url.trim()
  if (!target) {
    return { ok: false, error: 'url is required.', status: 422 }
  }

  const parsed = parseSafeUrl(target)
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, status: 422 }
  }

  const fetchFn = options.fetch ?? globalThis.fetch
  const provider = OEMBED_PROVIDERS.find(item => item.pattern.test(target))
  let endpoint = provider
    ? buildOembedEndpoint(provider.endpoint, target, options.maxwidth, options.maxheight)
    : null

  try {
    if (!endpoint) {
      const discovered = await discoverEndpoint(target, fetchFn)
      if (!discovered) {
        return { ok: false, error: 'oEmbed is not available for this URL.', status: 404 }
      }
      const absolute = new URL(discovered, target).toString()
      const safe = parseSafeUrl(absolute)
      if (!safe.ok) {
        return { ok: false, error: safe.error, status: 422 }
      }
      endpoint = absolute
    }

    const res = await fetchFn(endpoint, { headers: { 'user-agent': USER_AGENT } })
    if (!res.ok) {
      return { ok: false, error: 'The oEmbed provider returned an error.', status: 502 }
    }
    return { ok: true, data: (await res.json()) as OembedResponse }
  }
  catch {
    return { ok: false, error: 'Failed to fetch oEmbed.', status: 502 }
  }
}

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

/** Known providers and their oEmbed endpoints (no API keys). Matched by hostname. */
export const OEMBED_PROVIDERS: { hosts: string[], endpoint: string }[] = [
  { hosts: ['youtube.com', 'youtu.be'], endpoint: 'https://www.youtube.com/oembed' },
  { hosts: ['vimeo.com'], endpoint: 'https://vimeo.com/api/oembed.json' },
  { hosts: ['twitter.com', 'x.com'], endpoint: 'https://publish.twitter.com/oembed' },
  { hosts: ['soundcloud.com'], endpoint: 'https://soundcloud.com/oembed' },
  { hosts: ['flickr.com'], endpoint: 'https://www.flickr.com/services/oembed' },
]

const USER_AGENT = 'miraicms-oembed'
const FETCH_TIMEOUT_MS = 10_000
const MAX_BODY_BYTES = 1_000_000
const MAX_REDIRECTS = 3

function hostnameMatches(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase()
  const base = domain.toLowerCase()
  return host === base || host.endsWith(`.${base}`)
}

function ipv4FromDecimal(host: string): string | null {
  if (!/^\d+$/.test(host)) {
    return null
  }
  const n = Number(host)
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xFFFFFFFF) {
    return null
  }
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function extractIpv4(host: string): string | null {
  const decimal = ipv4FromDecimal(host)
  if (decimal) {
    return decimal
  }
  const mapped = /^\[?::ffff:(\d{1,3}(?:\.\d{1,3}){3})\]?$/i.exec(host)
  if (mapped?.[1]) {
    return mapped[1]
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return host
  }
  return null
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  const a = parts[0] ?? 0
  const b = parts[1] ?? 0
  if (a === 0 || a === 10 || a === 127) {
    return true
  }
  if (a === 169 && b === 254) {
    return true
  }
  if (a === 192 && b === 168) {
    return true
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true
  }
  return false
}

export type ParseSafeUrlResult
  = | { ok: true, url: URL }
    | { ok: false, error: string }

/**
 * SSRF guard: only http(s). Rejects localhost, `*.localhost`, private IPv4
 * (including decimal and IPv4-mapped IPv6 forms), and unique-local IPv6.
 * DNS is not resolved, so this is not a complete defense.
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
  const ipv4 = extractIpv4(host)
  const isPrivate
    = host === 'localhost'
      || host.endsWith('.localhost')
      || host.endsWith('.local')
      || host === '::1'
      || host === '[::1]'
      || /^(?:fc|fd|fe80)/i.test(host.replace(/^\[|\]$/g, ''))
      || (ipv4 != null && isPrivateIpv4(ipv4))

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

function findProvider(url: URL) {
  return OEMBED_PROVIDERS.find(item =>
    item.hosts.some(host => hostnameMatches(url.hostname, host)),
  )
}

async function safeFetch(
  fetchFn: typeof fetch,
  rawUrl: string,
  redirectsLeft: number,
): Promise<Response> {
  const parsed = parseSafeUrl(rawUrl)
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }
  const res = await fetchFn(parsed.url.toString(), {
    headers: { 'user-agent': USER_AGENT },
    redirect: 'manual',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    if (redirectsLeft <= 0) {
      throw new Error('Too many redirects.')
    }
    const location = res.headers.get('location')
    if (!location) {
      throw new Error('Redirect without Location.')
    }
    return safeFetch(fetchFn, new URL(location, parsed.url).toString(), redirectsLeft - 1)
  }
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength > MAX_BODY_BYTES) {
    throw new Error('oEmbed response is too large.')
  }
  return new Response(buffer, { status: res.status, headers: res.headers })
}

async function discoverEndpoint(
  target: string,
  fetchFn: typeof fetch,
): Promise<string | null> {
  const res = await safeFetch(fetchFn, target, MAX_REDIRECTS)
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
  const provider = findProvider(parsed.url)
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

    const res = await safeFetch(fetchFn, endpoint, MAX_REDIRECTS)
    if (!res.ok) {
      return { ok: false, error: 'The oEmbed provider returned an error.', status: 502 }
    }
    return { ok: true, data: (await res.json()) as OembedResponse }
  }
  catch {
    return { ok: false, error: 'Failed to fetch oEmbed.', status: 502 }
  }
}

import { describe, expect, it } from 'vitest'
import {
  buildOembedEndpoint,
  embedUrlFromHtml,
  fetchOembed,
  isDisallowedAddress,
  parseOembedLink,
  parseSafeUrl,
} from '../src'

const publicResolve = async () => ['93.184.216.34']

describe('parseSafeUrl', () => {
  it('accepts public http(s) URLs', () => {
    expect(parseSafeUrl('https://youtu.be/abc').ok).toBe(true)
    expect(parseSafeUrl('http://example.com/x').ok).toBe(true)
  })

  it('rejects invalid, non-http, and private hosts', () => {
    expect(parseSafeUrl('not a url').ok).toBe(false)
    expect(parseSafeUrl('ftp://example.com').ok).toBe(false)
    expect(parseSafeUrl('http://localhost/x').ok).toBe(false)
    expect(parseSafeUrl('http://127.0.0.1/x').ok).toBe(false)
    expect(parseSafeUrl('http://192.168.0.1/x').ok).toBe(false)
    expect(parseSafeUrl('http://10.0.0.1/x').ok).toBe(false)
    expect(parseSafeUrl('http://2130706433/x').ok).toBe(false)
    expect(parseSafeUrl('http://foo.localhost/x').ok).toBe(false)
  })
})

describe('parseOembedLink / buildOembedEndpoint', () => {
  it('extracts the json+oembed href', () => {
    const html = '<link rel="alternate" type="application/json+oembed" href="https://ex.com/oembed?url=a&amp;format=json">'
    expect(parseOembedLink(html)).toBe('https://ex.com/oembed?url=a&format=json')
  })

  it('adds url and format query params', () => {
    const endpoint = buildOembedEndpoint('https://www.youtube.com/oembed', 'https://youtu.be/abc', '640')
    expect(endpoint).toContain('url=https%3A%2F%2Fyoutu.be%2Fabc')
    expect(endpoint).toContain('format=json')
    expect(endpoint).toContain('maxwidth=640')
  })
})

describe('fetchOembed', () => {
  it('uses a known provider endpoint without discovery', async () => {
    const calls: string[] = []
    const fetchFn: typeof fetch = async (input) => {
      calls.push(String(input))
      return new Response(JSON.stringify({
        html: '<iframe src="https://www.youtube.com/embed/abc"></iframe><script>alert(1)</script>',
        type: 'video',
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const result = await fetchOembed({ url: 'https://youtu.be/abc', fetch: fetchFn, resolve: publicResolve })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('video')
      expect(result.data).not.toHaveProperty('html')
      expect(result.data.embedUrl).toBe('https://www.youtube.com/embed/abc')
    }
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('youtube.com/oembed')
  })

  it('does not treat a lookalike hostname as a known provider', async () => {
    const calls: string[] = []
    const fetchFn: typeof fetch = async (input) => {
      calls.push(String(input))
      return new Response('<html></html>', { status: 200 })
    }
    const result = await fetchOembed({ url: 'https://notyoutube.com/watch?v=abc', fetch: fetchFn, resolve: publicResolve })
    expect(calls[0]).not.toContain('youtube.com/oembed')
    expect(calls[0]).toContain('notyoutube.com')
    expect(result.ok).toBe(false)
  })

  it('discovers an endpoint from HTML when the provider is unknown', async () => {
    let calls = 0
    const fetchFn: typeof fetch = async () => {
      calls += 1
      if (calls === 1) {
        return new Response(
          '<link rel="alternate" type="application/json+oembed" href="https://blog.example.com/oembed?url=1">',
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({ title: 'Post' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const result = await fetchOembed({ url: 'https://blog.example.com/p/1', fetch: fetchFn, resolve: publicResolve })
    expect(calls).toBe(2)
    expect(result).toEqual({ ok: true, data: { title: 'Post' } })
  })

  it('returns 422 for a private host without fetching', async () => {
    let called = false
    const result = await fetchOembed({
      url: 'http://127.0.0.1/secret',
      fetch: async () => {
        called = true
        return new Response('nope')
      },
    })
    expect(called).toBe(false)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(422)
    }
  })

  it('does not fetch a name that resolves to a loopback address', async () => {
    let called = false
    const result = await fetchOembed({
      url: 'https://public.example/watch',
      resolve: async () => ['127.0.0.1'],
      fetch: async () => {
        called = true
        return new Response('no')
      },
    })
    expect(called).toBe(false)
    expect(result).toMatchObject({ ok: false, status: 422, error: 'This host is not allowed.' })
  })

  it('dials the first resolved address and does not use fetch', async () => {
    const hops: { host: string, address: string }[] = []
    const result = await fetchOembed({
      url: 'https://youtu.be/abc',
      resolve: async () => ['93.184.216.34', '93.184.216.35'],
      connect: async (url, address) => {
        hops.push({ host: url.hostname, address })
        return new Response(JSON.stringify({
          type: 'video',
          html: '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      },
      fetch: async () => {
        throw new Error('fetch should not run')
      },
    })
    expect(hops).toEqual([{ host: 'www.youtube.com', address: '93.184.216.34' }])
    expect(result.ok).toBe(true)
  })

  it('pins each redirect hop to the address resolved for that host', async () => {
    const hops: { host: string, address: string }[] = []
    const result = await fetchOembed({
      url: 'https://youtu.be/abc',
      resolve: async host => host === 'cdn.example' ? ['1.2.3.4'] : ['9.9.9.9'],
      connect: async (url, address) => {
        hops.push({ host: url.hostname, address })
        if (url.hostname === 'www.youtube.com') {
          return new Response(null, { status: 302, headers: { location: 'https://cdn.example/oembed' } })
        }
        return new Response(JSON.stringify({ title: 'Moved' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    })
    expect(hops).toEqual([
      { host: 'www.youtube.com', address: '9.9.9.9' },
      { host: 'cdn.example', address: '1.2.3.4' },
    ])
    expect(result).toEqual({ ok: true, data: { title: 'Moved' } })
  })

  it('does not dial a redirect that resolves to a private address', async () => {
    let dials = 0
    const result = await fetchOembed({
      url: 'https://youtu.be/abc',
      resolve: async host => host === 'cdn.example' ? ['127.0.0.1'] : ['9.9.9.9'],
      connect: async () => {
        dials += 1
        return new Response(null, { status: 302, headers: { location: 'https://cdn.example/oembed' } })
      },
    })
    expect(dials).toBe(1)
    expect(result).toMatchObject({ ok: false, status: 422 })
  })
})

describe('embedUrlFromHtml', () => {
  it('keeps an https iframe on a known host and drops everything else', () => {
    expect(embedUrlFromHtml('<iframe src="https://www.youtube.com/embed/abc"></iframe>')).toBe('https://www.youtube.com/embed/abc')
    expect(embedUrlFromHtml('<iframe src="https://evil.example/embed"></iframe>')).toBeUndefined()
    expect(embedUrlFromHtml('<iframe src="http://www.youtube.com/embed/abc"></iframe>')).toBeUndefined()
    expect(embedUrlFromHtml('<script>alert(1)</script>')).toBeUndefined()
  })

  it('treats loopback and link-local addresses as disallowed', () => {
    expect(isDisallowedAddress('127.0.0.1')).toBe(true)
    expect(isDisallowedAddress('10.1.1.1')).toBe(true)
    expect(isDisallowedAddress('169.254.169.254')).toBe(true)
    expect(isDisallowedAddress('::1')).toBe(true)
    expect(isDisallowedAddress('fd00::1')).toBe(true)
    expect(isDisallowedAddress('93.184.216.34')).toBe(false)
  })
})

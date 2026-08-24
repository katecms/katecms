import { describe, expect, it } from 'vitest'
import {
  buildOembedEndpoint,
  fetchOembed,
  parseOembedLink,
  parseSafeUrl,
} from '../src/core'

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
      return new Response(JSON.stringify({ html: '<iframe></iframe>', type: 'video' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const result = await fetchOembed({ url: 'https://youtu.be/abc', fetch: fetchFn })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('video')
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
    const result = await fetchOembed({ url: 'https://notyoutube.com/watch?v=abc', fetch: fetchFn })
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

    const result = await fetchOembed({ url: 'https://blog.example.com/p/1', fetch: fetchFn })
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
})

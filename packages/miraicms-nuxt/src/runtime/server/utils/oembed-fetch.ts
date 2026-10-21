import { request as httpRequest, type IncomingHttpHeaders, type IncomingMessage, type RequestOptions } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib'
import type { OembedConnectInit } from '@miraicms/core'

const MAX_BODY_BYTES = 1_000_000
const SKIP_HEADERS = new Set(['content-encoding', 'content-length', 'transfer-encoding'])

export async function resolveOembedHost(hostname: string): Promise<string[]> {
  const host = hostname.replace(/^\[|\]$/g, '')
  if (isIP(host)) {
    return [host]
  }
  const records = await lookup(host, { all: true, verbatim: true })
  return records.map(record => record.address)
}

function pinnedLookup(address: string, family: 4 | 6): RequestOptions['lookup'] {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address, family }])
      return
    }
    callback(null, address, family)
  }
}

function responseHeaders(raw: IncomingHttpHeaders): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(raw)) {
    if (SKIP_HEADERS.has(key) || value == null) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item)
      }
      continue
    }
    headers.set(key, value)
  }
  return headers
}

function decodeBody(body: Buffer, encoding: string | undefined): Buffer {
  const maxOutputLength = MAX_BODY_BYTES
  const kind = encoding?.trim().toLowerCase()
  try {
    if (!kind || kind === 'identity') {
      return body
    }
    if (kind === 'gzip' || kind === 'x-gzip') {
      return gunzipSync(body, { maxOutputLength })
    }
    if (kind === 'deflate') {
      return inflateSync(body, { maxOutputLength })
    }
    if (kind === 'br') {
      return brotliDecompressSync(body, { maxOutputLength })
    }
  }
  catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : ''
    if (code === 'ERR_BUFFER_TOO_LARGE') {
      throw new Error('oEmbed response is too large.')
    }
    throw new Error('Failed to fetch oEmbed.')
  }
  throw new Error('Failed to fetch oEmbed.')
}

/** Dial `address` while the request still carries `url`'s hostname. */
export function connectOembed(url: URL, address: string, init: OembedConnectInit): Promise<Response> {
  const family = isIP(address)
  if (family !== 4 && family !== 6) {
    return Promise.reject(new Error('Failed to resolve host.'))
  }
  const secure = url.protocol === 'https:'
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const port = url.port ? Number(url.port) : (secure ? 443 : 80)
  const options: RequestOptions = {
    hostname,
    port,
    method: 'GET',
    path: `${url.pathname}${url.search}`,
    headers: {
      ...init.headers,
      'accept-encoding': 'identity',
      host: url.host,
    },
    lookup: pinnedLookup(address, family),
    signal: init.signal,
  }

  return new Promise((resolve, reject) => {
    let settled = false
    let tooLarge = false
    const fail = (error: unknown) => {
      if (settled) {
        return
      }
      settled = true
      if (tooLarge) {
        reject(new Error('oEmbed response is too large.'))
        return
      }
      reject(error instanceof Error ? error : new Error('Failed to fetch oEmbed.'))
    }
    const succeed = (response: Response) => {
      if (settled) {
        return
      }
      settled = true
      resolve(response)
    }
    const onResponse = (incoming: IncomingMessage) => {
      const chunks: Buffer[] = []
      let received = 0
      incoming.on('data', (chunk: Buffer) => {
        received += chunk.length
        if (received > MAX_BODY_BYTES) {
          tooLarge = true
          incoming.destroy()
          return
        }
        chunks.push(chunk)
      })
      incoming.on('error', fail)
      incoming.on('end', () => {
        if (tooLarge) {
          fail(new Error('oEmbed response is too large.'))
          return
        }
        try {
          const encoding = typeof incoming.headers['content-encoding'] === 'string'
            ? incoming.headers['content-encoding']
            : undefined
          const body = decodeBody(Buffer.concat(chunks), encoding)
          succeed(new Response(body, {
            status: incoming.statusCode ?? 502,
            headers: responseHeaders(incoming.headers),
          }))
        }
        catch (error) {
          fail(error)
        }
      })
    }
    const req = secure
      ? httpsRequest({ ...options, servername: hostname }, onResponse)
      : httpRequest(options, onResponse)
    req.on('error', fail)
    req.end()
  })
}

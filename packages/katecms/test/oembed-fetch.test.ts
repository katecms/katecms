import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { connectOembed } from '../src/runtime/server/utils/oembed-fetch'

describe('connectOembed', () => {
  it('dials the pinned address and keeps the original host name', async () => {
    const seen: { host?: string, url?: string }[] = []
    const server = createServer((req, res) => {
      seen.push({ host: req.headers.host, url: req.url })
      res.end('ok')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()))
    const port = (server.address() as AddressInfo).port
    try {
      const response = await connectOembed(
        new URL(`http://example.com:${port}/oembed?format=json`),
        '127.0.0.1',
        { signal: AbortSignal.timeout(5_000), headers: { 'user-agent': 'test' } },
      )
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('ok')
      expect(seen).toEqual([{ host: `example.com:${port}`, url: '/oembed?format=json' }])
    }
    finally {
      await new Promise(resolve => server.close(() => resolve(undefined)))
    }
  })
})

import { describe, expect, it } from 'vitest'
import { clientAddress, trustedProxyHops } from '../src/runtime/server/utils/client-address'

describe('trustedProxyHops', () => {
  it('ignores the forwarded header unless a hop count is configured', () => {
    expect(trustedProxyHops(undefined)).toBe(0)
    expect(trustedProxyHops('')).toBe(0)
    expect(trustedProxyHops('false')).toBe(0)
    expect(trustedProxyHops('true')).toBe(1)
    expect(trustedProxyHops('2')).toBe(2)
  })
})

describe('clientAddress', () => {
  it('uses the socket address when no proxy is trusted', () => {
    expect(clientAddress({
      forwardedFor: '203.0.113.5, 198.51.100.8',
      hops: 0,
      socketAddress: '127.0.0.1',
    })).toBe('127.0.0.1')
  })

  it('uses the address appended by one trusted proxy', () => {
    expect(clientAddress({
      forwardedFor: '203.0.113.5, 198.51.100.8',
      hops: 1,
      socketAddress: '10.0.0.2',
    })).toBe('198.51.100.8')
  })

  it('falls back to the socket when the forwarded list is shorter than the hop count', () => {
    expect(clientAddress({
      forwardedFor: '203.0.113.5',
      hops: 2,
      socketAddress: '10.0.0.2',
    })).toBe('10.0.0.2')
  })
})

import { describe, expect, it } from 'vitest'
import {
  authAttemptKeys,
  recordAuthAttemptFailure,
  recordAuthAttemptSuccess,
} from '../src/runtime/server/utils/auth-attempts'
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

describe('authAttemptKeys', () => {
  it('builds separate address, email, and pair buckets', () => {
    expect(authAttemptKeys('login', '127.0.0.1', ' Ada@Example.com ')).toEqual({
      pair: 'login:pair:127.0.0.1:ada@example.com',
      ip: 'login:ip:127.0.0.1',
      email: 'login:email:ada@example.com',
    })
    expect(authAttemptKeys('register', ' ', '')).toEqual({
      pair: 'register:pair:unknown:unknown',
      ip: 'register:ip:unknown',
      email: 'register:email:unknown',
    })
  })

  it('keeps the address bucket after a successful login for that email', () => {
    const ip = '203.0.113.78'
    const first = authAttemptKeys('login', ip, 'ada@example.com')
    recordAuthAttemptFailure(first)
    recordAuthAttemptFailure(first)
    expect(recordAuthAttemptFailure(first).retryAfterMs).toBe(5_000)

    recordAuthAttemptSuccess(first)

    const otherAddress = authAttemptKeys('login', '203.0.113.79', 'ada@example.com')
    expect(recordAuthAttemptFailure(otherAddress).retryAfterMs).toBe(0)

    const sameAddress = authAttemptKeys('login', ip, 'other@example.com')
    expect(recordAuthAttemptFailure(sameAddress).retryAfterMs).toBe(10_000)
  })

  it('blocks one address after failures for several emails', () => {
    const ip = '203.0.113.80'
    const emails = ['a@example.com', 'b@example.com', 'c@example.com']
    let lastRetry = 0
    for (const email of emails) {
      lastRetry = recordAuthAttemptFailure(authAttemptKeys('login', ip, email)).retryAfterMs
    }
    expect(lastRetry).toBe(5_000)

    recordAuthAttemptSuccess('password:91')
    const fourth = authAttemptKeys('login', ip, 'd@example.com')
    expect(recordAuthAttemptFailure(fourth).retryAfterMs).toBe(10_000)
  })
})

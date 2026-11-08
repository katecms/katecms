import { describe, expect, it } from 'vitest'
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  createAuthRateLimiter,
  createWindowRateLimiter,
  hashPassword,
  validateEmail,
  validatePassword,
  verifyPassword,
} from '../src'

describe('hashPassword / verifyPassword', () => {
  it('round-trips a password', async () => {
    const stored = await hashPassword('secret-pass')
    expect(stored.startsWith('scrypt$')).toBe(true)
    expect(await verifyPassword('secret-pass', stored)).toBe(true)
    expect(await verifyPassword('wrong-pass', stored)).toBe(false)
  })

  it('uses a unique salt per hash', async () => {
    const a = await hashPassword('same-password')
    const b = await hashPassword('same-password')
    expect(a).not.toBe(b)
    expect(await verifyPassword('same-password', a)).toBe(true)
    expect(await verifyPassword('same-password', b)).toBe(true)
  })

  it('rejects malformed hashes without throwing', async () => {
    expect(await verifyPassword('secret-pass', '')).toBe(false)
    expect(await verifyPassword('secret-pass', 'bcrypt$salt$hash')).toBe(false)
    expect(await verifyPassword('secret-pass', 'scrypt$onlysalt')).toBe(false)
  })

  it('embeds scrypt parameters and still verifies legacy hashes', async () => {
    const stored = await hashPassword('secret-pass')
    expect(stored.split('$')).toHaveLength(6)

    const { promisify } = await import('node:util')
    const { randomBytes, scrypt: scryptCb } = await import('node:crypto')
    const scrypt = promisify(scryptCb)
    const salt = randomBytes(16)
    const derived = await scrypt('legacy-pass', salt, 64) as Buffer
    const legacy = `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
    expect(await verifyPassword('legacy-pass', legacy)).toBe(true)
    expect(await verifyPassword('wrong-pass', legacy)).toBe(false)
  })

  it('rejects oversized passwords in hash and verify', async () => {
    const tooLong = 'x'.repeat(MAX_PASSWORD_LENGTH + 1)
    await expect(hashPassword(tooLong)).rejects.toThrow(String(MAX_PASSWORD_LENGTH))
    expect(await verifyPassword(tooLong, 'scrypt$1$1$1$aa$bb')).toBe(false)
  })

  it('rejects a disallowed scrypt cost without throwing', async () => {
    const salt = 'ab'.repeat(16)
    const hash = 'cd'.repeat(64)
    await expect(verifyPassword('secret-pass', `scrypt$3$8$1$${salt}$${hash}`)).resolves.toBe(false)
    await expect(verifyPassword('secret-pass', `scrypt$999999999$8$1$${salt}$${hash}`)).resolves.toBe(false)
  })

  it('rejects an odd-length salt and a hash that is not 64 bytes', async () => {
    const salt = 'ab'.repeat(16)
    const hash = 'cd'.repeat(64)
    await expect(verifyPassword('secret-pass', `scrypt$16384$8$1$abc$${hash}`)).resolves.toBe(false)
    await expect(verifyPassword('secret-pass', `scrypt$16384$8$1$${salt}$${'cd'.repeat(63)}`)).resolves.toBe(false)
  })
})

describe('validateEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(validateEmail('ada@example.com')).toEqual({ ok: true })
    expect(validateEmail('a.b+c@mail.co.uk')).toEqual({ ok: true })
  })

  it('rejects empty or malformed values', () => {
    expect(validateEmail('')).toMatchObject({ ok: false })
    expect(validateEmail('not-an-email')).toMatchObject({ ok: false })
    expect(validateEmail('ada@example')).toMatchObject({ ok: false })
    expect(validateEmail('ada@.com')).toMatchObject({ ok: false })
  })
})

describe('validatePassword', () => {
  it('accepts a password within bounds', () => {
    expect(validatePassword('12345678')).toEqual({ ok: true })
  })

  it('rejects passwords that are too short or too long', () => {
    const short = validatePassword('1234567')
    expect(short.ok).toBe(false)
    if (!short.ok) {
      expect(short.error).toContain(String(MIN_PASSWORD_LENGTH))
    }

    const long = validatePassword('x'.repeat(MAX_PASSWORD_LENGTH + 1))
    expect(long.ok).toBe(false)
    if (!long.ok) {
      expect(long.error).toContain(String(MAX_PASSWORD_LENGTH))
    }
  })
})

describe('createAuthRateLimiter', () => {
  it('allows the first failures then imposes a cooldown', () => {
    let now = 1_000
    const limiter = createAuthRateLimiter({
      maxAttempts: 3,
      delayMs: 5_000,
      maxDelayMs: 30_000,
      now: () => now,
    })

    expect(limiter.check('user').allowed).toBe(true)
    expect(limiter.recordFailure('user').retryAfterMs).toBe(0)
    expect(limiter.recordFailure('user').retryAfterMs).toBe(0)
    const locked = limiter.recordFailure('user')
    expect(locked.allowed).toBe(false)
    expect(locked.retryAfterMs).toBe(5_000)

    expect(limiter.check('user')).toEqual({ allowed: false, retryAfterMs: 5_000 })
    now += 4_999
    expect(limiter.check('user').allowed).toBe(false)
    now += 1
    expect(limiter.check('user').allowed).toBe(true)
  })

  it('clears the count on success and after the inactivity window', () => {
    let now = 0
    const limiter = createAuthRateLimiter({
      maxAttempts: 2,
      delayMs: 1_000,
      windowMs: 10_000,
      now: () => now,
    })

    limiter.recordFailure('a')
    limiter.recordSuccess('a')
    expect(limiter.check('a').allowed).toBe(true)

    limiter.recordFailure('b')
    limiter.recordFailure('b')
    expect(limiter.check('b').allowed).toBe(false)
    now += 10_000
    expect(limiter.check('b').allowed).toBe(true)
  })

  it('clears only the key passed to recordSuccess', () => {
    const limiter = createAuthRateLimiter({
      maxAttempts: 3,
      delayMs: 5_000,
      now: () => 0,
    })

    limiter.recordFailure('login:ip:203.0.113.10')
    limiter.recordFailure('login:ip:203.0.113.10')
    limiter.recordFailure('login:ip:203.0.113.10')
    limiter.recordSuccess('login:email:ada@example.com')

    expect(limiter.check('login:ip:203.0.113.10').allowed).toBe(false)
    expect(limiter.check('login:email:ada@example.com').allowed).toBe(true)
  })
})

describe('createWindowRateLimiter', () => {
  it('allows a fixed number of hits per window and then refuses', () => {
    let now = 5_000
    const limiter = createWindowRateLimiter({
      max: 2,
      windowMs: 1_000,
      now: () => now,
    })

    expect(limiter.consume('submit:1')).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(limiter.consume('submit:1')).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(limiter.consume('submit:1')).toEqual({ allowed: false, retryAfterMs: 1_000 })
    expect(limiter.consume('submit:2')).toEqual({ allowed: true, retryAfterMs: 0 })

    now += 1_000
    expect(limiter.consume('submit:1')).toEqual({ allowed: true, retryAfterMs: 0 })
  })
})

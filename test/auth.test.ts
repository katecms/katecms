import { describe, expect, it } from 'vitest'
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  hashPassword,
  validateEmail,
  validatePassword,
  verifyPassword,
} from '../src/core'

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

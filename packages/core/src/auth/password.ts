import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import type { ScryptOptions } from 'node:crypto'
import { MAX_PASSWORD_LENGTH } from './account'

/**
 * `promisify(scrypt)` only types the 3-arg overload, so options are rejected.
 * Wrap the callback form ourselves to keep N/r/p in the Promise API.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derived) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derived)
    })
  })
}

const SALT_BYTES = 16
const KEY_LENGTH = 64
const ALGORITHM = 'scrypt'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1

/**
 * Hash a plaintext password with a per-password random salt.
 *
 * Format: `scrypt$N$r$p$<saltHex>$<hashHex>`. Legacy `scrypt$<saltHex>$<hashHex>`
 * hashes (Node defaults) are still accepted by {@link verifyPassword}.
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters.`)
  }
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  })
  return `${ALGORITHM}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`
}

const HEX = /^[0-9a-f]+$/i

/** Even-length hex. Odd length or other characters never reach scrypt. */
function evenHex(value: string | undefined): value is string {
  return typeof value === 'string' && value.length % 2 === 0 && HEX.test(value)
}

/**
 * Constant-time verification of a plaintext password against a stored hash.
 * Returns false (rather than throwing) for malformed hashes and for any
 * scrypt cost other than the parameters {@link hashPassword} writes.
 * Legacy `scrypt$<saltHex>$<hashHex>` hashes use those same Node defaults.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    return false
  }
  const parts = stored.split('$')
  if (parts[0] !== ALGORITHM) {
    return false
  }

  let saltHex: string | undefined
  let hashHex: string | undefined

  if (parts.length === 3) {
    saltHex = parts[1]
    hashHex = parts[2]
  }
  else if (parts.length === 6) {
    if (parts[1] !== String(SCRYPT_N) || parts[2] !== String(SCRYPT_R) || parts[3] !== String(SCRYPT_P)) {
      return false
    }
    saltHex = parts[4]
    hashHex = parts[5]
  }
  else {
    return false
  }

  if (!evenHex(saltHex) || !evenHex(hashHex) || hashHex.length !== KEY_LENGTH * 2) {
    return false
  }

  try {
    const expected = Buffer.from(hashHex, 'hex')
    const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    })
    if (derived.length !== expected.length) {
      return false
    }
    return timingSafeEqual(derived, expected)
  }
  catch {
    return false
  }
}

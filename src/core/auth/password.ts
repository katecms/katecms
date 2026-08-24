import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)

// 16-byte salt + 64-byte derived key are comfortably above current guidance.
const SALT_BYTES = 16
const KEY_LENGTH = 64
const ALGORITHM = 'scrypt'

/**
 * Hash a plaintext password with a per-password random salt.
 *
 * Uses Node's built-in scrypt (no third-party dependency). The returned string
 * is self-describing — `scrypt$<saltHex>$<hashHex>` — so `verifyPassword` can
 * recover the salt without a separate column.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `${ALGORITHM}$${salt.toString('hex')}$${derived.toString('hex')}`
}

/**
 * Constant-time verification of a plaintext password against a stored hash.
 * Returns false (rather than throwing) for malformed/legacy hashes.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = stored.split('$')
  if (algorithm !== ALGORITHM || !saltHex || !hashHex) {
    return false
  }

  const expected = Buffer.from(hashHex, 'hex')
  const derived = (await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer

  // Lengths must match before timingSafeEqual, which throws on length mismatch.
  if (derived.length !== expected.length) {
    return false
  }
  return timingSafeEqual(derived, expected)
}

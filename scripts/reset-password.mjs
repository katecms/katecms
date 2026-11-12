/**
 * Set a new password for an account when the old one is forgotten.
 * This needs shell access to the server and the database file or URL.
 * It can reset the owner. The admin UI cannot change the owner.
 *
 * SQLite:
 *   node scripts/reset-password.mjs --db playground/data/katecms.db --email owner@example.com --password "New-password-123"
 *
 * Postgres:
 *   node scripts/reset-password.mjs --url postgres://user:pass@127.0.0.1:5432/katecms --email owner@example.com --password "New-password-123"
 */
import { createPostgresDb, createSqliteDb, findUserByEmail, hashPassword, updateUser, validatePassword } from '../packages/core/dist/index.mjs'

function arg(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return ''
  }
  return process.argv[index + 1] || ''
}

const dbPath = arg('--db')
const url = arg('--url')
const email = arg('--email').trim()
const password = arg('--password')

if ((!dbPath && !url) || !email || !password) {
  console.error('Usage: node scripts/reset-password.mjs --db <sqlite> | --url <postgres> --email <email> --password <password>')
  process.exit(1)
}

const passwordCheck = validatePassword(password)
if (!passwordCheck.ok) {
  console.error(passwordCheck.error)
  process.exit(1)
}

const db = url ? createPostgresDb(url) : createSqliteDb({ filename: dbPath })
const user = await findUserByEmail(db, email)
if (!user) {
  console.error('User not found.')
  process.exit(1)
}

await updateUser(db, user.id, { password_hash: await hashPassword(password) })
console.log(`Password updated for ${user.email}.`)
await db.destroy()

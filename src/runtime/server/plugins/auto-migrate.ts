import { defineNitroPlugin } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { migratePostgres, migrateSqlite } from '../../../core/database/migrations'
import { resolveDatabaseTarget } from '../../../core/database/client'

function trimEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export default defineNitroPlugin(async () => {
  const database = useRuntimeConfig().miraicms?.database
  const driver = trimEnv(database?.driver)
  const url = trimEnv(database?.url)
    || (driver === 'postgres' ? trimEnv(process.env.DATABASE_URL) : '')

  const target = resolveDatabaseTarget({
    driver,
    url,
    sqliteFilename: database?.sqliteFilename,
  })

  if (target.driver === 'postgres') {
    await migratePostgres(target.url)
    return
  }

  await migrateSqlite({ filename: target.filename })
})

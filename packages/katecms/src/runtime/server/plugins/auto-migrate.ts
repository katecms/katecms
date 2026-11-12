import { defineNitroPlugin } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import {
  createPostgresDb,
  migratePostgres,
  migrateSqlite,
  resolveDatabaseTarget,
  syncCollectionFieldIndexes,
} from '@katecms/core'
import type { Collections } from '@katecms/core'

function trimEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export default defineNitroPlugin(async () => {
  const katecms = useRuntimeConfig().katecms
  const database = katecms?.database
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
    const db = createPostgresDb(target.url)
    try {
      const result = await syncCollectionFieldIndexes(
        db,
        (katecms?.collections ?? {}) as Collections,
      )
      for (const warning of result.warnings) {
        console.warn(`[KateCMS] ${warning}`)
      }
      if (result.created.length > 0 || result.dropped.length > 0) {
        console.info(
          `[KateCMS] Field indexes: created ${result.created.length}, dropped ${result.dropped.length}`,
        )
      }
    }
    finally {
      await db.destroy()
    }
    return
  }

  await migrateSqlite({ filename: target.filename })
})

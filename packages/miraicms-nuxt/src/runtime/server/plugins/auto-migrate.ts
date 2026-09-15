import { defineNitroPlugin } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import {
  createPostgresDb,
  migratePostgres,
  migrateSqlite,
  resolveDatabaseTarget,
  syncCollectionFieldIndexes,
} from '@miraicms/core'
import type { Collections } from '@miraicms/core'

function trimEnv(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export default defineNitroPlugin(async () => {
  const miraicms = useRuntimeConfig().miraicms
  const database = miraicms?.database
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
        (miraicms?.collections ?? {}) as Collections,
      )
      for (const warning of result.warnings) {
        console.warn(`[MiraiCMS] ${warning}`)
      }
      if (result.created.length > 0 || result.dropped.length > 0) {
        console.info(
          `[MiraiCMS] Field indexes: created ${result.created.length}, dropped ${result.dropped.length}`,
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

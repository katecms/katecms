import { defineNitroPlugin } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { migrateSqlite } from '../../../database/migrations'

export default defineNitroPlugin(async () => {
  const filename = useRuntimeConfig().miraicmsSqliteFilename
  if (typeof filename !== 'string' || filename.length === 0) {
    throw new Error('[MiraiCMS] miraicmsSqliteFilename is not set in runtimeConfig.')
  }
  await migrateSqlite({ filename })
})

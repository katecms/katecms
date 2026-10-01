import { defineNitroPlugin } from 'nitropack/runtime'
import { ensureFormTables } from '../utils/schema'

export default defineNitroPlugin(async () => {
  await ensureFormTables()
})

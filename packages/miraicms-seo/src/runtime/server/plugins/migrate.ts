import { defineNitroPlugin } from 'nitropack/runtime'
import { ensureSeoTable } from '../utils/documents'

export default defineNitroPlugin(async () => {
  await ensureSeoTable()
})

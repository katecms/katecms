import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { useRuntimeConfig } from '#imports'
import { setOption } from '@katecms/core'
import { getDb } from '../../../utils/db'
import { requireUser } from '../../../utils/session'
import { requirePermission } from '../../../utils/permissions'
import {
  optionFlags,
  optionPageFields,
  readFields,
  readOptionPageSlug,
  requireOptionFields,
  requireOptionPage,
  resolveOptionValues,
  toOptionMeta,
} from '../../../utils/options'
import type { OptionPageResponse } from '../../../../utils/options'

interface PatchBody {
  fields?: unknown
}

/** Save one options page (fields JSON on `options.key` = page slug). */
export default defineEventHandler(async (event): Promise<OptionPageResponse> => {
  const actor = await requireUser(event)
  const slug = readOptionPageSlug(getRouterParam(event, 'page'))
  const def = requireOptionPage(slug)
  const roles = useRuntimeConfig().katecms?.roles ?? {}
  requirePermission(actor, 'options', 'update', roles, slug)

  const body = await readBody<PatchBody>(event)
  const schema = optionPageFields(def.fields)
  const fields = readFields(body?.fields)
  requireOptionFields(schema, fields)

  const db = getDb()
  const row = await setOption(db, slug, fields)
  const flags = optionFlags(actor, roles, slug)

  return {
    page: toOptionMeta(slug, def),
    values: resolveOptionValues(schema, row?.value),
    canRead: flags.canRead,
    canUpdate: flags.canUpdate,
  }
})

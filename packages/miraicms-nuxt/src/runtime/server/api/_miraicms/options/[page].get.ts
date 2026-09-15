import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { findOption } from '@miraicms/core'
import { getDb } from '../../../utils/db'
import { getCurrentUser } from '../../../utils/session'
import {
  optionFlags,
  optionPageFields,
  readOptionPageSlug,
  requireOptionPage,
  resolveOptionValues,
  toOptionMeta,
} from '../../../utils/options'
import type { OptionPageResponse } from '../../../../utils/options'

/**
 * Load one options page. Values are public site settings.
 * `canRead` / `canUpdate` reflect the current session (both false when logged out).
 */
export default defineEventHandler(async (event): Promise<OptionPageResponse> => {
  const slug = readOptionPageSlug(getRouterParam(event, 'page'))
  const def = requireOptionPage(slug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  const actor = await getCurrentUser(event)
  const flags = optionFlags(actor, roles, slug)
  const row = await findOption(getDb(), slug)
  const fields = optionPageFields(def.fields)

  return {
    page: toOptionMeta(slug, def),
    values: resolveOptionValues(fields, row?.value),
    canRead: flags.canRead,
    canUpdate: flags.canUpdate,
  }
})

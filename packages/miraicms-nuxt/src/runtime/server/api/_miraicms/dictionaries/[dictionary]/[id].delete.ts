import { defineEventHandler, getRouterParam } from 'h3'
import { useRuntimeConfig } from '#imports'
import { deleteDictionary, findDictionaryById } from '@miraicms/core'
import { getDb } from '../../../../utils/db'
import { requireUser } from '../../../../utils/session'
import { requirePermission } from '../../../../utils/permissions'
import {
  fail,
  readDictionarySlug,
  readEntryId,
  requireDictionary,
  toDictionaryMeta,
} from '../../../../utils/dictionaries'
import type { AdminDictionaryMeta } from '../../../../../utils/dictionaries'

/** Permanently delete a dictionary term. Child terms become top-level. */
export default defineEventHandler(async (event): Promise<{ dictionary: AdminDictionaryMeta, ok: true }> => {
  const actor = await requireUser(event)
  const dictionarySlug = readDictionarySlug(getRouterParam(event, 'dictionary'))
  const id = readEntryId(getRouterParam(event, 'id'))
  const def = requireDictionary(dictionarySlug)
  const roles = useRuntimeConfig().miraicms?.roles ?? {}
  requirePermission(actor, 'dictionaries', 'delete', roles, dictionarySlug)

  const db = getDb()
  const existing = await findDictionaryById(db, id)
  if (!existing || existing.type !== dictionarySlug) {
    fail(404, 'Term not found.')
  }

  await deleteDictionary(db, id)

  return {
    dictionary: toDictionaryMeta(dictionarySlug, def),
    ok: true,
  }
})

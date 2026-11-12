import { useRuntimeConfig } from '#imports'
import { sql } from 'kysely'
import {
  buildPublicPath,
  buildSlugPathMap,
  isCollectionPublic,
  isDictionaryPublic,
  loadCollectionSlugPath,
} from '@katecms/core'
import type { SeoEditorPayload, SeoEntry, SeoImageChoice, SeoSite } from '../../types'
import { getSeoDb } from './db'
import { readEntrySeo, readSite, readTermSeo } from './documents'

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    }
    catch {
      return {}
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function urlsFromValue(value: unknown): string[] {
  if (!value) {
    return []
  }
  if (typeof value === 'string') {
    return value.startsWith('/') || /^https?:\/\//i.test(value) ? [value] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => urlsFromValue(item))
  }
  if (typeof value === 'object' && 'url' in value && typeof value.url === 'string' && value.url) {
    return [value.url]
  }
  return []
}

function imageChoices(
  fields: Record<string, { type?: string, label?: string }> | undefined,
  values: Record<string, unknown>,
): SeoImageChoice[] {
  const choices: SeoImageChoice[] = []
  const seen = new Set<string>()
  for (const [key, field] of Object.entries(fields ?? {})) {
    if (field?.type !== 'image') {
      continue
    }
    for (const url of urlsFromValue(values[key])) {
      if (seen.has(url)) {
        continue
      }
      seen.add(url)
      choices.push({ label: field.label || key, url })
    }
  }
  return choices
}

function payload(
  entry: SeoEntry,
  site: SeoSite,
  fallbackTitle: string,
  publicPath: string,
  choices: SeoImageChoice[],
): SeoEditorPayload {
  return {
    ...entry,
    fallbackTitle,
    publicPath,
    site,
    imageChoices: choices,
  }
}

export async function entryEditorPayload(entryId: number): Promise<SeoEditorPayload | undefined> {
  const row = await sql<{ title: string, type: string, fields: unknown }>`
    SELECT title, type, fields FROM collections WHERE id = ${entryId}
  `.execute(getSeoDb())
  const entry = row.rows[0]
  if (!entry) {
    return undefined
  }
  const collections = useRuntimeConfig().katecms?.collections ?? {}
  const def = collections[entry.type]
  let publicPath = ''
  if (def && isCollectionPublic(def)) {
    const slugPath = await loadCollectionSlugPath(getSeoDb(), entry.type, entryId)
    if (slugPath) {
      publicPath = buildPublicPath(def.rewrite, entry.type, slugPath)
    }
  }
  return payload(
    await readEntrySeo(entryId),
    await readSite(),
    entry.title,
    publicPath,
    imageChoices(def?.fields, asRecord(entry.fields)),
  )
}

export async function termEditorPayload(termId: number): Promise<SeoEditorPayload | undefined> {
  const current = await sql<{ title: string, type: string, fields: unknown }>`
    SELECT title, type, fields FROM dictionaries WHERE id = ${termId}
  `.execute(getSeoDb())
  const term = current.rows[0]
  if (!term) {
    return undefined
  }
  const rows = await sql<{ id: number, slug: string, parent_id: number | null }>`
    SELECT id, slug, parent_id FROM dictionaries WHERE type = ${term.type}
  `.execute(getSeoDb())
  const slugPath = buildSlugPathMap(rows.rows).get(termId) ?? ''
  const dictionaries = useRuntimeConfig().katecms?.dictionaries ?? {}
  const def = dictionaries[term.type]
  const publicPath = def && isDictionaryPublic(def) && slugPath
    ? buildPublicPath(def.rewrite, term.type, slugPath)
    : ''
  return payload(
    await readTermSeo(termId),
    await readSite(),
    term.title,
    publicPath,
    imageChoices(dictionaries[term.type]?.fields, asRecord(term.fields)),
  )
}

import { createError, defineEventHandler, getQuery } from 'h3'
import { fetchOembed } from '@miraicms/core'

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const result = await fetchOembed({
    url: queryString(query.url) ?? '',
    maxwidth: queryString(query.maxwidth),
    maxheight: queryString(query.maxheight),
  })

  if (!result.ok) {
    throw createError({
      statusCode: result.status,
      statusMessage: result.error,
    })
  }

  return result.data
})

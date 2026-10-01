import { defineEventHandler, getQuery } from 'h3'
import { resolveRedirect } from '../utils/redirects'

export default defineEventHandler(async (event) => {
  const path = getQuery(event).path
  const found = await resolveRedirect(typeof path === 'string' ? path : '')
  return found ?? { to: null, statusCode: 301 }
})

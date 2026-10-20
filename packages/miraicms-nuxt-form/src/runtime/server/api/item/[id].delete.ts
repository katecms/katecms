import { createError, defineEventHandler, getRouterParam } from 'h3'
import { requireFormAccess } from '../../utils/access'
import { deleteForm } from '../../utils/forms'

export default defineEventHandler(async (event) => {
  await requireFormAccess(event, 'delete')
  await deleteForm(routeId(event))
  return { ok: true }
})

function routeId(event: Parameters<typeof getRouterParam>[0]): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 404, statusMessage: 'Form not found.' })
  }
  return id
}

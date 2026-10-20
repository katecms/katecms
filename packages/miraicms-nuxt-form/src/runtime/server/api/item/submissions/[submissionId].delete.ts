import { defineEventHandler, getRouterParam } from 'h3'
import { requireFormAccess } from '../../../utils/access'
import { deleteFormSubmission, missingForm } from '../../../utils/submissions'

export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await requireFormAccess(event, 'delete')
  const removed = await deleteFormSubmission(positiveId(getRouterParam(event, 'id')), positiveId(getRouterParam(event, 'submissionId')))
  if (!removed) {
    missingForm()
  }
  return { ok: true }
})

function positiveId(raw: string | undefined): number {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 0
}

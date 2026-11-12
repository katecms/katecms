import { defineEventHandler, getRouterParam, setHeader } from 'h3'
import { requireFormAccess } from '../../../../../utils/access'
import { missingForm, readSubmissionFile } from '../../../../../utils/submissions'

export default defineEventHandler(async (event) => {
  await requireFormAccess(event, 'read')
  const file = await readSubmissionFile(
    positiveId(getRouterParam(event, 'id')),
    positiveId(getRouterParam(event, 'submissionId')),
    wholeId(getRouterParam(event, 'index')),
  )
  if (!file) {
    missingForm()
  }
  const name = file.name.replace(/[\r\n"]/g, '') || 'file'
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Content-Disposition', `attachment; filename="${name}"`)
  setHeader(event, 'Content-Type', 'application/octet-stream')
  return file.data
})

function positiveId(raw: string | undefined): number {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : 0
}

function wholeId(raw: string | undefined): number {
  const id = Number(raw)
  return Number.isInteger(id) && id >= 0 ? id : -1
}

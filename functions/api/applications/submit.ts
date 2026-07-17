import {
  json,
  requirePlatformActor,
  type Env,
} from '../../_shared/auth'
import { getAgencyBucket, getClientBucket } from '../../_shared/buckets'
import {
  copyVerified,
  readApplications,
  upsertApplication,
  type StoredApplication,
} from '../../_shared/applications'
import {
  findActiveOrgById,
  readOrgs,
  selectOrgForDestination,
} from '../../_shared/orgs'

interface DraftDocument {
  key: string
  name: string
  uploadedAt: string
  documentTypeId?: string
}

interface SubmitBody {
  destinationCountry?: string
  visaType?: string
  orgId?: string
  passportCountry?: string
  passportType?: string
  hasAdditionalDocs?: boolean | null
  clientName?: string
  clientEmail?: string
  answers?: Record<string, string>
  documents?: DraftDocument[]
  resubmissionOf?: string
}

function sanitizeFileName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  return sanitized || 'file'
}

const MAX_OPEN = 3
const MAX_PER_DAY = 2

/** Atomic applicant submission: application record + remapped documents (no client encryption). */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const actor = await requirePlatformActor(context.request, context.env)
    if (actor.role === 'admin' || actor.role === 'agency') {
      return json({ error: 'Only applicants can submit visa applications' }, 403)
    }

    const body = (await context.request.json()) as SubmitBody
    const destinationCountry = body.destinationCountry?.trim().toUpperCase()
    const visaType = body.visaType?.trim()
    const clientName = body.clientName?.trim()
    if (!destinationCountry || !visaType) {
      return json({ error: 'destinationCountry and visaType are required' }, 400)
    }
    if (!clientName) {
      return json({ error: 'Full legal name is required' }, 400)
    }
    if (!body.answers || typeof body.answers !== 'object') {
      return json({ error: 'answers are required' }, 400)
    }
    if (!Array.isArray(body.documents) || body.documents.length === 0) {
      return json({ error: 'At least one document is required' }, 400)
    }

    const orgs = await readOrgs(context.env)
    let org =
      (body.orgId?.trim() && findActiveOrgById(orgs, body.orgId.trim())) ||
      selectOrgForDestination(orgs, destinationCountry)
    if (!org) {
      return json({ error: 'No reviewing agency is available for this destination' }, 400)
    }
    if (!(org.countries ?? []).map((c) => c.toUpperCase()).includes(destinationCountry)) {
      return json({ error: 'Selected agency does not cover this destination' }, 400)
    }

    const existing = await readApplications(context.env)
    const mine = existing.filter((a) => a.userId === actor.uid)
    const open = mine.filter(
      (a) =>
        a.status === 'submitted' ||
        a.status === 'reviewing' ||
        a.status === 'awaiting_payment' ||
        a.status === 'payment_processing',
    )
    if (open.length >= MAX_OPEN) {
      return json({ error: `You already have ${MAX_OPEN} open applications` }, 429)
    }
    const today = new Date().toISOString().slice(0, 10)
    const submittedToday = mine.filter((a) => a.submittedAt.startsWith(today)).length
    if (submittedToday >= MAX_PER_DAY) {
      return json({ error: `Daily submission limit of ${MAX_PER_DAY} reached` }, 429)
    }

    const client = getClientBucket(context.env)
    const agency = getAgencyBucket(context.env)
    const applicationId = `app-${crypto.randomUUID()}`
    const remappedDocs: StoredApplication['documents'] = []

    for (const doc of body.documents) {
      const sourceKey = doc.key?.trim()
      if (!sourceKey || !sourceKey.startsWith(`users/${actor.uid}/`)) {
        return json({ error: `Invalid draft document key: ${sourceKey || '(empty)'}` }, 400)
      }
      const head = await client.head(sourceKey)
      if (!head) {
        return json({ error: `Draft document not found: ${sourceKey}` }, 400)
      }
      if (head.customMetadata?.userId && head.customMetadata.userId !== actor.uid) {
        return json({ error: 'Draft document ownership mismatch' }, 403)
      }

      const safeName = sanitizeFileName(doc.name || 'document')
      const typeId = doc.documentTypeId || head.customMetadata?.documentTypeId || 'document'
      const destKey = `applicants/${destinationCountry}/${applicationId}/${typeId}_${Date.now()}_${safeName}`

      await copyVerified(client, agency, sourceKey, destKey, {
        userId: actor.uid,
        orgId: org.id,
        applicationId,
        documentTypeId: typeId,
        destinationCountry,
        visaType,
        originalName: doc.name || safeName,
        encrypted: 'false',
        storageFormat: 'server-readable-v1',
      })

      remappedDocs.push({
        id: destKey,
        name: doc.name || safeName,
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        documentTypeId: typeId,
      })
    }

    const application: StoredApplication = {
      id: applicationId,
      userId: actor.uid,
      status: 'submitted',
      destinationCountry,
      visaType,
      submittedAt: new Date().toISOString(),
      storageFormat: 'server-readable-v1',
      encrypted: false,
      answers: body.answers,
      orgId: org.id,
      passportCountry: body.passportCountry?.trim().toUpperCase() || undefined,
      passportType: body.passportType?.trim() || undefined,
      hasAdditionalDocs:
        typeof body.hasAdditionalDocs === 'boolean' ? body.hasAdditionalDocs : undefined,
      clientName,
      clientEmail: body.clientEmail?.trim().toLowerCase() || actor.email?.toLowerCase(),
      documents: remappedDocs,
      resubmissionOf: body.resubmissionOf?.trim() || undefined,
    }

    await upsertApplication(context.env, application)

    for (const doc of body.documents) {
      const sourceKey = doc.key?.trim()
      if (sourceKey) await client.delete(sourceKey)
    }

    return json({
      ok: true,
      applicationId,
      application,
      documents: remappedDocs,
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Submit failed' }, 500)
  }
}

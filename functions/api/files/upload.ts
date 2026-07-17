import { json, requireFirebaseUid, sanitizeFileName, type Env } from '../../_shared/auth'
import { getAgencyBucket, getClientBucket } from '../../_shared/buckets'

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
])

interface UploadFields {
  documentTypeId: string
  destinationCountry: string
  visaType: string
  fileName: string
  applicationId?: string
  orgId?: string
}

function readFields(form: FormData): UploadFields {
  const documentTypeId = String(form.get('documentTypeId') ?? '').trim()
  const destinationCountry = String(form.get('destinationCountry') ?? '')
    .trim()
    .toUpperCase()
  const visaType = String(form.get('visaType') ?? '').trim()
  const fileName = String(form.get('fileName') ?? '').trim()
  const applicationId = String(form.get('applicationId') ?? '').trim() || undefined
  const orgId = String(form.get('orgId') ?? '').trim() || undefined
  if (!documentTypeId || !destinationCountry || !visaType || !fileName) {
    throw json(
      { error: 'documentTypeId, destinationCountry, visaType, and fileName are required' },
      400,
    )
  }
  return {
    documentTypeId,
    destinationCountry,
    visaType,
    fileName,
    applicationId,
    orgId,
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { uid } = await requireFirebaseUid(context.request, context.env)
    const form = await context.request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return json({ error: 'file is required' }, 400)
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return json({ error: `File must be between 1 byte and ${MAX_BYTES} bytes` }, 400)
    }

    const fields = readFields(form)
    const contentType = (file.type || 'application/octet-stream').toLowerCase()
    if (!ALLOWED_MIME.has(contentType)) {
      return json({ error: `Unsupported file type: ${contentType}` }, 400)
    }

    const safeName = sanitizeFileName(fields.fileName || file.name)
    const appSegment = fields.applicationId ?? 'draft'
    const isUserOwnedDraft = !fields.applicationId || fields.applicationId === 'draft'
    const key = isUserOwnedDraft
      ? `users/${uid}/documents/${fields.destinationCountry}_${fields.visaType}_${fields.documentTypeId}_${Date.now()}_${safeName}`
      : `applicants/${fields.destinationCountry}/${appSegment}/${fields.documentTypeId}_${Date.now()}_${safeName}`

    const bucket = isUserOwnedDraft ? getClientBucket(context.env) : getAgencyBucket(context.env)

    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType },
      customMetadata: {
        userId: uid,
        documentTypeId: fields.documentTypeId,
        destinationCountry: fields.destinationCountry,
        visaType: fields.visaType,
        originalName: file.name,
        encrypted: 'false',
        storageFormat: 'server-readable-v1',
        orgId: fields.orgId || '',
      },
    })

    return json({
      key,
      name: file.name,
      url: `/api/files?key=${encodeURIComponent(key)}`,
      uploadedAt: new Date().toISOString(),
      documentTypeId: fields.documentTypeId,
      destinationCountry: fields.destinationCountry,
      visaType: fields.visaType,
    })
  } catch (error) {
    if (error instanceof Response) return error
    return json({ error: error instanceof Error ? error.message : 'Upload failed' }, 500)
  }
}

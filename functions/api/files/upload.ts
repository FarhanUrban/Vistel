import { json, requireFirebaseUid, sanitizeFileName, type Env } from '../../_shared/auth'

interface UploadFields {
  documentTypeId: string
  destinationCountry: string
  visaType: string
  fileName: string
}

function readFields(form: FormData): UploadFields {
  const documentTypeId = String(form.get('documentTypeId') ?? '').trim()
  const destinationCountry = String(form.get('destinationCountry') ?? '')
    .trim()
    .toUpperCase()
  const visaType = String(form.get('visaType') ?? '').trim()
  const fileName = String(form.get('fileName') ?? '').trim()
  if (!documentTypeId || !destinationCountry || !visaType || !fileName) {
    throw json(
      { error: 'documentTypeId, destinationCountry, visaType, and fileName are required' },
      400,
    )
  }
  return { documentTypeId, destinationCountry, visaType, fileName }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { uid } = await requireFirebaseUid(context.request, context.env)
    if (!context.env.CLIENT_DATA) {
      return json({ error: 'R2 bucket CLIENT_DATA is not bound' }, 500)
    }

    const form = await context.request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return json({ error: 'file is required' }, 400)
    }

    const fields = readFields(form)
    const safeName = sanitizeFileName(fields.fileName || file.name)
    const key = `users/${uid}/documents/${fields.destinationCountry}_${fields.visaType}_${fields.documentTypeId}_${Date.now()}_${safeName}`

    await context.env.CLIENT_DATA.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        userId: uid,
        documentTypeId: fields.documentTypeId,
        destinationCountry: fields.destinationCountry,
        visaType: fields.visaType,
        originalName: file.name,
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

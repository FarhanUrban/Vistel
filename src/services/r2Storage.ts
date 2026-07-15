import { getFirebaseAuth } from './api'

export async function getFirebaseIdToken(): Promise<string> {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user) {
    throw new Error('You must be signed in to upload documents')
  }
  return user.getIdToken()
}

export interface R2UploadResult {
  key: string
  name: string
  url: string
  uploadedAt: string
  documentTypeId: string
  destinationCountry: string
  visaType: string
}

export async function uploadDocumentToR2(
  file: File,
  meta: {
    documentTypeId: string
    destinationCountry: string
    visaType: string
  },
): Promise<R2UploadResult> {
  const token = await getFirebaseIdToken()
  const form = new FormData()
  form.set('file', file)
  form.set('documentTypeId', meta.documentTypeId)
  form.set('destinationCountry', meta.destinationCountry)
  form.set('visaType', meta.visaType)
  form.set('fileName', file.name)

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  })

  const payload = (await response.json().catch(() => ({}))) as R2UploadResult & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || 'R2 upload failed')
  }
  return payload
}

export async function wipeUserR2Data(): Promise<void> {
  const token = await getFirebaseIdToken()
  const response = await fetch('/api/account/r2-wipe', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Failed to delete cloud files')
  }
}

/** Authenticated fetch for an R2-backed document URL like `/api/files?key=...`. */
export async function fetchR2DocumentBlob(url: string): Promise<Blob> {
  const token = await getFirebaseIdToken()
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error('Failed to download document')
  }
  return response.blob()
}

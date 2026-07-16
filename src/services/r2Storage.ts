import type { EncryptedEnvelope } from '@/types'
import { getFirebaseAuth } from './api'

async function getFirebaseIdToken(): Promise<string> {
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
    applicationId?: string
  },
): Promise<R2UploadResult> {
  const token = await getFirebaseIdToken()
  const form = new FormData()
  form.set('file', file)
  form.set('documentTypeId', meta.documentTypeId)
  form.set('destinationCountry', meta.destinationCountry)
  form.set('visaType', meta.visaType)
  form.set('fileName', file.name)
  if (meta.applicationId) form.set('applicationId', meta.applicationId)

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  const payload = (await response.json().catch(() => ({}))) as R2UploadResult & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || 'R2 upload failed')
  }
  return payload
}

export async function uploadEncryptedBlobToR2(
  envelope: EncryptedEnvelope,
  meta: {
    documentTypeId: string
    destinationCountry: string
    visaType: string
    fileName: string
    applicationId: string
  },
): Promise<R2UploadResult> {
  const token = await getFirebaseIdToken()
  const blob = new Blob([JSON.stringify(envelope)], { type: 'application/json' })
  const form = new FormData()
  form.set('file', blob, `${meta.fileName}.enc.json`)
  form.set('documentTypeId', meta.documentTypeId)
  form.set('destinationCountry', meta.destinationCountry)
  form.set('visaType', meta.visaType)
  form.set('fileName', meta.fileName)
  form.set('applicationId', meta.applicationId)
  form.set('encrypted', 'true')

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  const payload = (await response.json().catch(() => ({}))) as R2UploadResult & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error || 'R2 encrypted upload failed')
  }
  return payload
}

export async function wipeUserR2Data(): Promise<void> {
  const token = await getFirebaseIdToken()
  const response = await fetch('/api/account/r2-wipe', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Failed to delete cloud files')
  }
}

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

export async function registerCountryPublicKey(
  iso2: string,
  publicKeyJwk: JsonWebKey,
  orgId: string,
): Promise<void> {
  let authHeader: string | null = null
  try {
    const token = await getFirebaseIdToken()
    authHeader = `Bearer ${token}`
  } catch {
    const { buildPortalAuthHeader, readPortalSession } = await import('./portalToken')
    const { useAuthStore } = await import('@/features/auth/store')
    const user = useAuthStore().user ?? readPortalSession()
    if (user) authHeader = await buildPortalAuthHeader(user)
  }
  if (!authHeader) {
    throw new Error('You must be signed in to register a country key')
  }

  const response = await fetch('/api/country-keys/register', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ iso2, publicKeyJwk, orgId }),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error || 'Failed to register country key')
  }
}

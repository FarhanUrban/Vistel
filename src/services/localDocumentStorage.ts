import type { UploadedDocument, VisaApplication, VisaType } from '@/types'

const DOCS_KEY = 'vislet_uploaded_docs'
const APPS_KEY = 'vislet_applications'

interface StoredDocRecord {
  id: string
  userId: string
  name: string
  uploadedAt: string
  documentTypeId?: string
}

function loadDocs(): StoredDocRecord[] {
  const raw = localStorage.getItem(DOCS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as StoredDocRecord[]
  } catch {
    return []
  }
}

function saveDocs(docs: StoredDocRecord[]): void {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs))
}

function loadApps(): VisaApplication[] {
  const raw = localStorage.getItem(APPS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as VisaApplication[]
  } catch {
    return []
  }
}

function saveApps(apps: VisaApplication[]): void {
  localStorage.setItem(APPS_KEY, JSON.stringify(apps))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Simulates an upload — stores metadata in localStorage only (no cloud). */
export async function pretendUploadDocument(
  file: File,
  userId: string,
  documentTypeId?: string,
): Promise<UploadedDocument> {
  await delay(400)

  const uploadedAt = new Date().toISOString()
  const id = `local_${userId}_${documentTypeId ?? 'doc'}_${Date.now()}`
  const record: StoredDocRecord = {
    id,
    userId,
    name: file.name,
    uploadedAt,
    documentTypeId,
  }

  const docs = loadDocs().filter(
    (doc) => !(doc.userId === userId && doc.documentTypeId === documentTypeId),
  )
  docs.push(record)
  saveDocs(docs)

  return {
    id,
    name: file.name,
    url: URL.createObjectURL(file),
    uploadedAt,
    documentTypeId,
  }
}

export function getStoredDocuments(userId: string): UploadedDocument[] {
  return loadDocs()
    .filter((doc) => doc.userId === userId)
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.uploadedAt,
      documentTypeId: doc.documentTypeId,
      url: `local://${doc.id}`,
    }))
}

export function clearStoredDocuments(userId: string): void {
  saveDocs(loadDocs().filter((doc) => doc.userId !== userId))
}

export function saveLocalApplication(
  userId: string,
  destinationCountry: string,
  visaType: VisaType,
): string {
  const id = `app-${Date.now()}`
  const application: VisaApplication = {
    id,
    userId,
    status: 'submitted',
    destinationCountry,
    visaType,
    submittedAt: new Date().toISOString(),
  }
  saveApps([...loadApps(), application])
  return id
}

export function getLocalApplications(userId: string): VisaApplication[] {
  return loadApps().filter((app) => app.userId === userId)
}

export function getLocalApplicationById(applicationId: string): VisaApplication | null {
  return loadApps().find((app) => app.id === applicationId) ?? null
}

export function clearLocalApplications(userId: string): void {
  saveApps(loadApps().filter((app) => app.userId !== userId))
}

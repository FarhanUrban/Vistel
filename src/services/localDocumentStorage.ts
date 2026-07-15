import type { UploadedDocument, VisaApplication, VisaType } from '@/types'

const DOCS_KEY = 'vislet_uploaded_docs'
const APPS_KEY = 'vislet_applications'

interface StoredDocRecord {
  id: string
  userId: string
  name: string
  uploadedAt: string
  documentTypeId?: string
  destinationCountry?: string
  visaType?: VisaType
}

export interface DocumentScope {
  destinationCountry: string
  visaType: VisaType
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

function sameScope(doc: StoredDocRecord, scope: DocumentScope): boolean {
  return (
    doc.destinationCountry?.toUpperCase() === scope.destinationCountry.toUpperCase() &&
    doc.visaType === scope.visaType
  )
}

/** Simulates an upload — stores metadata in localStorage only (no cloud). */
export async function pretendUploadDocument(
  file: File,
  userId: string,
  documentTypeId: string,
  scope: DocumentScope,
): Promise<UploadedDocument> {
  await delay(400)

  if (!documentTypeId) {
    throw new Error('Document type is required')
  }

  const uploadedAt = new Date().toISOString()
  const id = `local_${userId}_${scope.destinationCountry}_${scope.visaType}_${documentTypeId}_${Date.now()}`
  const record: StoredDocRecord = {
    id,
    userId,
    name: file.name,
    uploadedAt,
    documentTypeId,
    destinationCountry: scope.destinationCountry.toUpperCase(),
    visaType: scope.visaType,
  }

  const docs = loadDocs().filter(
    (doc) =>
      !(doc.userId === userId && doc.documentTypeId === documentTypeId && sameScope(doc, scope)),
  )
  docs.push(record)
  saveDocs(docs)

  return {
    id,
    name: file.name,
    url: URL.createObjectURL(file),
    uploadedAt,
    documentTypeId,
    destinationCountry: record.destinationCountry,
    visaType: record.visaType,
  }
}

export function getStoredDocuments(userId: string, scope?: DocumentScope): UploadedDocument[] {
  return loadDocs()
    .filter((doc) => {
      if (doc.userId !== userId) return false
      if (!scope) return true
      // Legacy unscoped docs only match when no destination was stored
      if (!doc.destinationCountry || !doc.visaType) return false
      return sameScope(doc, scope)
    })
    .map((doc) => ({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.uploadedAt,
      documentTypeId: doc.documentTypeId,
      destinationCountry: doc.destinationCountry,
      visaType: doc.visaType,
      url: `local://${doc.id}`,
    }))
}

export function clearStoredDocuments(userId: string, scope?: DocumentScope): void {
  if (!scope) {
    saveDocs(loadDocs().filter((doc) => doc.userId !== userId))
    return
  }
  saveDocs(loadDocs().filter((doc) => !(doc.userId === userId && sameScope(doc, scope))))
}

export function saveLocalApplication(
  userId: string,
  destinationCountry: string,
  visaType: VisaType,
  documents: Pick<UploadedDocument, 'id' | 'name' | 'uploadedAt' | 'documentTypeId'>[] = [],
  answers: Record<string, string> = {},
): string {
  const id = `app-${Date.now()}`
  const application: VisaApplication = {
    id,
    userId,
    status: 'submitted',
    destinationCountry,
    visaType,
    submittedAt: new Date().toISOString(),
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.uploadedAt,
      documentTypeId: doc.documentTypeId,
    })),
    answers,
  }
  saveApps([...loadApps(), application])
  return id
}

export function updateLocalApplication(
  applicationId: string,
  patch: Partial<VisaApplication>,
): VisaApplication {
  const apps = loadApps()
  const index = apps.findIndex((app) => app.id === applicationId)
  if (index === -1) {
    throw new Error('Application not found')
  }
  apps[index] = { ...apps[index], ...patch }
  saveApps(apps)
  return apps[index]
}

export function getLocalApplications(userId: string): VisaApplication[] {
  return loadApps().filter((app) => app.userId === userId)
}

export function getLocalApplicationById(applicationId: string): VisaApplication | null {
  return loadApps().find((app) => app.id === applicationId) ?? null
}

export function getEveryLocalApplication(): VisaApplication[] {
  return loadApps()
}

export function saveLocalAgencyApplication(
  agencyId: string,
  clientName: string,
  clientEmail: string,
  destinationCountry: string,
  visaType: VisaType,
  documents: Pick<UploadedDocument, 'id' | 'name' | 'uploadedAt' | 'documentTypeId'>[] = [],
  answers: Record<string, string> = {},
): string {
  const id = `app-${Date.now()}`
  const application: VisaApplication = {
    id,
    userId: agencyId, // store as agency user
    agencyId,
    clientName,
    clientEmail,
    status: 'submitted',
    destinationCountry,
    visaType,
    submittedAt: new Date().toISOString(),
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.uploadedAt,
      documentTypeId: doc.documentTypeId,
    })),
    answers,
  }
  saveApps([...loadApps(), application])
  return id
}

export function clearLocalApplications(userId: string): void {
  saveApps(loadApps().filter((app) => app.userId !== userId))
}

/** Clears all Vislet localStorage keys used by the app (full reset). */
export function wipeAllVisletLocalData(): void {
  localStorage.removeItem(DOCS_KEY)
  localStorage.removeItem(APPS_KEY)
  localStorage.removeItem('vislet_onboarding')
  localStorage.removeItem('vislet_onboarding_drafts')
  localStorage.removeItem('vislet_mock_user')
}

/** Visa validity length from payment date. */
export function visaExpiryFromPaidAt(paidAt: string, visaType: VisaType): string {
  const days = visaType === 'e-visa' ? 90 : visaType === 'tourist' ? 180 : 365
  const date = new Date(paidAt)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

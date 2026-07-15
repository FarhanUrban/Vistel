import type { UploadedDocument, VisaApplication, VisaType } from '@/types'

const DOCS_KEY = 'vislet_uploaded_docs'
const APPS_KEY = 'vislet_applications'
const PORTAL_USER_KEY = 'vislet_portal_user'
const MAX_REJECTED_APPS_PER_USER = 10

interface StoredDocRecord {
  id: string
  userId: string
  name: string
  uploadedAt: string
  documentTypeId?: string
  destinationCountry?: string
  visaType?: VisaType
  url?: string
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
  localStorage.setItem(APPS_KEY, JSON.stringify(pruneRejectedApps(apps)))
}

/** Keep storage bounded: at most N rejected apps per userId. */
function pruneRejectedApps(apps: VisaApplication[]): VisaApplication[] {
  const rejectedByUser = new Map<string, VisaApplication[]>()
  const keep: VisaApplication[] = []

  for (const app of apps) {
    if (app.status !== 'rejected') {
      keep.push(app)
      continue
    }
    const list = rejectedByUser.get(app.userId) ?? []
    list.push(app)
    rejectedByUser.set(app.userId, list)
  }

  for (const list of rejectedByUser.values()) {
    list
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, MAX_REJECTED_APPS_PER_USER)
      .forEach((app) => keep.push(app))
  }

  return keep
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

function isActiveApp(app: VisaApplication): boolean {
  return app.status !== 'rejected'
}

function upsertUserApplication(application: VisaApplication): string {
  const apps = loadApps()
  const existingIndex = apps.findIndex(
    (app) =>
      app.userId === application.userId &&
      !app.agencyId &&
      app.destinationCountry.toUpperCase() === application.destinationCountry.toUpperCase() &&
      app.visaType === application.visaType &&
      isActiveApp(app),
  )

  if (existingIndex >= 0) {
    const keptId = apps[existingIndex].id
    apps[existingIndex] = { ...application, id: keptId }
    saveApps(apps)
    return keptId
  }

  saveApps([...apps, application])
  return application.id
}

function upsertAgencyApplication(application: VisaApplication): string {
  const apps = loadApps()
  const clientKey = (application.clientEmail || application.clientName || '').toLowerCase()
  const existingIndex = apps.findIndex(
    (app) =>
      app.agencyId === application.agencyId &&
      (app.clientEmail || app.clientName || '').toLowerCase() === clientKey &&
      app.destinationCountry.toUpperCase() === application.destinationCountry.toUpperCase() &&
      app.visaType === application.visaType &&
      isActiveApp(app),
  )

  if (existingIndex >= 0) {
    const keptId = apps[existingIndex].id
    apps[existingIndex] = { ...application, id: keptId }
    saveApps(apps)
    return keptId
  }

  saveApps([...apps, application])
  return application.id
}

/** Persist document metadata (local, R2, or firebase) without growing duplicates. */
export function upsertStoredDocumentMeta(
  userId: string,
  documentTypeId: string,
  scope: DocumentScope,
  meta: { id: string; name: string; uploadedAt: string; url?: string },
): UploadedDocument {
  const record: StoredDocRecord = {
    id: meta.id,
    userId,
    name: meta.name,
    uploadedAt: meta.uploadedAt,
    documentTypeId,
    destinationCountry: scope.destinationCountry.toUpperCase(),
    visaType: scope.visaType,
    url: meta.url,
  }

  const docs = loadDocs().filter(
    (doc) =>
      !(
        doc.userId === userId &&
        doc.documentTypeId === documentTypeId &&
        (sameScope(doc, scope) || !doc.destinationCountry || !doc.visaType)
      ),
  )
  docs.push(record)
  saveDocs(docs)

  return {
    id: record.id,
    name: record.name,
    url: record.url ?? `local://${record.id}`,
    uploadedAt: record.uploadedAt,
    documentTypeId,
    destinationCountry: record.destinationCountry,
    visaType: record.visaType,
  }
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
  const objectUrl = URL.createObjectURL(file)

  try {
    return upsertStoredDocumentMeta(userId, documentTypeId, scope, {
      id,
      name: file.name,
      uploadedAt,
      url: objectUrl,
    })
  } finally {
    // Revoke after a tick so callers can use the URL briefly if needed.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  }
}

export function getStoredDocuments(userId: string, scope?: DocumentScope): UploadedDocument[] {
  return loadDocs()
    .filter((doc) => {
      if (doc.userId !== userId) return false
      if (!scope) return true
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
      url: doc.url ?? `local://${doc.id}`,
    }))
}

export function clearStoredDocuments(userId: string, scope?: DocumentScope): void {
  if (!scope) {
    saveDocs(loadDocs().filter((doc) => doc.userId !== userId))
    return
  }
  saveDocs(
    loadDocs().filter(
      (doc) =>
        !(
          doc.userId === userId &&
          (sameScope(doc, scope) || !doc.destinationCountry || !doc.visaType)
        ),
    ),
  )
}

export function saveLocalApplication(
  userId: string,
  destinationCountry: string,
  visaType: VisaType,
  documents: Pick<UploadedDocument, 'id' | 'name' | 'uploadedAt' | 'documentTypeId'>[] = [],
  answers: Record<string, string> = {},
): string {
  const application: VisaApplication = {
    id: `app-${Date.now()}`,
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
  return upsertUserApplication(application)
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
  const application: VisaApplication = {
    id: `app-${Date.now()}`,
    userId: agencyId,
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
  return upsertAgencyApplication(application)
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
  localStorage.removeItem(PORTAL_USER_KEY)
}

/** Visa validity length from payment date. */
export function visaExpiryFromPaidAt(paidAt: string, visaType: VisaType): string {
  const days = visaType === 'e-visa' ? 90 : visaType === 'tourist' ? 180 : 365
  const date = new Date(paidAt)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

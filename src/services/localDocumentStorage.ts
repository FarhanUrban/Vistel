import type { UploadedDocument, VisaApplication, VisaType } from '@/types'
import {
  loadApplicationsMemory,
  saveApplicationsMemory,
  wipePlatformLocalData,
} from './platformStorage'

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

/** In-memory document metadata only — never written to localStorage. */
let docsMemory: StoredDocRecord[] = []

function loadDocs(): StoredDocRecord[] {
  return docsMemory
}

function saveDocs(docs: StoredDocRecord[]): void {
  docsMemory = docs
}

function loadApps(): VisaApplication[] {
  return loadApplicationsMemory()
}

function saveApps(apps: VisaApplication[]): void {
  void saveApplicationsMemory(pruneRejectedApps(apps))
}

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
    // Prefer the incoming id (server-issued UUID) so remapped documents/envelopes stay linked.
    apps[existingIndex] = { ...apps[existingIndex], ...application }
    saveApps(apps)
    return application.id
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
    url: record.url ?? `memory://${record.id}`,
    uploadedAt: record.uploadedAt,
    documentTypeId,
    destinationCountry: record.destinationCountry,
    visaType: record.visaType,
  }
}

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
  const id = `mem_${userId}_${scope.destinationCountry}_${scope.visaType}_${documentTypeId}_${Date.now()}`
  const objectUrl = URL.createObjectURL(file)

  try {
    return upsertStoredDocumentMeta(userId, documentTypeId, scope, {
      id,
      name: file.name,
      uploadedAt,
      url: objectUrl,
    })
  } finally {
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
      url: doc.url ?? `memory://${doc.id}`,
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
  extras: Partial<
    Pick<
      VisaApplication,
      | 'id'
      | 'encrypted'
      | 'encryptedPayloadRef'
      | 'storageFormat'
      | 'agencyId'
      | 'orgId'
      | 'keyId'
      | 'clientName'
      | 'clientEmail'
      | 'passportCountry'
      | 'passportType'
      | 'hasAdditionalDocs'
      | 'submittedAt'
      | 'resubmissionOf'
    >
  > = {},
): string {
  const application: VisaApplication = {
    id: extras.id || `app-${Date.now()}`,
    userId,
    status: 'submitted',
    destinationCountry: destinationCountry.toUpperCase(),
    visaType,
    submittedAt: extras.submittedAt || new Date().toISOString(),
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.uploadedAt,
      documentTypeId: doc.documentTypeId,
    })),
    // Legacy encrypted records omit cleartext answers; new submissions keep them.
    answers: extras.encrypted && extras.storageFormat !== 'server-readable-v1' ? {} : answers,
    ...extras,
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

const LEGACY_LOCAL_KEYS = [
  'vislet_uploaded_docs',
  'vislet_applications',
  'vislet_onboarding',
  'vislet_onboarding_drafts',
  'vislet_mock_user',
  'vislet_portal_user',
  'vislet_agency_orgs',
  'vislet_country_keys',
  'vislet_notifications',
  'vislet_audit_log',
  'vislet_submission_log',
  'vislet_agency_key_vault',
  'vislet_encrypted_payloads',
  'vislet_platform_seeded',
  'vislet_rejection_codes',
  'vislet_payment_history',
  'vislet_org_invite_passwords',
  'vislet_promo_banner',
  'vislet_promo_banner_dismissed',
]

/** Clears legacy localStorage leftovers and in-memory platform state. */
export function wipeAllVisletLocalData(): void {
  docsMemory = []
  for (const key of LEGACY_LOCAL_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
  try {
    sessionStorage.removeItem('vislet_portal_session')
  } catch {
    // ignore
  }
  wipePlatformLocalData()
}

export function visaExpiryFromPaidAt(paidAt: string, visaType: VisaType): string {
  const days = visaType === 'e-visa' ? 90 : visaType === 'tourist' ? 180 : 365
  const date = new Date(paidAt)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

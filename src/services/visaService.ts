import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import type { VisaApplication, VisaApplicationStatus, User } from '@/types'
import { useMockServices, useFirebaseDocumentStorage } from './config'
import { getFirebaseAuth, getFirestoreDb } from './api'
import {
  updateLocalApplication,
  getEveryLocalApplication,
  getLocalApplications,
  getLocalApplicationById,
} from './localDocumentStorage'
import { getAgencyOrg, getApplicationsForOrg, isAdminUser, syncOrgStats } from './agencyOrgService'
import { notifyApplicationDecision } from './notificationService'
import { appendAuditEntry } from './platformStorage'
import {
  mockGetApplications,
  mockGetApplicationStatus,
  mockPollApplicationStatus,
} from './mocks/visaMocks'

function mapApplicationDoc(id: string, data: Record<string, unknown>): VisaApplication {
  return {
    id,
    userId: data.userId as string,
    status: data.status as VisaApplication['status'],
    destinationCountry: data.destinationCountry as string,
    visaType: data.visaType as VisaApplication['visaType'],
    submittedAt: data.submittedAt as string,
    reviewedAt: data.reviewedAt as string | undefined,
    paidAt: data.paidAt as string | undefined,
    expiresAt: data.expiresAt as string | undefined,
    rejectionCode: data.rejectionCode as string | undefined,
    rejectionOther: data.rejectionOther as string | undefined,
    rejectionDetails: data.rejectionDetails as string | undefined,
    acceptanceNote: data.acceptanceNote as string | undefined,
    encrypted: data.encrypted as boolean | undefined,
    encryptedPayloadRef: data.encryptedPayloadRef as string | undefined,
    storageFormat: data.storageFormat as VisaApplication['storageFormat'],
    orgId: data.orgId as string | undefined,
    keyId: data.keyId as string | undefined,
    passportCountry: data.passportCountry as string | undefined,
    passportType: data.passportType as VisaApplication['passportType'],
    hasAdditionalDocs: data.hasAdditionalDocs as boolean | undefined,
    clientName: data.clientName as string | undefined,
    clientEmail: data.clientEmail as string | undefined,
    reviewedByUid: data.reviewedByUid as string | undefined,
    answers: data.answers as VisaApplication['answers'],
    documents: data.documents as VisaApplication['documents'],
    resubmissionOf: data.resubmissionOf as string | undefined,
  }
}

export async function getApplications(userId: string): Promise<VisaApplication[]> {
  if (useMockServices()) {
    const local = getLocalApplications(userId)
    const mocks = await mockGetApplications(userId)
    const byId = new Map<string, VisaApplication>()
    for (const app of mocks) byId.set(app.id, app)
    for (const app of local) byId.set(app.id, app)
    return [...byId.values()]
  }
  if (!useFirebaseDocumentStorage()) {
    return getLocalApplications(userId)
  }
  const db = getFirestoreDb()
  const snapshot = await getDocs(
    query(collection(db, 'applications'), where('userId', '==', userId)),
  )
  return snapshot.docs.map((d) => mapApplicationDoc(d.id, d.data()))
}

export async function getApplication(applicationId: string): Promise<VisaApplication | null> {
  if (useMockServices() || !useFirebaseDocumentStorage()) {
    return getLocalApplicationById(applicationId)
  }
  const db = getFirestoreDb()
  const snapshot = await getDoc(doc(db, 'applications', applicationId))
  if (!snapshot.exists()) return null
  return mapApplicationDoc(snapshot.id, snapshot.data())
}

export async function updateApplication(
  applicationId: string,
  patch: Partial<VisaApplication>,
): Promise<VisaApplication> {
  if (useMockServices() || !useFirebaseDocumentStorage()) {
    return updateLocalApplication(applicationId, patch)
  }
  const db = getFirestoreDb()
  const ref = doc(db, 'applications', applicationId)
  await updateDoc(ref, patch)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) throw new Error('Application not found')
  return mapApplicationDoc(snapshot.id, snapshot.data())
}

export async function getApplicationStatus(applicationId: string): Promise<VisaApplicationStatus> {
  if (useMockServices()) {
    const local = getLocalApplicationById(applicationId)
    if (local) return local.status
    return mockGetApplicationStatus(applicationId)
  }
  if (!useFirebaseDocumentStorage()) {
    const app = getLocalApplicationById(applicationId)
    if (!app) throw new Error('Application not found')
    return app.status
  }
  const db = getFirestoreDb()
  const snapshot = await getDoc(doc(db, 'applications', applicationId))
  if (!snapshot.exists()) {
    throw new Error('Application not found')
  }
  return snapshot.data().status as VisaApplicationStatus
}

export async function pollApplicationStatus(
  applicationId: string,
): Promise<VisaApplication | null> {
  if (useMockServices()) {
    const local = getLocalApplicationById(applicationId)
    if (local) return local
    return mockPollApplicationStatus(applicationId)
  }
  if (!useFirebaseDocumentStorage()) {
    return getLocalApplicationById(applicationId)
  }
  const db = getFirestoreDb()
  const snapshot = await getDoc(doc(db, 'applications', applicationId))
  if (!snapshot.exists()) return null
  return mapApplicationDoc(snapshot.id, snapshot.data())
}

export async function getAllApplications(): Promise<VisaApplication[]> {
  if (useMockServices()) {
    const local = getEveryLocalApplication()
    const mocks = await mockGetApplications('mock-user-1')
    const byId = new Map<string, VisaApplication>()
    for (const app of mocks) byId.set(app.id, app)
    for (const app of local) byId.set(app.id, app)
    return [...byId.values()]
  }
  if (!useFirebaseDocumentStorage()) {
    return getEveryLocalApplication()
  }
  const db = getFirestoreDb()
  const snapshot = await getDocs(collection(db, 'applications'))
  return snapshot.docs.map((d) => mapApplicationDoc(d.id, d.data()))
}

export async function getAgencyApplications(orgId: string): Promise<VisaApplication[]> {
  const org = getAgencyOrg(orgId)
  if (!org) return []
  if (useMockServices() || !useFirebaseDocumentStorage()) {
    return getApplicationsForOrg(org)
  }
  const db = getFirestoreDb()
  const snapshot = await getDocs(collection(db, 'applications'))
  return snapshot.docs
    .map((d) => mapApplicationDoc(d.id, d.data()))
    .filter((app) => {
      if (app.orgId) return app.orgId === orgId
      const countries = new Set(org.countries.map((c) => c.toUpperCase()))
      return countries.has(app.destinationCountry.toUpperCase())
    })
}

export interface ReviewApplicationInput {
  applicationId: string
  orgId: string
  actorUid: string
  actorEmail?: string
  actorRole?: User['role']
  decision: 'approve' | 'reject'
  acceptanceNote?: string
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
}

async function postServerDecision(
  input: ReviewApplicationInput,
): Promise<VisaApplication | null> {
  const { buildPortalAuthHeader, readPortalSession } = await import('./portalToken')
  let authHeader: string | null = null
  try {
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    if (token) authHeader = `Bearer ${token}`
  } catch {
    // portal
  }
  if (!authHeader) {
    const portal = readPortalSession()
    if (portal) authHeader = await buildPortalAuthHeader(portal)
  }
  if (!authHeader) return null

  const response = await fetch('/api/applications/decision', {
    method: 'POST',
    credentials: 'include',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      applicationId: input.applicationId,
      orgId: input.orgId,
      decision: input.decision,
      acceptanceNote: input.acceptanceNote,
      rejectionCode: input.rejectionCode,
      rejectionOther: input.rejectionOther,
      rejectionDetails: input.rejectionDetails,
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    application?: VisaApplication
  }
  if (!response.ok || !payload.application) {
    throw new Error(payload.error || 'Decision failed')
  }
  return payload.application
}

export async function reviewApplication(input: ReviewApplicationInput): Promise<VisaApplication> {
  if (input.actorRole === 'admin') {
    throw new Error(
      'Admins cannot review applications. Only agency organizations can approve or reject visas.',
    )
  }
  if (
    isAdminUser({
      id: input.actorUid,
      email: input.actorEmail ?? '',
      role: input.actorRole,
    })
  ) {
    throw new Error('Admins cannot review applications.')
  }

  if (input.decision === 'reject') {
    if (!input.rejectionCode && !input.rejectionOther?.trim()) {
      throw new Error('Rejection requires a code or custom reason')
    }
    if (input.rejectionCode === 'OTHER' && !input.rejectionOther?.trim()) {
      throw new Error('Custom reason is required when rejection code is OTHER')
    }
  }

  const org = getAgencyOrg(input.orgId)
  if (!org || !org.active) {
    throw new Error('Agency organization not found or inactive')
  }

  const app = await getApplication(input.applicationId)
  if (!app) throw new Error('Application not found')
  if (app.status !== 'submitted' && app.status !== 'reviewing') {
    throw new Error('Application is not pending review')
  }

  if (app.orgId && app.orgId !== input.orgId) {
    throw new Error('This application is assigned to a different agency.')
  }

  const dest = app.destinationCountry.toUpperCase()
  const allowed = new Set(org.countries.map((c) => c.toUpperCase()))
  if (!allowed.has(dest)) {
    throw new Error(
      `This application is destined for ${dest}, which is outside your organization's assigned destinations.`,
    )
  }

  // Prefer authorized server decision (persists notification + application atomically).
  if (!useMockServices()) {
    try {
      const remote = await postServerDecision(input)
      if (remote) {
        const updated = await updateApplication(input.applicationId, remote)
        notifyApplicationDecision({
          userId: app.userId,
          applicationId: app.id,
          status: updated.status,
          rejectionCode: updated.rejectionCode,
          rejectionOther: updated.rejectionOther,
          rejectionDetails: updated.rejectionDetails,
          acceptanceNote: updated.acceptanceNote,
        })
        appendAuditEntry({
          actorUid: input.actorUid,
          orgId: input.orgId,
          action: input.decision === 'approve' ? 'application_approved' : 'application_rejected',
          applicationId: app.id,
        })
        syncOrgStats(input.orgId)
        return updated
      }
    } catch (error) {
      // Fall through only for mock/local; otherwise surface server validation errors.
      if (!useFirebaseDocumentStorage() && useMockServices()) {
        // continue
      } else {
        throw error
      }
    }
  }

  const patch: Partial<VisaApplication> = {
    reviewedAt: new Date().toISOString(),
    orgId: input.orgId,
    reviewedByUid: input.actorUid,
  }

  if (input.decision === 'approve') {
    patch.status = 'awaiting_payment'
    patch.acceptanceNote = input.acceptanceNote
    patch.rejectionCode = undefined
    patch.rejectionOther = undefined
    patch.rejectionDetails = undefined
  } else {
    patch.status = 'rejected'
    patch.rejectionCode = input.rejectionCode || 'OTHER'
    patch.rejectionOther = input.rejectionOther
    patch.rejectionDetails = input.rejectionDetails
    patch.acceptanceNote = undefined
  }

  const updated = await updateApplication(input.applicationId, patch)

  notifyApplicationDecision({
    userId: app.userId,
    applicationId: app.id,
    status: updated.status,
    rejectionCode: updated.rejectionCode,
    rejectionOther: updated.rejectionOther,
    rejectionDetails: updated.rejectionDetails,
    acceptanceNote: updated.acceptanceNote,
  })

  appendAuditEntry({
    actorUid: input.actorUid,
    orgId: input.orgId,
    action: input.decision === 'approve' ? 'application_approved' : 'application_rejected',
    applicationId: app.id,
  })

  syncOrgStats(input.orgId)
  return updated
}

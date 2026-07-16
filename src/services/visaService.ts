import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import type { VisaApplication, VisaApplicationStatus, User } from '@/types'
import { useMockServices, useFirebaseDocumentStorage } from './config'
import { getFirestoreDb } from './api'
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
    encrypted: data.encrypted as boolean | undefined,
    encryptedPayloadRef: data.encryptedPayloadRef as string | undefined,
    orgId: data.orgId as string | undefined,
    answers: data.answers as VisaApplication['answers'],
    documents: data.documents as VisaApplication['documents'],
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
  rejectionCode?: string
  rejectionOther?: string
  rejectionDetails?: string
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

  const patch: Partial<VisaApplication> = {
    reviewedAt: new Date().toISOString(),
    orgId: input.orgId,
  }

  if (input.decision === 'approve') {
    patch.status = 'awaiting_payment'
  } else {
    patch.status = 'rejected'
    patch.rejectionCode = input.rejectionCode
    patch.rejectionOther = input.rejectionOther
    patch.rejectionDetails = input.rejectionDetails
  }

  const updated = await updateApplication(input.applicationId, patch)

  notifyApplicationDecision({
    userId: app.userId,
    applicationId: app.id,
    status: updated.status,
    rejectionCode: updated.rejectionCode,
    rejectionOther: updated.rejectionOther,
    rejectionDetails: updated.rejectionDetails,
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

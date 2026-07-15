import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import type { VisaApplication, VisaApplicationStatus } from '@/types'
import { useMockServices, useFirebaseDocumentStorage } from './config'
import { getFirestoreDb } from './api'
import {
  getLocalApplicationById,
  getLocalApplications,
  updateLocalApplication,
  getEveryLocalApplication,
} from './localDocumentStorage'
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

export async function getAgencyApplications(agencyId: string): Promise<VisaApplication[]> {
  if (useMockServices()) {
    return getEveryLocalApplication().filter((app) => app.agencyId === agencyId)
  }
  if (!useFirebaseDocumentStorage()) {
    return getEveryLocalApplication().filter((app) => app.agencyId === agencyId)
  }
  const db = getFirestoreDb()
  const snapshot = await getDocs(
    query(collection(db, 'applications'), where('agencyId', '==', agencyId)),
  )
  return snapshot.docs.map((d) => mapApplicationDoc(d.id, d.data()))
}

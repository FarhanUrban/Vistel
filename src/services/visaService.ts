import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import type { VisaApplication, VisaApplicationStatus } from '@/types'
import { useMockServices } from './config'
import { getFirestoreDb } from './api'
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
    rejectionCode: data.rejectionCode as string | undefined,
  }
}

export async function getApplications(userId: string): Promise<VisaApplication[]> {
  if (useMockServices()) {
    return mockGetApplications(userId)
  }
  const db = getFirestoreDb()
  const snapshot = await getDocs(
    query(collection(db, 'applications'), where('userId', '==', userId)),
  )
  return snapshot.docs.map((d) => mapApplicationDoc(d.id, d.data()))
}

export async function getApplicationStatus(applicationId: string): Promise<VisaApplicationStatus> {
  if (useMockServices()) {
    return mockGetApplicationStatus(applicationId)
  }
  const db = getFirestoreDb()
  const snapshot = await getDoc(doc(db, 'applications', applicationId))
  if (!snapshot.exists()) {
    throw new Error('Application not found')
  }
  return snapshot.data().status as VisaApplicationStatus
}

export async function pollApplicationStatus(applicationId: string): Promise<VisaApplication | null> {
  if (useMockServices()) {
    return mockPollApplicationStatus(applicationId)
  }
  const db = getFirestoreDb()
  const snapshot = await getDoc(doc(db, 'applications', applicationId))
  if (!snapshot.exists()) return null
  return mapApplicationDoc(snapshot.id, snapshot.data())
}

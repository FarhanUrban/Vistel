import type { Interview } from '@/types'
import { useMockServices, useFirebaseDocumentStorage } from './config'
import { mockGetInterviews, mockAddInterview } from './mocks/interviewsMocks'

function mapInterviewDoc(id: string, data: Record<string, unknown>): Interview {
  return {
    id,
    userId: data.userId as string | undefined,
    applicationId: data.applicationId as string,
    scheduledAt: data.scheduledAt as string,
    location: data.location as string,
    scheduledBy: data.scheduledBy as Interview['scheduledBy'],
    notes: data.notes as string | undefined,
  }
}

export async function getInterviews(userId: string): Promise<Interview[]> {
  if (useMockServices()) {
    return mockGetInterviews(userId)
  }
  if (!useFirebaseDocumentStorage()) {
    return []
  }
  const { collection, getDocs, query, where } = await import('firebase/firestore')
  const { getFirestoreDb } = await import('./api')
  const db = getFirestoreDb()
  const snapshot = await getDocs(query(collection(db, 'interviews'), where('userId', '==', userId)))
  return snapshot.docs.map((d) => mapInterviewDoc(d.id, d.data()))
}

export async function addInterview(
  userId: string,
  interview: Omit<Interview, 'id'>,
): Promise<Interview> {
  if (useMockServices()) {
    return mockAddInterview(interview)
  }
  if (!useFirebaseDocumentStorage()) {
    return { ...interview, id: `int-${Date.now()}`, userId }
  }
  const { addDoc, collection } = await import('firebase/firestore')
  const { getFirestoreDb } = await import('./api')
  const db = getFirestoreDb()
  const docRef = await addDoc(collection(db, 'interviews'), {
    ...interview,
    userId,
  })
  return { ...interview, id: docRef.id, userId }
}

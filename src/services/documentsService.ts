import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { RequiredDocument, UploadedDocument, VisaType } from '@/types'
import { useMockServices } from './config'
import { getFirebaseStorage } from './api'
import {
  mockGetRequiredDocuments,
  mockUploadDocument,
  mockSubmitApplication,
} from './mocks/documentsMocks'
import requiredDocsData from './data/requiredDocuments.json'

export async function getRequiredDocuments(
  destinationCountry: string,
  visaType: VisaType,
): Promise<RequiredDocument[]> {
  if (useMockServices()) {
    return mockGetRequiredDocuments(destinationCountry, visaType)
  }
  const key = `${destinationCountry.toLowerCase()}_${visaType}`
  const docs = (requiredDocsData as Record<string, RequiredDocument[]>)[key]
  if (docs) return docs
  return (requiredDocsData as Record<string, RequiredDocument[]>).default ?? []
}

export async function uploadDocument(file: File, userId: string): Promise<UploadedDocument> {
  if (useMockServices()) {
    return mockUploadDocument(file)
  }
  const storage = getFirebaseStorage()
  const path = `users/${userId}/documents/${Date.now()}_${file.name}`
  const ref = storageRef(storage, path)
  await uploadBytes(ref, file)
  const url = await getDownloadURL(ref)
  return {
    id: path,
    name: file.name,
    url,
    uploadedAt: new Date().toISOString(),
  }
}

export async function submitApplication(applicationId: string): Promise<void> {
  if (useMockServices()) {
    return mockSubmitApplication(applicationId)
  }
  // Firestore write would go here when backend is wired
  console.info('[documentsService] submitApplication', { applicationId })
}

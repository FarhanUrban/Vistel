import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { RequiredDocument, UploadedDocument, VisaType } from '@/types'
import { useMockServices, useFirebaseDocumentStorage } from './config'
import { getFirebaseStorage } from './api'
import { iso2ToLegacySlug } from './visaIndexService'
import {
  type DocumentScope,
  getStoredDocuments,
  pretendUploadDocument,
  saveLocalApplication,
} from './localDocumentStorage'
import {
  mockGetRequiredDocuments,
  mockSubmitApplication,
} from './mocks/documentsMocks'
import requiredDocsData from './data/requiredDocuments.json'

export interface SubmitApplicationInput {
  userId: string
  destinationCountry: string
  visaType: VisaType
  documents: UploadedDocument[]
}

function sanitizeStorageFileName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  return sanitized || 'file'
}

function formatStorageError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (
    message.includes('storage/unauthorized') ||
    message.includes('storage/unauthenticated') ||
    message.includes('CORS') ||
    message.includes('network')
  ) {
    return 'Cloud storage unavailable.'
  }
  return message || 'Upload failed'
}

export async function getUserDocuments(
  userId: string,
  scope?: DocumentScope,
): Promise<UploadedDocument[]> {
  // Always prefer scoped local storage (mock + local backend)
  return getStoredDocuments(userId, scope)
}

export async function getRequiredDocuments(
  destinationCountry: string,
  visaType: VisaType,
): Promise<RequiredDocument[]> {
  if (useMockServices()) {
    return mockGetRequiredDocuments(destinationCountry, visaType)
  }
  const legacySlug =
    destinationCountry.length === 2
      ? iso2ToLegacySlug(destinationCountry)
      : destinationCountry.toLowerCase()
  const key = `${legacySlug}_${visaType}`
  const docs = (requiredDocsData as Record<string, RequiredDocument[]>)[key]
  if (docs) return docs
  return (requiredDocsData as Record<string, RequiredDocument[]>).default ?? []
}

export async function uploadDocument(
  file: File,
  userId: string,
  documentTypeId: string,
  scope: DocumentScope,
): Promise<UploadedDocument> {
  if (!documentTypeId) {
    throw new Error('Document type is required')
  }

  if (useMockServices()) {
    const uploaded = await pretendUploadDocument(file, userId, documentTypeId, scope)
    return uploaded
  }

  if (!useFirebaseDocumentStorage()) {
    return pretendUploadDocument(file, userId, documentTypeId, scope)
  }

  const storage = getFirebaseStorage()
  const safeName = sanitizeStorageFileName(file.name)
  const path = `users/${userId}/documents/${scope.destinationCountry}_${scope.visaType}_${documentTypeId}_${Date.now()}_${safeName}`
  const ref = storageRef(storage, path)
  try {
    await uploadBytes(ref, file)
    const url = await getDownloadURL(ref)
    // Also mirror locally for UI status while using cloud storage
    await pretendUploadDocument(file, userId, documentTypeId, scope)
    return {
      id: path,
      name: file.name,
      url,
      uploadedAt: new Date().toISOString(),
      documentTypeId,
      destinationCountry: scope.destinationCountry,
      visaType: scope.visaType,
    }
  } catch (error) {
    throw new Error(formatStorageError(error))
  }
}

export async function submitApplication(input: SubmitApplicationInput): Promise<string> {
  const documentMeta = input.documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    uploadedAt: doc.uploadedAt,
    documentTypeId: doc.documentTypeId,
  }))

  if (useMockServices()) {
    await mockSubmitApplication(`app-${Date.now()}`)
    return saveLocalApplication(
      input.userId,
      input.destinationCountry,
      input.visaType,
      documentMeta,
    )
  }

  if (!useFirebaseDocumentStorage()) {
    return saveLocalApplication(
      input.userId,
      input.destinationCountry,
      input.visaType,
      documentMeta,
    )
  }

  const { addDoc, collection } = await import('firebase/firestore')
  const { getFirestoreDb } = await import('./api')
  const db = getFirestoreDb()
  const docRef = await addDoc(collection(db, 'applications'), {
    userId: input.userId,
    status: 'submitted',
    destinationCountry: input.destinationCountry,
    visaType: input.visaType,
    submittedAt: new Date().toISOString(),
    documents: input.documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.uploadedAt,
      documentTypeId: doc.documentTypeId,
      storage: 'firebase',
    })),
  })

  return docRef.id
}

import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { addDoc, collection } from 'firebase/firestore'
import type { RequiredDocument, UploadedDocument, VisaType } from '@/types'
import { useMockServices, useFirebaseDocumentStorage } from './config'
import { getFirebaseStorage, getFirestoreDb } from './api'
import { iso2ToLegacySlug } from './visaIndexService'
import { saveLocalDocument } from './localDocumentStorage'
import {
  mockGetRequiredDocuments,
  mockUploadDocument,
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
    return 'Cloud storage unavailable. Use local storage (default) or enable Firebase Storage on a paid plan.'
  }
  return message || 'Upload failed'
}

function serializeDocumentsForFirestore(documents: UploadedDocument[]) {
  return documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    uploadedAt: doc.uploadedAt,
    documentTypeId: doc.documentTypeId,
    storage: useFirebaseDocumentStorage() ? 'firebase' : 'local',
  }))
}

export async function getRequiredDocuments(
  destinationCountry: string,
  visaType: VisaType,
): Promise<RequiredDocument[]> {
  if (useMockServices()) {
    return mockGetRequiredDocuments(destinationCountry, visaType)
  }
  const legacySlug = destinationCountry.length === 2 ? iso2ToLegacySlug(destinationCountry) : destinationCountry.toLowerCase()
  const key = `${legacySlug}_${visaType}`
  const docs = (requiredDocsData as Record<string, RequiredDocument[]>)[key]
  if (docs) return docs
  return (requiredDocsData as Record<string, RequiredDocument[]>).default ?? []
}

export async function uploadDocument(
  file: File,
  userId: string,
  documentTypeId?: string,
): Promise<UploadedDocument> {
  if (useMockServices()) {
    const uploaded = await mockUploadDocument(file)
    return { ...uploaded, documentTypeId }
  }

  if (!useFirebaseDocumentStorage()) {
    return saveLocalDocument(file, userId, documentTypeId)
  }

  const storage = getFirebaseStorage()
  const prefix = documentTypeId ? `${documentTypeId}_` : ''
  const safeName = sanitizeStorageFileName(file.name)
  const path = `users/${userId}/documents/${prefix}${Date.now()}_${safeName}`
  const ref = storageRef(storage, path)
  try {
    await uploadBytes(ref, file)
    const url = await getDownloadURL(ref)
    return {
      id: path,
      name: file.name,
      url,
      uploadedAt: new Date().toISOString(),
      documentTypeId,
    }
  } catch (error) {
    throw new Error(formatStorageError(error))
  }
}

export async function submitApplication(input: SubmitApplicationInput): Promise<string> {
  if (useMockServices()) {
    const applicationId = `app-${Date.now()}`
    await mockSubmitApplication(applicationId)
    return applicationId
  }

  const db = getFirestoreDb()
  const docRef = await addDoc(collection(db, 'applications'), {
    userId: input.userId,
    status: 'submitted',
    destinationCountry: input.destinationCountry,
    visaType: input.visaType,
    submittedAt: new Date().toISOString(),
    documents: serializeDocumentsForFirestore(input.documents),
  })

  return docRef.id
}

import type { EncryptedEnvelope } from '@/types'
import { encryptPayload } from './countryCrypto'
import { assignOrgForDestination, getCountryKeyEntry } from './agencyOrgService'
import { assertCanSubmit, recordSubmission } from './rateLimitService'
import {
  getLocalApplications,
  saveLocalApplication,
  upsertStoredDocumentMeta,
  type DocumentScope,
  pretendUploadDocument,
} from './localDocumentStorage'
import { saveEncryptedPayload } from './platformStorage'
import type { RequiredDocument, UploadedDocument, VisaQuestion, VisaType } from '@/types'
import {
  useMockServices,
  useFirebaseDocumentStorage,
  useR2DocumentStorage,
} from './config'
import { getFirebaseStorage } from './api'
import { iso2ToLegacySlug } from './visaIndexService'
import { mockSubmitApplication } from './mocks/documentsMocks'
import { uploadDocumentToR2, uploadEncryptedBlobToR2 } from './r2Storage'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import requiredDocsData from './data/requiredDocuments.json'
import visaQuestionsData from './data/visaQuestions.json'

export interface SubmitApplicationInput {
  userId: string
  destinationCountry: string
  visaType: VisaType
  documents: UploadedDocument[]
  answers: Record<string, string>
}

export interface EncryptedApplicationPayload {
  answers: Record<string, string>
  documents: Pick<UploadedDocument, 'id' | 'name' | 'uploadedAt' | 'documentTypeId'>[]
  clientName?: string
  clientEmail?: string
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

function lookupByCountryVisa<T>(
  data: Record<string, T>,
  destinationCountry: string,
  visaType: VisaType,
): T | undefined {
  const iso = destinationCountry.toUpperCase()
  const isoKey = `${iso}_${visaType}`
  if (data[isoKey]) return data[isoKey]

  const legacySlug =
    destinationCountry.length === 2
      ? iso2ToLegacySlug(destinationCountry)
      : destinationCountry.toLowerCase()
  const legacyKey = `${legacySlug}_${visaType}`
  if (data[legacyKey]) return data[legacyKey]

  return undefined
}

export async function getUserDocuments(
  userId: string,
  scope?: DocumentScope,
): Promise<UploadedDocument[]> {
  const { getStoredDocuments } = await import('./localDocumentStorage')
  return getStoredDocuments(userId, scope)
}

export async function getRequiredDocuments(
  destinationCountry: string,
  visaType: VisaType,
): Promise<RequiredDocument[]> {
  const table = requiredDocsData as Record<string, RequiredDocument[]>
  return (
    lookupByCountryVisa(table, destinationCountry, visaType) ??
    table.default ??
    []
  )
}

export async function getVisaQuestions(
  destinationCountry: string,
  visaType: VisaType,
): Promise<VisaQuestion[]> {
  const table = visaQuestionsData as Record<string, VisaQuestion[]>
  return (
    lookupByCountryVisa(table, destinationCountry, visaType) ??
    table.default ??
    []
  )
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

  if (useMockServices() || (!useFirebaseDocumentStorage() && !useR2DocumentStorage())) {
    return pretendUploadDocument(file, userId, documentTypeId, scope)
  }

  if (useR2DocumentStorage()) {
    try {
      const countryEntry = getCountryKeyEntry(scope.destinationCountry)
      if (countryEntry?.publicKeyJwk?.n) {
        const { encryptBytes } = await import('./countryCrypto')
        const envelope = await encryptBytes(countryEntry.publicKeyJwk, await file.arrayBuffer())
        const uploaded = await uploadEncryptedBlobToR2(envelope, {
          documentTypeId,
          destinationCountry: scope.destinationCountry,
          visaType: scope.visaType,
          fileName: file.name,
          applicationId: 'pending',
        })
        return upsertStoredDocumentMeta(userId, documentTypeId, scope, {
          id: uploaded.key,
          name: file.name,
          uploadedAt: uploaded.uploadedAt,
          url: uploaded.url,
        })
      }

      const uploaded = await uploadDocumentToR2(file, {
        documentTypeId,
        destinationCountry: scope.destinationCountry,
        visaType: scope.visaType,
      })
      return upsertStoredDocumentMeta(userId, documentTypeId, scope, {
        id: uploaded.key,
        name: uploaded.name,
        uploadedAt: uploaded.uploadedAt,
        url: uploaded.url,
      })
    } catch (error) {
      throw new Error(formatStorageError(error))
    }
  }

  const storage = getFirebaseStorage()
  const safeName = sanitizeStorageFileName(file.name)
  const path = `users/${userId}/documents/${scope.destinationCountry}_${scope.visaType}_${documentTypeId}_${Date.now()}_${safeName}`
  const ref = storageRef(storage, path)
  try {
    await uploadBytes(ref, file)
    const url = await getDownloadURL(ref)
    return upsertStoredDocumentMeta(userId, documentTypeId, scope, {
      id: path,
      name: file.name,
      uploadedAt: new Date().toISOString(),
      url,
    })
  } catch (error) {
    throw new Error(formatStorageError(error))
  }
}

export async function submitApplication(input: SubmitApplicationInput): Promise<string> {
  const userApps = getLocalApplications(input.userId)
  assertCanSubmit(input.userId, input.destinationCountry, userApps)

  const countryEntry = getCountryKeyEntry(input.destinationCountry)
  if (!countryEntry?.publicKeyJwk?.n) {
    throw new Error('Encryption is not configured for this destination yet.')
  }

  const assignedOrgId = assignOrgForDestination(input.destinationCountry)
  if (!assignedOrgId) {
    throw new Error(
      'No agency is available for this destination yet. We are onboarding partners — check back soon.',
    )
  }

  const documentMeta = input.documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    uploadedAt: doc.uploadedAt,
    documentTypeId: doc.documentTypeId,
  }))

  const sensitivePayload: EncryptedApplicationPayload = {
    answers: input.answers,
    documents: documentMeta,
  }

  const envelope = await encryptPayload(countryEntry.publicKeyJwk, sensitivePayload)
  const applicationId =
    useMockServices() || !useFirebaseDocumentStorage()
      ? saveLocalApplication(
          input.userId,
          input.destinationCountry,
          input.visaType,
          [],
          {},
          {
            encrypted: true,
            encryptedPayloadRef: `local://encrypted/${Date.now()}`,
            orgId: assignedOrgId,
          },
        )
      : await (async () => {
          const { addDoc, collection } = await import('firebase/firestore')
          const { getFirestoreDb } = await import('./api')
          const db = getFirestoreDb()
          const docRef = await addDoc(collection(db, 'applications'), {
            userId: input.userId,
            status: 'submitted',
            destinationCountry: input.destinationCountry.toUpperCase(),
            visaType: input.visaType,
            submittedAt: new Date().toISOString(),
            encrypted: true,
            encryptedPayloadRef: 'firestore',
            orgId: assignedOrgId,
          })
          return docRef.id
        })()

  saveEncryptedPayload(applicationId, envelope)
  recordSubmission(input.userId, applicationId)

  if (useMockServices()) {
    await mockSubmitApplication(applicationId)
  }

  const { syncOrgStats } = await import('./agencyOrgService')
  syncOrgStats(assignedOrgId)

  return applicationId
}

export async function decryptApplicationPayload(
  applicationId: string,
  privateKeyJwk: JsonWebKey,
): Promise<EncryptedApplicationPayload> {
  const { getEncryptedPayloadAsync } = await import('./platformStorage')
  const { decryptPayload } = await import('./countryCrypto')
  const envelope = await getEncryptedPayloadAsync(applicationId)
  if (!envelope) throw new Error('Encrypted application data not found')
  return decryptPayload<EncryptedApplicationPayload>(privateKeyJwk, envelope)
}

export type { EncryptedEnvelope }

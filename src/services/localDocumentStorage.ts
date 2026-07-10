import type { UploadedDocument } from '@/types'

const DB_NAME = 'vislet_local_documents'
const DB_VERSION = 1
const STORE_NAME = 'documents'

interface StoredDocument {
  id: string
  userId: string
  name: string
  mimeType: string
  uploadedAt: string
  documentTypeId?: string
  data: ArrayBuffer
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open local document storage'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('userId', 'userId', { unique: false })
      }
    }
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = fn(store)
        request.onerror = () => reject(request.error ?? new Error('Local document storage failed'))
        request.onsuccess = () => resolve(request.result as T)
      }),
  )
}

function sanitizeFileName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
  return sanitized || 'file'
}

export async function saveLocalDocument(
  file: File,
  userId: string,
  documentTypeId?: string,
): Promise<UploadedDocument> {
  const id = `local_${userId}_${documentTypeId ?? 'doc'}_${Date.now()}_${sanitizeFileName(file.name)}`
  const data = await file.arrayBuffer()
  const record: StoredDocument = {
    id,
    userId,
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
    documentTypeId,
    data,
  }

  await runTransaction('readwrite', (store) => store.put(record))

  return {
    id,
    name: file.name,
    url: URL.createObjectURL(file),
    uploadedAt: record.uploadedAt,
    documentTypeId,
  }
}

export async function getLocalDocumentUrl(id: string): Promise<string | null> {
  const record = await runTransaction<StoredDocument | undefined>('readonly', (store) => store.get(id))
  if (!record) return null
  const blob = new Blob([record.data], { type: record.mimeType })
  return URL.createObjectURL(blob)
}

export async function deleteAllLocalDocuments(userId: string): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('userId')
    const request = index.openCursor(IDBKeyRange.only(userId))
    request.onerror = () => reject(request.error ?? new Error('Failed to delete local documents'))
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
        return
      }
      resolve()
    }
  })
}

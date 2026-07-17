import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth'
import { deleteObject, listAll, ref as storageRef } from 'firebase/storage'
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseStorage, getFirestoreDb } from './api'
import {
  useMockServices,
  useFirebaseDocumentStorage,
  useR2DocumentStorage,
} from './config'
import { clearLocalApplications, clearStoredDocuments } from './localDocumentStorage'
import { clearUserNotifications } from './notificationService'
import { clearPlatformDataForUser } from './platformStorage'
import { wipeUserR2Data } from './r2Storage'
import { destroyServerSession } from './sessionService'

const FIRESTORE_WIPE_TIMEOUT_MS = 8_000
const R2_WIPE_TIMEOUT_MS = 45_000
const REAUTH_TIMEOUT_MS = 90_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function deleteStorageFolder(uid: string): Promise<void> {
  const storage = getFirebaseStorage()
  const folderRef = storageRef(storage, `users/${uid}/documents`)

  async function deleteFolderContents(prefix: typeof folderRef): Promise<void> {
    const listing = await listAll(prefix)
    await Promise.all([
      ...listing.items.map((item) => deleteObject(item)),
      ...listing.prefixes.map((sub) => deleteFolderContents(sub)),
    ])
  }

  try {
    await deleteFolderContents(folderRef)
  } catch {
    // Folder may not exist yet
  }
}

async function deleteFirestoreUserData(uid: string): Promise<void> {
  const db = getFirestoreDb()

  const userDocs = await getDocs(collection(db, 'users', uid, 'documents'))
  await Promise.all(userDocs.docs.map((d) => deleteDoc(d.ref)))

  for (const collectionName of ['applications', 'interviews'] as const) {
    const snapshot = await getDocs(
      query(collection(db, collectionName), where('userId', '==', uid)),
    )
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)))
  }

  try {
    await deleteDoc(doc(db, 'users', uid))
  } catch {
    // User profile doc may not exist
  }
}

function hasPasswordProvider(firebaseUser: FirebaseUser): boolean {
  return firebaseUser.providerData.some((p) => p.providerId === 'password')
}

function hasGoogleProvider(firebaseUser: FirebaseUser): boolean {
  return firebaseUser.providerData.some((p) => p.providerId === 'google.com')
}

async function reauthenticateUser(firebaseUser: FirebaseUser, password?: string): Promise<void> {
  if (hasPasswordProvider(firebaseUser)) {
    if (!password || !firebaseUser.email) {
      throw new Error('Password is required to delete your account')
    }
    const credential = EmailAuthProvider.credential(firebaseUser.email, password)
    await reauthenticateWithCredential(firebaseUser, credential)
    return
  }

  if (hasGoogleProvider(firebaseUser)) {
    try {
      await withTimeout(
        reauthenticateWithPopup(firebaseUser, new GoogleAuthProvider()),
        REAUTH_TIMEOUT_MS,
        'Google re-authentication',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('timed out') || message.includes('popup') || message.includes('COOP')) {
        throw new Error(
          'Google confirmation did not finish. Allow popups for vislet.org, disable ad blockers for this site, then try again.',
        )
      }
      throw error
    }
    return
  }

  throw new Error('Unable to verify your identity. Please sign in again and retry.')
}

function clearLocalUserData(uid: string): void {
  clearStoredDocuments(uid)
  clearLocalApplications(uid)
  clearUserNotifications(uid)
  clearPlatformDataForUser(uid)
}

export type DeleteAccountPhase =
  | 'idle'
  | 'reauthenticating'
  | 'wiping_cloud'
  | 'deleting_auth'
  | 'done'
  | 'error'

export async function deleteAccount(
  password?: string,
  onPhase?: (phase: DeleteAccountPhase) => void,
): Promise<void> {
  if (useMockServices()) {
    onPhase?.('done')
    return
  }

  const auth = getFirebaseAuth()
  const firebaseUser = auth.currentUser
  if (!firebaseUser) {
    throw new Error('You must be signed in to delete your account')
  }

  if (hasPasswordProvider(firebaseUser) && !password?.trim()) {
    throw new Error('Password is required to delete your account')
  }

  const uid = firebaseUser.uid
  onPhase?.('reauthenticating')
  await reauthenticateUser(firebaseUser, password)

  onPhase?.('wiping_cloud')
  if (useR2DocumentStorage()) {
    try {
      await withTimeout(wipeUserR2Data(), R2_WIPE_TIMEOUT_MS, 'Cloud file wipe')
    } catch (error) {
      onPhase?.('error')
      const message = error instanceof Error ? error.message : 'Cloud file wipe failed'
      throw new Error(
        `${message}. Your account was not deleted. Fix the cloud wipe error and try again.`,
      )
    }
  } else if (useFirebaseDocumentStorage()) {
    try {
      await withTimeout(deleteStorageFolder(uid), FIRESTORE_WIPE_TIMEOUT_MS, 'Storage wipe')
    } catch (error) {
      onPhase?.('error')
      throw new Error(
        error instanceof Error
          ? `${error.message}. Your account was not deleted.`
          : 'Storage wipe failed. Your account was not deleted.',
      )
    }
  }

  if (useFirebaseDocumentStorage()) {
    try {
      await withTimeout(deleteFirestoreUserData(uid), FIRESTORE_WIPE_TIMEOUT_MS, 'Firestore wipe')
    } catch {
      // Non-fatal for hybrid modes after storage wipe succeeded.
    }
  }

  onPhase?.('deleting_auth')
  await deleteUser(firebaseUser)
  clearLocalUserData(uid)
  await destroyServerSession()
  onPhase?.('done')
}

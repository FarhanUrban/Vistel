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

const FIRESTORE_WIPE_TIMEOUT_MS = 8_000
const R2_WIPE_TIMEOUT_MS = 20_000
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

async function reauthenticateUser(firebaseUser: FirebaseUser, password?: string): Promise<void> {
  const providerId = firebaseUser.providerData[0]?.providerId ?? 'password'

  if (providerId === 'password') {
    if (!password || !firebaseUser.email) {
      throw new Error('Password is required to delete your account')
    }
    const credential = EmailAuthProvider.credential(firebaseUser.email, password)
    await reauthenticateWithCredential(firebaseUser, credential)
    return
  }

  if (providerId === 'google.com') {
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

export async function deleteAccount(password?: string): Promise<void> {
  if (useMockServices()) {
    return
  }

  const auth = getFirebaseAuth()
  const firebaseUser = auth.currentUser
  if (!firebaseUser) {
    throw new Error('You must be signed in to delete your account')
  }

  const uid = firebaseUser.uid
  await reauthenticateUser(firebaseUser, password)

  if (useR2DocumentStorage()) {
    try {
      await withTimeout(wipeUserR2Data(), R2_WIPE_TIMEOUT_MS, 'Cloud file wipe')
    } catch {
      // Continue — Auth delete is the critical step.
    }
    clearLocalUserData(uid)
  } else if (useFirebaseDocumentStorage()) {
    try {
      await withTimeout(deleteStorageFolder(uid), FIRESTORE_WIPE_TIMEOUT_MS, 'Storage wipe')
    } catch {
      // Continue
    }
  } else {
    clearLocalUserData(uid)
  }

  // Application metadata is local/R2 in production. Firestore wipe is best-effort and
  // must not hang when ad blockers block Listen channels (ERR_BLOCKED_BY_CLIENT).
  if (useFirebaseDocumentStorage()) {
    try {
      await withTimeout(deleteFirestoreUserData(uid), FIRESTORE_WIPE_TIMEOUT_MS, 'Firestore wipe')
    } catch {
      // Extension / leftover docs may remain; Auth delete still proceeds.
    }
  } else {
    // Soft attempt with a short timeout in case a profile doc exists.
    try {
      await withTimeout(deleteFirestoreUserData(uid), 3_000, 'Firestore wipe')
    } catch {
      // Ignore — R2/local mode does not depend on Firestore.
    }
  }

  await deleteUser(firebaseUser)
  clearLocalUserData(uid)
}

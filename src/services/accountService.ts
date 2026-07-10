import {
  deleteUser,
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { deleteObject, listAll, ref as storageRef } from 'firebase/storage'
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { getFirebaseAuth, getFirebaseStorage, getFirestoreDb } from './api'
import { useMockServices, useFirebaseDocumentStorage } from './config'
import {
  clearLocalApplications,
  clearStoredDocuments,
  wipeAllVisletLocalData,
} from './localDocumentStorage'

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
    await reauthenticateWithPopup(firebaseUser, new GoogleAuthProvider())
    return
  }

  if (providerId === 'facebook.com') {
    await reauthenticateWithPopup(firebaseUser, new FacebookAuthProvider())
    return
  }

  if (providerId === 'microsoft.com') {
    await reauthenticateWithPopup(firebaseUser, new OAuthProvider('microsoft.com'))
    return
  }

  if (providerId === 'apple.com') {
    await reauthenticateWithPopup(firebaseUser, new OAuthProvider('apple.com'))
    return
  }

  throw new Error('Unable to verify your identity. Please sign in again and retry.')
}

export async function deleteAccount(password?: string): Promise<void> {
  if (useMockServices()) {
    wipeAllVisletLocalData()
    return
  }

  const auth = getFirebaseAuth()
  const firebaseUser = auth.currentUser
  if (!firebaseUser) {
    throw new Error('You must be signed in to delete your account')
  }

  const uid = firebaseUser.uid
  await reauthenticateUser(firebaseUser, password)

  wipeAllVisletLocalData()
  clearStoredDocuments(uid)
  clearLocalApplications(uid)

  if (useFirebaseDocumentStorage()) {
    try {
      await deleteStorageFolder(uid)
    } catch {
      // Storage may be unavailable
    }
  }

  try {
    await deleteFirestoreUserData(uid)
  } catch {
    // Firestore may be blocked (e.g. ad blocker) — local data is already wiped
  }

  try {
    await deleteUser(firebaseUser)
  } catch (error) {
    await firebaseSignOut(auth)
    throw error
  }
}

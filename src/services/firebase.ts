import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Contact } from '../types/contact';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with specific database ID if configured
export const firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test connection on boot per Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: Le client est hors ligne ou en attente de réseau.');
    }
  }
}
testConnection();

// Cloud sync services for user contacts
export async function syncContactsToCloud(userId: string, contacts: Contact[]): Promise<void> {
  if (!userId) return;
  const userContactsRef = collection(firestore, 'users', userId, 'contacts');
  
  // Save each contact to user's personal contacts subcollection
  for (const contact of contacts) {
    const contactDocRef = doc(userContactsRef, contact.id);
    await setDoc(
      contactDocRef,
      {
        ...contact,
        userId,
        syncedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function fetchContactsFromCloud(userId: string): Promise<Contact[]> {
  if (!userId) return [];
  const userContactsRef = collection(firestore, 'users', userId, 'contacts');
  const snapshot = await getDocs(userContactsRef);
  const cloudContacts: Contact[] = [];

  snapshot.forEach((d) => {
    const data = d.data();
    cloudContacts.push({
      id: d.id,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      company: data.company || '',
      jobTitle: data.jobTitle || '',
      isFavorite: !!data.isFavorite,
      type: data.type === 'company' ? 'company' : 'person',
      phones: Array.isArray(data.phones) ? data.phones : [],
      emails: Array.isArray(data.emails) ? data.emails : [],
      address: data.address || { street: '', postalCode: '', city: '', country: '' },
      website: data.website || '',
      notes: data.notes || '',
      avatar: data.avatar || '',
      categories: Array.isArray(data.categories) ? data.categories : [],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    });
  });

  return cloudContacts;
}

export async function deleteContactFromCloud(userId: string, contactId: string): Promise<void> {
  if (!userId || !contactId) return;
  const contactDocRef = doc(firestore, 'users', userId, 'contacts', contactId);
  await deleteDoc(contactDocRef);
}

// Authentication Helpers
export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return credential.user;
}

export async function registerWithEmail(email: string, pass: string, name?: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && credential.user) {
    await updateProfile(credential.user, { displayName: name });
  }
  return credential.user;
}

export async function loginWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}


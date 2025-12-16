import { initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
void setPersistence(firebaseAuth, inMemoryPersistence).catch(error => {
  console.error('Failed to configure Firebase auth persistence:', error);
});
export const firestore = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true,
});
export const firebaseStorage = getStorage(firebaseApp);

export const getFirebaseAnalytics = async () => {
  try {
    const analyticsModule = await import('firebase/analytics');
    if (await analyticsModule.isSupported()) {
      return analyticsModule.getAnalytics(firebaseApp);
    }
  } catch (error) {
    console.warn('Firebase analytics unavailable:', error);
  }
  return null;
};

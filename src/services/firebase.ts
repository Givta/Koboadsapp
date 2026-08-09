import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists at runtime but is missing from firebase's public types in some versions
import { getReactNativePersistence } from 'firebase/auth';
import { enableIndexedDbPersistence, initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!isFirebaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[KoboAds] Firebase config is missing. Add your project keys to .env (see .env.example) then restart `expo start -c`.'
  );
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  auth = Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  auth = getAuth(app);
}

let db: Firestore;
try {
  db = initializeFirestore(app, { experimentalForceLongPolling: Platform.OS !== 'web' });
  if (Platform.OS === 'web') {
    enableIndexedDbPersistence(db).catch((error) => {
      // IndexedDB persistence may fail if multiple tabs are open or unsupported.
      // eslint-disable-next-line no-console
      console.warn('[KoboAds] Firestore persistence disabled:', error?.message ?? error);
    });
  }
} catch {
  db = getFirestore(app);
}

let functions: Functions;
try {
  functions = getFunctions(app);
} catch {
  functions = getFunctions(app);
}

const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, functions, storage };

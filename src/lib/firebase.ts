// firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// It's good practice to ensure these values are strings for initializeApp,
// as import.meta.env values are always strings or undefined.
// If you're confident they'll always be present, a simple cast might work,
// but explicitly converting to String() handles potential undefined more robustly.
const app = initializeApp({
  apiKey: String(firebaseConfig.apiKey),
  authDomain: String(firebaseConfig.authDomain),
  projectId: String(firebaseConfig.projectId),
  storageBucket: String(firebaseConfig.storageBucket),
  messagingSenderId: String(firebaseConfig.messagingSenderId),
  appId: String(firebaseConfig.appId),
  measurementId: String(firebaseConfig.measurementId),
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
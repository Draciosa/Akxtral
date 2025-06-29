import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBFw0Qbyq9zTFTd-tUY6dkmvuFiYMuO2U8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Validate Firebase configuration
const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingConfig = requiredConfig.filter(key => !firebaseConfig[key] || firebaseConfig[key].includes('your-project'));

if (missingConfig.length > 0) {
  console.error('Missing Firebase configuration:', missingConfig);
  console.error('Please set the following environment variables in Netlify:');
  console.error('VITE_FIREBASE_API_KEY');
  console.error('VITE_FIREBASE_AUTH_DOMAIN');
  console.error('VITE_FIREBASE_PROJECT_ID');
  console.error('VITE_FIREBASE_STORAGE_BUCKET');
  console.error('VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.error('VITE_FIREBASE_APP_ID');
}

let app;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Create a fallback app to prevent complete failure
  app = null;
}

export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;

// Export a flag to check if Firebase is properly initialized
export const isFirebaseInitialized = !!app;
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { ref } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if config values are present
if (!firebaseConfig.storageBucket) {
  throw new Error('Firebase Storage Bucket is required');
}

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Log storage bucket for debugging
console.log('Storage bucket:', storage.app.options.storageBucket);

// Verify storage is accessible
try {
  const testRef = ref(storage, 'test.txt');
  console.log('Storage reference created successfully:', testRef.fullPath);
} catch (error) {
  console.error('Storage initialization error:', error);
}

export { storage };
export const db = getFirestore(app);

// Initialize Analytics only on client side
if (typeof window !== 'undefined') {
  const analytics = getAnalytics(app);
} 
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
// Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDEMOKEY-REPLACE-WITH-YOUR-KEY",
  authDomain: "apexbox-demo.firebaseapp.com",
  projectId: "apexbox-demo",
  storageBucket: "apexbox-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth (persistence is automatic in Firebase v9+)
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };

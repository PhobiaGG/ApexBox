import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJ4MYzOakpthRU17DrTDwqcOVLSaqp_wU",
  authDomain: "apexbox-32ad0.firebaseapp.com",
  projectId: "apexbox-32ad0",
  storageBucket: "apexbox-32ad0.firebasestorage.app",
  messagingSenderId: "417300033703",
  appId: "1:417300033703:web:c913f9d0819989eff06b82",
  measurementId: "G-FCMQFY2GSK"
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

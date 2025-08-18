import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Your Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Debug logging
console.log('Firebase Config Check:', {
  apiKey: firebaseConfig.apiKey ? 'SET' : 'MISSING',
  authDomain: firebaseConfig.authDomain ? 'SET' : 'MISSING',
  projectId: firebaseConfig.projectId ? 'SET' : 'MISSING',
  storageBucket: firebaseConfig.storageBucket ? 'SET' : 'MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId ? 'SET' : 'MISSING',
  appId: firebaseConfig.appId ? 'SET' : 'MISSING'
});

// Check if config is properly set up
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!isConfigValid) {
  console.error('Firebase configuration not set up properly. Please update your .env file with your actual Firebase config values.');
}

// Initialize Firebase
let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  
  console.log('Firebase Auth initialized:', auth ? 'SUCCESS' : 'FAILED');
  
  // Set auth persistence to local
  if (auth) {
    setPersistence(auth, browserLocalPersistence);
    console.log('Auth persistence set to local');
  }
  
  // Initialize vanilla Firebase SDK
  firebase.initializeApp(firebaseConfig);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Create a mock db object that will throw helpful errors
  db = {
    collection: () => {
      throw new Error('Firebase not properly configured. Please update your .env file with your actual Firebase config values.');
    }
  };
  auth = null;
}

export { db, auth, GoogleAuthProvider };
export { firebase };
export default app; 
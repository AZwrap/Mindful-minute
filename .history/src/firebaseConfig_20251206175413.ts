import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getApp, getApps } from "firebase/app";

// Replace with your actual config keys
const firebaseConfig = {
  apiKey: "AIzaSyAfpHyQ8pzcy0JNDcJ87JfY1EIv2meIZ4I",
  authDomain: "mindful-minute-4da16.firebaseapp.com",
  projectId: "mindful-minute-4da16",
  storageBucket: "mindful-minute-4da16.firebasestorage.app",
  messagingSenderId: "223587015486",
  appId: "1:223587015486:web:19b03a32c509e3a874aa6f",
  measurementId: "G-D4LGFD3K8C"
};

// Singleton App Check: Prevents re-initialization on hot reload
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Safe Firestore Initialization
let dbInstance;
try {
  // Try to initialize with persistence
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e: any) {
  // If already initialized (hot reload), fallback to the existing instance
  if (e.code === 'failed-precondition' || e.message.includes('already been called')) {
    dbInstance = getFirestore(app);
  } else {
    throw e;
  }
}
export const db = dbInstance;

// Safe Auth Initialization
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e: any) {
  if (e.code === 'auth/already-initialized') {
    authInstance = getAuth(app);
  } else {
    throw e;
  }
}
export const auth = authInstance;
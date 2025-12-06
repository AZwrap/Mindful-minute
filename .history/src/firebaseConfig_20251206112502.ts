import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Replace with your actual config keys
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

import { getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
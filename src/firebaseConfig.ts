import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
// FIXED: Use standard getFirestore for React Native. 
// (Removes "IndexedDB is only available on platforms that support LocalStorage" error)
export const db = getFirestore(app);

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

// Storage Initialization
export const storage = getStorage(app);

// Functions Initialization (MUST BE LAST)
// This ensures it binds to the fully initialized Auth instance above
import { getFunctions } from "firebase/functions";
export const functions = getFunctions(app);
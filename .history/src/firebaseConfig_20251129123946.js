// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAfpHyQ8pzcy0JNDcJ87JfY1EIv2meIZ4I",
  authDomain: "mindful-minute-4da16.firebaseapp.com",
  projectId: "mindful-minute-4da16",
  storageBucket: "mindful-minute-4da16.firebasestorage.app",
  messagingSenderId: "223587015486",
  appId: "1:223587015486:web:19b03a32c509e3a874aa6f",
  measurementId: "G-D4LGFD3K8C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore database
export const db = getFirestore(app);

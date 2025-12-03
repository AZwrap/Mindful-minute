import { doc, setDoc, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

// Import ALL your Zustand stores
import { useEntriesStore } from "../stores/entriesStore";
import { useSettings } from "../stores/settingsStore";
import { useTheme } from "../stores/themeStore";
import { useProgress } from "../stores/progressStore";
import { useWritingSettings } from "../stores/writingSettingsStore";

// Get user ID, signing in anonymously if necessary
export const ensureAuth = async () => {
  if (!auth.currentUser) {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user.uid;
  }
  return auth.currentUser.uid;
};

// --- BACKUP ---
export const saveBackupToCloud = async () => {
  try {
    const userId = await ensureAuth();
    
    const backupData = {
      timestamp: Date.now(),
      entries: useEntriesStore.getState().entries,
      settings: useSettings.getState(),
      theme: useTheme.getState(),
      progress: useProgress.getState(),
      writingSettings: useWritingSettings.getState(),
      version: 1
    };

    const backupRef = doc(db, "users", userId, "backups", "latest");
    await setDoc(backupRef, backupData);

    return { success: true, timestamp: new Date(backupData.timestamp) };
  } catch (error) {
    return { success: false, error };
  }
};

// --- RESTORE ---
export const restoreBackupFromCloud = async () => {
  try {
    const userId = await ensureAuth();
    const backupRef = doc(db, "users", userId, "backups", "latest");
    const snap = await getDoc(backupRef);

    if (!snap.exists()) {
      throw new new Error("No cloud backup found.");
    }

    const data = snap.data();

    // Hydrate all stores manually using setState/replaceEntries
    useEntriesStore.getState().replaceEntries(data.entries);
    useSettings.setState(data.settings, true);
    useTheme.setState(data.theme, true);
    useProgress.setState(data.progress, true); 
    useWritingSettings.setState(data.writingSettings, true);

    return { success: true, timestamp: new Date(data.timestamp) };
  } catch (error) {
    return { success: false, error };
  }
};
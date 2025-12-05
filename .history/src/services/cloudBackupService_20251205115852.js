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
    
// Helper to strip functions (actions) so Firestore accepts the data
    const sanitize = (state) => JSON.parse(JSON.stringify(state));

    const backupData = {
      timestamp: Date.now(),
      entries: useEntriesStore.getState().entries,
      settings: sanitize(useSettings.getState()),
      theme: sanitize(useTheme.getState()),
      progress: sanitize(useProgress.getState()),
      writingSettings: sanitize(useWritingSettings.getState()),
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
      throw new Error("No cloud backup found."); // <--- Fixed double 'new'
    }

    const data = snap.data();

    // Hydrate stores (Merge data, keep actions)
    useEntriesStore.getState().replaceEntries(data.entries);
    
    // We remove the second 'true' argument to MERGE state instead of replacing it.
    // Replacing would wipe out the action functions defined in the store.
    if (data.settings) useSettings.setState(data.settings);
    if (data.theme) useTheme.setState(data.theme);
    if (data.progress) useProgress.setState(data.progress);
    if (data.writingSettings) useWritingSettings.setState(data.writingSettings);

    return { success: true, timestamp: new Date(data.timestamp) };
  } catch (error) {
    return { success: false, error };
  }
};
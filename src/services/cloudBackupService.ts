import { doc, setDoc, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

// Import Stores
import { useEntriesStore } from "../stores/entriesStore";
import { useSettings } from "../stores/settingsStore";
import { useTheme } from "../stores/themeStore";
import { useProgress } from "../stores/progressStore";
import { useWritingSettings } from "../stores/writingSettingsStore";
import { useJournalStore } from "../stores/journalStore";

// Helper to get User ID
export const ensureAuth = async (): Promise<string> => {
  if (!auth.currentUser) {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user.uid;
  }
  return auth.currentUser.uid;
};

// Helper to strip functions (actions) from state
const sanitize = (state: any) => JSON.parse(JSON.stringify(state));

// --- BACKUP ---
export const saveBackupToCloud = async () => {
  try {
    const userId = await ensureAuth();
    
    const backupData = {
      timestamp: Date.now(),
      entries: useEntriesStore.getState().entries,
      settings: sanitize(useSettings.getState()),
      theme: sanitize(useTheme.getState()),
      progress: sanitize(useProgress.getState()),
      writingSettings: sanitize(useWritingSettings.getState()),
      journal: sanitize(useJournalStore.getState()),
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
      throw new Error("No cloud backup found.");
    }

    const data = snap.data();

    // Hydrate all stores manually using setState/replaceEntries
    if (data.entries) useEntriesStore.getState().replaceEntries(data.entries);
    
    // Merge state (don't overwrite actions)
    if (data.settings) useSettings.setState(data.settings);
    if (data.theme) useTheme.setState(data.theme);
    if (data.progress) useProgress.setState(data.progress);
    if (data.writingSettings) useWritingSettings.setState(data.writingSettings);
    if (data.journal) useJournalStore.setState(data.journal);

    return { success: true, timestamp: new Date(data.timestamp) };
  } catch (error) {
    return { success: false, error };
  }
};
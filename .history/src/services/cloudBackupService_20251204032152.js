import { doc, setDoc, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

// Import ALL your stores to capture full app state
import { useEntriesStore } from "../stores/entriesStore";
import { useSettings } from "../stores/settingsStore";
import { useTheme } from "../stores/themeStore";
import { useProgress } from "../stores/progressStore";
import { useWritingSettings } from "../stores/writingSettingsStore";

// Authenticate silently (Anonymous)
export const ensureAuth = async () => {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser.uid;
};

// --- BACKUP ---
export const saveBackupToCloud = async () => {
  try {
    const userId = await ensureAuth();
    
    // 1. Gather data from all stores
    const backupData = {
      timestamp: Date.now(),
      entries: useEntriesStore.getState().entries,
      settings: useSettings.getState(), // captures haptics, biometrics, etc
      theme: useTheme.getState(),       // captures sunrise/sunset/accent
      progress: useProgress.getState(), // captures xp, streak, level
      writingSettings: useWritingSettings.getState(), // timer duration
      version: 1
    };

    // 2. Save to Firestore: users/{userId}/backups/latest
    const backupRef = doc(db, "users", userId, "backups", "latest");
    await setDoc(backupRef, backupData);

    return { success: true, timestamp: new Date() };
  } catch (error) {
    console.error("Cloud Backup Error:", error);
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

    // 3. Hydrate all stores
    if (data.entries) useEntriesStore.getState().replaceEntries(data.entries);
    
    if (data.settings) {
        const { setHapticsEnabled, setSoundEnabled, setIsBiometricsEnabled } = useSettings.getState();
        setHapticsEnabled(data.settings.hapticsEnabled);
        setSoundEnabled(data.settings.soundEnabled);
        setIsBiometricsEnabled(data.settings.isBiometricsEnabled);
    }
    
    if (data.progress) {
        const { setTotalXP } = useProgress.getState();
        // Assuming you have a setter or just strictly rely on hydration re-render
        // Note: For simple stores, a reload might be needed or explicit setters
        useProgress.setState(data.progress); 
    }

    if (data.theme) {
        const { setTheme, setAccentColor } = useTheme.getState();
        setTheme(data.theme.theme);
        setAccentColor(data.theme.accentColor);
    }

    if (data.writingSettings) {
        useWritingSettings.setState(data.writingSettings);
    }

    return { success: true, timestamp: new Date(data.timestamp) };
  } catch (error) {
    console.error("Cloud Restore Error:", error);
    return { success: false, error };
  }
};
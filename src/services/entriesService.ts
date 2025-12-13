import { db } from "../firebaseConfig";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

// Shared Type Definition
export interface JournalEntry {
  date: string; // Key: "YYYY-MM-DD"
  text?: string;
  prompt?: { text: string; isSmart?: boolean }; 
  promptText?: string; 
  moodTag?: { 
    value: string; 
    type: 'default' | 'custom';
  };
  imageUri?: string;
  isComplete?: boolean;
  createdAt?: number;
  updatedAt?: number;
  syncedAt?: number; 
  music?: {
    trackId: string;
    title: string;
    artist: string;
    url: string;
  };
  [key: string]: any; 
}

export const EntriesService = {
  async syncEntries(userId: string, localEntries: Record<string, JournalEntry>) {
    const userEntriesRef = collection(db, "users", userId, "entries");
    
    // 1. Fetch Cloud Entries
    const snapshot = await getDocs(userEntriesRef);
    const cloudEntries: Record<string, JournalEntry> = {};
    
    snapshot.forEach((doc) => {
       if (doc.id) cloudEntries[doc.id] = doc.data() as JournalEntry;
    });

    // 2. Merge Logic (Conflict Resolution)
    const mergedEntries = { ...localEntries };
    const batch = writeBatch(db);
    let hasBatchUpdates = false;

    // A. Process Cloud Entries
    Object.values(cloudEntries).forEach((cloudEntry) => {
      const localEntry = localEntries[cloudEntry.date];
      
      // Case 1: New from Cloud -> Accept Cloud
      if (!localEntry) {
        mergedEntries[cloudEntry.date] = { ...cloudEntry, syncedAt: cloudEntry.updatedAt };
        return;
      }

      const localSyncedAt = localEntry.syncedAt || 0;
      const cloudUpdatedAt = cloudEntry.updatedAt || 0;
      const localUpdatedAt = localEntry.updatedAt || 0;

// Case 2: Cloud has updates
      if (cloudUpdatedAt > localSyncedAt) {
        // Conflict: Local also changed
        if (localUpdatedAt > localSyncedAt) {
          
          // FIX: If text is identical, trust Cloud timestamp and SKIP conflict mode
          if ((cloudEntry.text || '').trim() === (localEntry.text || '').trim()) {
             mergedEntries[cloudEntry.date] = { ...cloudEntry, syncedAt: cloudUpdatedAt };
             return;
          }

          console.log(`Conflict detected for ${cloudEntry.date}`);
          const resolvedText = `${cloudEntry.text || ''}\n\n==========\n⚠️ [CONFLICT: LOCAL CHANGES PRESERVED BELOW]\n${localEntry.text || ''}`;
          
          mergedEntries[cloudEntry.date] = {
            ...localEntry,
            text: resolvedText,
            updatedAt: Date.now(), // Bump time so this "resolution" wins next push
            syncedAt: 0, 
          };
        } else {
          // No local changes, safe to overwrite
          mergedEntries[cloudEntry.date] = { ...cloudEntry, syncedAt: cloudUpdatedAt };
        }
      }
    });

    // B. Push Pending Local Changes to Cloud
    const finalEntries: Record<string, JournalEntry> = {};

    Object.values(mergedEntries).forEach((entry) => {
      if ((entry.updatedAt || 0) > (entry.syncedAt || 0)) {
        const ref = doc(db, "users", userId, "entries", entry.date);
        
        const payload = { ...entry };
        delete payload.syncedAt; 
        
        batch.set(ref, payload);
        hasBatchUpdates = true;
        
        finalEntries[entry.date] = { ...entry, syncedAt: entry.updatedAt };
      } else {
        finalEntries[entry.date] = entry;
      }
    });

    // 3. Commit Writes
    if (hasBatchUpdates) {
      await batch.commit();
    }

    return finalEntries;
  }
};
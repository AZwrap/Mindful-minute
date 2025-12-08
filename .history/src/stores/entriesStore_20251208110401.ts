import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../firebaseConfig";
import { doc, getDocs, collection, writeBatch } from "firebase/firestore";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

// 1. Define the shape of a single Journal Entry
export interface JournalEntry {
  date: string; // Key: "YYYY-MM-DD"
  text?: string;
  
  // Prompt data can be stored in two ways (legacy vs new)
  prompt?: { text: string; isSmart?: boolean }; 
  promptText?: string; 
  
moodTag?: { 
    value: string; 
    type: 'default' | 'custom';
  };

  imageUri?: string; // NEW: Path to the attached photo
  
isComplete?: boolean;
  createdAt?: number;
  updatedAt?: number;
  syncedAt?: number; // Tracks when this specific device last synced this entry
  
  // Allow for future extensibility
  [key: string]: any; 
}

// 2. Define Draft shape
export interface Draft {
  text: string;
}

// 3. Define Pomodoro State (if you expand this feature later)
export interface PomodoroSession {
  cyclesCompleted: number;
  timeLeft: number;
  isActive: boolean;
  mode: 'focus' | 'break';
}

// 4. Store State & Actions
interface EntriesState {
  entries: Record<string, JournalEntry>;
  drafts: Record<string, Draft>;
  draftTimers: Record<string, number>;
  pomodoroState: Record<string, PomodoroSession>;
}

interface EntriesActions {
  syncWithCloud: () => Promise<void>;
  replaceEntries: (newEntriesMap: Record<string, JournalEntry>) => void;
  upsert: (newEntry: Partial<JournalEntry> & { date: string }) => void;
  deleteEntry: (date: string) => void;
  
  setDraft: (date: string, text: string) => void;
  getDraft: (date: string) => string;
  
  setDraftTimer: (date: string, seconds: number, pomodoroData?: PomodoroSession) => void;
  getDraftTimer: (date: string) => number | null;
  getPomodoroState: (date: string) => PomodoroSession | null;
}

type EntriesStore = EntriesState & EntriesActions;

// --------------------------------------------------
// STORE
// --------------------------------------------------
export const useEntriesStore = create<EntriesStore>()(
  persist(
    (set, get) => ({
      // STATE
      entries: {},
      drafts: {},
      draftTimers: {},
      pomodoroState: {},

// ACTIONS

      // Sync local entries with Firestore (Merge Strategy)
      syncWithCloud: async () => {
        const user = auth.currentUser;
        if (!user) return; // Not logged in

        const localEntries = get().entries;
        const userEntriesRef = collection(db, "users", user.uid, "entries");

        try {
          // 1. Fetch Cloud Entries
          const snapshot = await getDocs(userEntriesRef);
          const cloudEntries: Record<string, JournalEntry> = {};
          
          snapshot.forEach((doc) => {
             // Basic validation to ensure we have a date key
             if (doc.id) cloudEntries[doc.id] = doc.data() as JournalEntry;
          });

// 2. Merge Logic (Conflict Resolution)
          const mergedEntries = { ...localEntries };
          const batch = writeBatch(db);
          let hasBatchUpdates = false;

          // A. Process Cloud Entries
          Object.values(cloudEntries).forEach((cloudEntry) => {
            const localEntry = localEntries[cloudEntry.date];
            
            // Case 1: New from Cloud (No local copy) -> Accept Cloud
            if (!localEntry) {
              mergedEntries[cloudEntry.date] = { ...cloudEntry, syncedAt: cloudEntry.updatedAt };
              return;
            }

            const localSyncedAt = localEntry.syncedAt || 0;
            const cloudUpdatedAt = cloudEntry.updatedAt || 0;
            const localUpdatedAt = localEntry.updatedAt || 0;

            // Case 2: Cloud has updates we haven't seen
            if (cloudUpdatedAt > localSyncedAt) {
              // Check if we ALSO have unsynced local changes (Conflict!)
              if (localUpdatedAt > localSyncedAt) {
                console.log(`Conflict detected for ${cloudEntry.date}`);
                // Safety: Combine text so nothing is lost
                const resolvedText = `${cloudEntry.text || ''}\n\n==========\n⚠️ [CONFLICT: LOCAL CHANGES PRESERVED BELOW]\n${localEntry.text || ''}`;
                
                mergedEntries[cloudEntry.date] = {
                  ...localEntry,
                  text: resolvedText,
                  updatedAt: Date.now(), // Bump time so this "resolution" wins next push
                  syncedAt: 0, // Mark as unsynced so it pushes back to cloud
                };
              } else {
                // No local changes, safe to overwrite with Cloud version
                mergedEntries[cloudEntry.date] = { ...cloudEntry, syncedAt: cloudUpdatedAt };
              }
            }
            // Case 3: Cloud is older or same as syncedAt -> Keep Local
          });

          // B. Push Pending Local Changes to Cloud
          const finalEntries: Record<string, JournalEntry> = {};

          Object.values(mergedEntries).forEach((entry) => {
            // Push if local is newer than its last sync time (or never synced)
            if ((entry.updatedAt || 0) > (entry.syncedAt || 0)) {
              const ref = doc(db, "users", user.uid, "entries", entry.date);
              
              // Prepare payload: Remove local-only metadata before upload
              const payload = { ...entry };
              delete payload.syncedAt; 
              
              batch.set(ref, payload);
              hasBatchUpdates = true;
              
              // Mark as synced locally
              finalEntries[entry.date] = { ...entry, syncedAt: entry.updatedAt };
            } else {
              finalEntries[entry.date] = entry;
            }
          });

          // 3. Commit Writes
          if (hasBatchUpdates) {
            await batch.commit();
          }

          // 4. Update Store
          set({ entries: finalEntries });
          console.log("Cloud Sync Completed (Safe Mode)");
          
        } catch (error) {
          console.error("Cloud Sync Error:", error);
        }
      },
      
      // DANGER: Replaces all entries (for Cloud Restore)
      replaceEntries: (newEntriesMap) => {
        set({ entries: newEntriesMap });
      },
      
      // Upsert: Merges new data with existing entry data
      upsert: (newEntry) => {
        const { date } = newEntry;
        if (!date) return;

        set((state) => ({
          entries: {
            ...state.entries,
            [date]: {
              ...(state.entries[date] || {}), // Keep existing data
              ...newEntry,                    // Overwrite with new fields
              updatedAt: Date.now(),
            },
          },
        }));
      },

      deleteEntry: (date) => {
        set((state) => {
          const copy = { ...state.entries };
          delete copy[date];
          return { entries: copy };
        });
      },

      // DRAFTS
      setDraft: (date, text) => {
        set((state) => ({
          drafts: { ...state.drafts, [date]: { text } },
        }));
      },

      getDraft: (date) => {
        return get().drafts?.[date]?.text || "";
      },

      // TIMERS
      setDraftTimer: (date, seconds, pomodoroData) => {
        set((state) => {
          const updates: Partial<EntriesState> = {
            draftTimers: { ...state.draftTimers, [date]: seconds },
          };
          
          if (pomodoroData) {
            updates.pomodoroState = {
              ...state.pomodoroState,
              [date]: pomodoroData,
            };
          }
          return updates as EntriesState;
        });
      },

      getDraftTimer: (date) => {
        return get().draftTimers?.[date] ?? null;
      },

      getPomodoroState: (date) => {
        return get().pomodoroState?.[date] ?? null;
      },
    }),
    {
      name: "entries-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
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

          // 2. Merge Logic (Last Write Wins based on updatedAt)
          const mergedEntries = { ...localEntries };
          const batch = writeBatch(db);
          let hasBatchUpdates = false;

          // A. Compare Cloud vs Local -> Update Local if Cloud is newer
          Object.values(cloudEntries).forEach((cloudEntry) => {
            const localEntry = localEntries[cloudEntry.date];
            if (!localEntry || (cloudEntry.updatedAt || 0) > (localEntry.updatedAt || 0)) {
              mergedEntries[cloudEntry.date] = cloudEntry;
            }
          });

          // B. Compare Local vs Cloud -> Push to Cloud if Local is newer
          Object.values(mergedEntries).forEach((entry) => {
            const cloudEntry = cloudEntries[entry.date];
            // If cloud doesn't exist OR local is newer, we push
            if (!cloudEntry || (entry.updatedAt || 0) > (cloudEntry.updatedAt || 0)) {
              const ref = doc(db, "users", user.uid, "entries", entry.date);
              batch.set(ref, entry);
              hasBatchUpdates = true;
            }
          });

          // 3. Commit Writes
          if (hasBatchUpdates) {
            await batch.commit();
          }

          // 4. Update Store with the merged result
          set({ entries: mergedEntries });
          console.log("Cloud Sync Completed");
          
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
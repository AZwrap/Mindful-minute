import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Unsubscribe } from "firebase/firestore";
import { auth } from "../firebaseConfig";
import { JournalService, JournalMeta } from "../services/journalService";
import { sendImmediateNotification } from "../lib/notifications";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

// Metadata for the journal itself
export interface JournalMeta {
  id: string;
  name: string;
  members: string[]; 
  memberIds?: string[]; // New: Stores UIDs for restoring
  createdAt?: any;
  owner?: string;
  updatedAt?: number;
  lastEntry?: {
    text: string;
    author: string;
    createdAt: number;
  };
}

// State & Actions
interface JournalState {
  currentJournalId: string | null;
  sharedEntries: Record<string, any[]>; // { [journalId]: Entry[] }
  journalInfo: JournalMeta | null;
  isLoading: boolean;
  _unsubscribe: Unsubscribe | null;
journals: Record<string, JournalMeta>;
  currentUser: string | null;
  lastRead: Record<string, number>; // { [journalId]: timestamp }
}

interface JournalActions {
  createJournal: (ownerName: string) => Promise<string>;
  joinJournal: (journalId: string, memberName?: string) => Promise<boolean>;
  restoreJournals: () => Promise<number>;
  subscribeToJournal: (journalId: string) => void;
  addSharedEntry: (entry: any) => Promise<void>;
  deleteSharedEntry: (journalId: string, entryId: string) => Promise<void>;
  loadMoreSharedEntries: (journalId: string) => Promise<void>;
updateSharedEntry: (journalId: string, entryId: string, newText: string, imageUri?: string | null) => Promise<void>;

  // Helpers for SyncedService
  setSharedEntries: (journalId: string, entries: any[]) => void;
  updateJournalMeta: (journalId: string, data: any) => void;
  addSharedEntryList: (journalId: string, entries: any[]) => void;
  addJournal: (journal: JournalMeta) => void;
  removeJournal: (journalId: string) => void;
  setCurrentUser: (userId: string) => void;
  markAsRead: (journalId: string) => void;
  
  leaveJournal: () => void;
  reset: () => void;
}

type JournalStore = JournalState & JournalActions;

// Utils removed (moved to service)

// --------------------------------------------------
// STORE
// --------------------------------------------------
export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      // STATE
currentJournalId: null,
      journals: {},                    // { [id]: JournalMeta } - Stores details of all joined journals
      sharedEntries: {},               // { [journalId]: Entry[] }
      journalInfo: null,               // Legacy fallback
      isLoading: false,
      _unsubscribe: null,
      currentUser: null,
      lastRead: {},

// ACTIONS
      setCurrentUser: (userId) => set({ currentUser: userId }),
      
      markAsRead: (journalId: string) => 
        set((state) => ({
          lastRead: { ...state.lastRead, [journalId]: Date.now() }
        })),

// Create a new shared journal
      createJournal: async (journalName: string, ownerName: string) => {
        const newJournal = await JournalService.createJournal(journalName, ownerName);
        const journalId = newJournal.id;

        set((state) => ({
          currentJournalId: journalId,
          journalInfo: newJournal,
          journals: { ...state.journals, [journalId]: newJournal }
        }));

        get().subscribeToJournal(journalId);
        return journalId;
      },

// Join an existing journal
      joinJournal: async (journalId, memberName = "User") => {
        const info = await JournalService.joinJournal(journalId, memberName);

        set((state) => ({
          currentJournalId: journalId,
          journalInfo: info,
          journals: { ...state.journals, [journalId]: info }
        }));

        get().subscribeToJournal(journalId);
        return true;
      },

// Restore groups from Cloud
      restoreJournals: async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Must be logged in to restore journals.");

        set({ isLoading: true });
        try {
          const restored = await JournalService.getUserJournals(uid);
          
          set((state) => ({
            journals: { ...state.journals, ...restored },
            isLoading: false
          }));
          
          return Object.keys(restored).length;
        } catch (error) {
          console.error("Restore failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

// Subscribe to real-time updates
      subscribeToJournal: (journalId) => {
        const oldUnsub = get()._unsubscribe;
        if (oldUnsub) oldUnsub();

        set({ isLoading: true });

        // Listen to the top 20 entries
        const unsub = JournalService.subscribeToEntries(
          journalId,
          20, // Limit
          (recents, changes, isLocal) => {
            // Check for NEW arrivals (Notification Trigger)
            if (!isLocal) {
              changes.forEach((change) => {
                if (change.type === "added") {
                  const data = change.doc.data();
                  const isRecent = Date.now() - (data.createdAt || 0) < 60000;
                  const isOthers = data.owner !== get().currentUser && data.userId !== get().currentUser;

                  if (isRecent && isOthers) {
                    const author = data.authorName || "Someone";
                    sendImmediateNotification("New Journal Entry", `${author} added a new entry.`);
                  }
                }
              });
            }

            loadMoreSharedEntries: async (journalId) => {
        const currentList = get().sharedEntries[journalId] || [];
        if (currentList.length === 0) return;

        const lastEntry = currentList[currentList.length - 1];
        if (!lastEntry.createdAt) return;

        try {
          const older = await JournalService.fetchOlderEntries(journalId, lastEntry.createdAt, 20);
          
          if (older.length > 0) {
            set((state) => ({
              sharedEntries: {
                ...state.sharedEntries,
                [journalId]: [...(state.sharedEntries[journalId] || []), ...older]
              }
            }));
          }
        } catch (e) {
          console.error("Pagination failed:", e);
        }
      },

set((state) => {
              const currentList = state.sharedEntries[journalId] || [];
              
              // Smart Merge: Keep the new 'recents' at the top, preserve older entries at the bottom
              // 1. Create a Map of the new real-time entries for O(1) lookup
              const recentMap = new Map(recents.map(e => [e.entryId, e]));
              
              // 2. Filter out any 'old' entries that are now being reported by the listener (updates)
              //    or duplicates. Then append the rest of the old history.
              const validHistory = currentList.filter(e => !recentMap.has(e.entryId));
              
              // 3. Combine: [New Real-Time Window] + [Old History]
              const merged = [...recents, ...validHistory];

              return {
                sharedEntries: { ...state.sharedEntries, [journalId]: merged },
                isLoading: false,
              };
            });
          },
          (error) => {
            console.error("Shared Journal Sync Error:", error);
            set({ isLoading: false });
          }
        );

        set({ _unsubscribe: unsub });
      },

addSharedEntry: async (entry) => {
        const targetId = entry.journalId || get().currentJournalId;
        if (!targetId) return;
        await JournalService.addEntry(targetId, entry);
      },

      deleteSharedEntry: async (journalId: string, entryId: string) => {
        try {
          await JournalService.deleteEntry(journalId, entryId);
          // Optimistic update
          const currentEntries = get().sharedEntries[journalId] || [];
          set((state) => ({
            sharedEntries: {
              ...state.sharedEntries,
              [journalId]: currentEntries.filter(e => e.entryId !== entryId)
            }
          }));
        } catch (error) {
          console.error("Failed to delete entry:", error);
          throw error;
        }
      },

updateSharedEntry: async (journalId: string, entryId: string, newText: string, imageUri?: string | null) => {
        try {
          await JournalService.updateEntry(journalId, entryId, newText, imageUri);
        } catch (error) {
          console.error("Failed to update entry:", error);
          throw error;
        }
      },

      // ------------------------------------------
      // Service Helpers
      // ------------------------------------------
      setSharedEntries: (journalId, entries) =>
        set((state) => ({
          sharedEntries: {
            ...state.sharedEntries,
            [journalId]: entries,
          },
        })),

      updateJournalMeta: (journalId, data) =>
        set((state) => ({
          journalInfo: {
            ...(state.journalInfo || { id: journalId, name: 'Unknown', members: [] }),
            ...data,
          },
        })),

      addSharedEntryList: (journalId, entries) =>
        set((state) => ({
          sharedEntries: {
            ...state.sharedEntries,
            [journalId]: entries,
          },
        })),
        
      addJournal: (journal) => 
        set((state) => ({
          journals: { ...state.journals, [journal.id]: journal }
        })),

      removeJournal: (journalId) =>
        set((state) => {
          const newJournals = { ...state.journals };
          delete newJournals[journalId];
          return { journals: newJournals };
        }),

      // ------------------------------------------
      // Cleanup
      // ------------------------------------------
      leaveJournal: () => {
        const unsub = get()._unsubscribe;
        if (unsub) {
          unsub();
        }

        set({
          currentJournalId: null,
          // Note: We don't clear sharedEntries here so they persist offline if needed,
          // but we clear the active pointer
          journalInfo: null,
          _unsubscribe: null,
        });
      },

      reset: () => {
        get().leaveJournal();
        set({ sharedEntries: {}, journals: {} });
      },
    }),
    {
      name: "journal-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentJournalId: state.currentJournalId,
        journalInfo: state.journalInfo,
        journals: state.journals,
sharedEntries: state.sharedEntries, 
        currentUser: state.currentUser,
        lastRead: state.lastRead, // Persist read status
      }),
    }
  )
);
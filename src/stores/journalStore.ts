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
  photoUrl?: string;    // <--- Added this field
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
  deletedDocDates: string[]; // <--- New: Track deleted dates to kill ghosts
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

        // Flag to prevent notifications on the initial load
        let isFirstRun = true;

        // Listen to the top 20 entries
        const unsub = JournalService.subscribeToEntries(
          journalId,
          20, // Limit
          (recents, changes, isLocal) => {
            // Check for NEW arrivals (Notification Trigger)
            if (!isLocal && !isFirstRun) {
              changes.forEach((change) => {
                if (change.type === "added") {
                  const data = change.doc.data();
                  const isRecent = Date.now() - (data.createdAt || 0) < 60000;
                  const isOthers = data.owner !== get().currentUser && data.userId !== get().currentUser;

                  if (isRecent && isOthers) {
                    const author = data.authorName || "Someone";
                    sendImmediateNotification(
                      "New Journal Entry", 
                      `${author} added a new entry.`,
                      { journalId }
                    );
                  }
                }
              });
            }

            set((state) => {
              const currentList = state.sharedEntries[journalId] || [];
              const deletedDates = state.deletedDocDates || [];

              // 0. AUTO-DELETE Check (Tombstones)
              recents.forEach(async (e) => {
                 if (e.originalDate && deletedDates.includes(e.originalDate) && !e.entryId.startsWith('temp_')) {
                     console.log("Auto-deleting resurrected entry:", e.entryId);
                     await JournalService.deleteEntry(journalId, e.entryId);
                 }
              });

              // 1. Prepare "Kill Lists" using RAW recents (before filtering)
              // We need to know if the server has data for a date, even if we are about to hide it.
              const rawRecentMap = new Map(recents.map(e => [e.entryId, e]));
              const rawRecentDates = new Set(recents.map(e => e.originalDate).filter(Boolean));

              // 2. Filter recents (Hide tombstones from UI)
              const validRecents = recents.filter(e => !e.originalDate || !deletedDates.includes(e.originalDate));

              // 3. Filter history (Remove Ghosts & Duplicates)
              const validHistory = currentList.filter(e => {
                 // Remove if updated/replaced by a real entry (using RAW map)
                 if (rawRecentMap.has(e.entryId)) return false;

                 // Remove if it's a "Ghost" (temp_) AND the server sent a real entry for this date (using RAW dates)
                 if (typeof e.entryId === 'string' && e.entryId.startsWith('temp_') && e.originalDate && rawRecentDates.has(e.originalDate)) {
                     return false;
                 }
                 
                 return true;
              });
              
              // 4. Combine
              const merged = [...validRecents, ...validHistory];

              // 5. UPDATE PREVIEW: Sync "Last Entry" to the Journal List
              let updatedJournals = state.journals;
              const currentJournal = state.journals[journalId];

              if (currentJournal) {
                  const latest = merged.length > 0 ? merged[0] : null;
                  const newMeta = { ...currentJournal };

                  if (latest) {
                      newMeta.lastEntry = {
                          text: latest.text || "",
                          author: latest.authorName || "Anonymous",
                          createdAt: latest.createdAt
                      };
                      newMeta.updatedAt = latest.createdAt;
                  } else {
                      // No entries left -> Clear preview
                      delete newMeta.lastEntry;
                      newMeta.lastEntry = undefined;
                  }

                  updatedJournals = {
                      ...state.journals,
                      [journalId]: newMeta
                  };
              }

              return {
                sharedEntries: { ...state.sharedEntries, [journalId]: merged },
                journals: updatedJournals,
                isLoading: false,
              };
            });
            
            isFirstRun = false;
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
        // 1. Snapshot previous state (for rollback AND lookup)
        const prevState = get();

        // 2. Lookup the entry BEFORE we delete it to get metadata (like originalDate)
        const entryToDelete = prevState.sharedEntries[journalId]?.find(e => e.entryId === entryId);

        // 3. Optimistic Update: Remove from UI IMMEDIATELY
        set((state) => {
            const currentEntries = state.sharedEntries[journalId] || [];
            const newEntries = currentEntries.filter(e => e.entryId !== entryId);
            
            // Recalculate "Last Entry" for the cover card locally
            const sorted = [...newEntries].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const latest = sorted.length > 0 ? sorted[0] : null;

            const currentJournal = state.journals[journalId];
            if (!currentJournal) return { sharedEntries: { ...state.sharedEntries, [journalId]: newEntries } };

            const updatedJournal = { ...currentJournal };

            if (latest) {
                updatedJournal.lastEntry = {
                    text: latest.text || "",
                    author: latest.authorName || latest.author || "Anonymous",
                    createdAt: latest.createdAt
                };
            } else {
                delete updatedJournal.lastEntry;
                updatedJournal.lastEntry = undefined;
            }

            return {
              sharedEntries: {
                ...state.sharedEntries,
                [journalId]: newEntries
              },
              journals: {
                ...state.journals,
                [journalId]: updatedJournal
              }
            };
        });

        // 4. Handle Temporary Entry Deletion (Stop here if temp)
        if (typeof entryId === 'string' && entryId.startsWith('temp_')) {
            console.log("Deleted local temporary entry:", entryId);
            
            // FIX: Use the 'entryToDelete' we grabbed from prevState
            if (entryToDelete?.originalDate) {
                console.log("Adding tombstone for date:", entryToDelete.originalDate);
                set(s => ({ deletedDocDates: [...(s.deletedDocDates || []), entryToDelete.originalDate] }));
            } else {
                console.warn("Could not find originalDate for temp entry, it might resurrect.");
            }
            return;
        }

        try {
          // 5. Perform DB Delete in Background
          await JournalService.deleteEntry(journalId, entryId);
        } catch (error) {
          console.error("Failed to delete entry, rolling back:", error);
          // 6. Revert UI on error
          set({ 
            sharedEntries: prevState.sharedEntries, 
            journals: prevState.journals 
          });
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
          // Fix: Also update the specific journal in the list, which the UI reads
          journals: {
            ...state.journals,
            [journalId]: {
              ...(state.journals[journalId] || {}),
              ...data
            }
          }
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
// STATE
      currentJournalId: null,
      journals: {},                    // { [id]: JournalMeta } - Stores details of all joined journals
      sharedEntries: {},               // { [journalId]: Entry[] }
      journalInfo: null,               // Legacy fallback
      isLoading: false,
      _unsubscribe: null,
      currentUser: null,
      lastRead: {},
      deletedDocDates: [], // <--- Initial state
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
        lastRead: state.lastRead, 
        deletedDocDates: state.deletedDocDates, // Persist tombstones
      }),
    }
  )
);
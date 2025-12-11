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
  sharedEntries: Record<string, any[]>;
  journalInfo: JournalMeta | null;
  isLoading: boolean;
  _unsubscribes: Record<string, Unsubscribe>;
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

// Subscribe to ONE specific journal (idempotent: won't duplicate if already listening)
      subscribeToJournal: (journalId) => {
        // If we already have a listener for this journal, do nothing
        if (get()._unsubscribes[journalId]) return;

        set({ isLoading: true });

        let isFirstRun = true;

const unsub = JournalService.subscribeToEntries(
          journalId,
          20,
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
                    const journalName = get().journals[journalId]?.name || "Journal";
                    sendImmediateNotification(
                      `New Entry in ${journalName}`, 
                      `${author} just posted.`,
                      { journalId }
                    );
                  }
                }
              });
            }

            set((state) => {
              const currentList = state.sharedEntries[journalId] || [];
              const deletedDates = state.deletedDocDates || [];
              const rawRecentMap = new Map(recents.map(e => [e.entryId, e]));

              const validHistory = currentList.filter(e => {
                 if (rawRecentMap.has(e.entryId)) return false;
                 if (e.originalDate) {
                     const serverEntryForDate = recents.find(r => r.originalDate === e.originalDate);
                     if (serverEntryForDate) return false;
                 }
                 return true;
              });
              
              const merged = [...recents, ...validHistory];
              
              // Update Last Entry Preview
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
                  }
                  updatedJournals = { ...state.journals, [journalId]: newMeta };
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

        // Store the unsubscribe function in the map
        set((state) => ({
            _unsubscribes: { ...state._unsubscribes, [journalId]: unsub }
        }));
      },

      // NEW: Helper to listen to ALL joined journals at once
      subscribeToAllJournals: () => {
          const state = get();
          const allIds = Object.keys(state.journals);
          allIds.forEach(id => {
              get().subscribeToJournal(id);
          });
      },

      addSharedEntry: async (entry) => {
        const targetId = entry.journalId || get().currentJournalId;
        if (!targetId) return;

        // FIX: Whitelist this date immediately so the "Zombie Killer" doesn't attack our new entry
        if (entry.originalDate) {
            set((state) => ({
                deletedDocDates: (state.deletedDocDates || []).filter(d => d !== entry.originalDate)
            }));
        }

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
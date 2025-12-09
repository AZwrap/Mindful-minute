import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebaseConfig";
import {
  doc,
setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  deleteDoc,
collection,
  query,
  where, // Added
  getDocs, // Added
  orderBy,
  addDoc,
  Unsubscribe
} from "firebase/firestore";
import { auth } from "../firebaseConfig"; // Ensure Auth is imported
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
  updateSharedEntry: (journalId: string, entryId: string, newText: string) => Promise<void>;
  
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

// --------------------------------------------------
// UTILS
// --------------------------------------------------
function generateId() {
  return "jid_" + Math.random().toString(36).slice(2, 10);
}

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
        const journalId = generateId();
        const uid = auth.currentUser?.uid;
        
        const ref = doc(db, "journals", journalId);

        const newJournal: JournalMeta = {
          id: journalId,
          name: journalName || "Shared Journal",
          members: [ownerName],
          memberIds: uid ? [uid] : [], // Store UID for recovery
          owner: uid,
          createdAt: Date.now(),
        };

        await setDoc(ref, newJournal);

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
        const ref = doc(db, "journals", journalId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          throw new Error("Journal does not exist");
        }

const updates: any = {
          members: arrayUnion(memberName)
        };
        
        if (auth.currentUser?.uid) {
          updates.memberIds = arrayUnion(auth.currentUser.uid);
        }

        await updateDoc(ref, updates);

        const info = snap.data() as JournalMeta;

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
          // Query journals where 'memberIds' contains the current user's UID
          const q = query(collection(db, "journals"), where("memberIds", "array-contains", uid));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            set({ isLoading: false });
            return 0;
          }

          const restored: Record<string, JournalMeta> = {};
          snapshot.forEach((doc) => {
            const data = doc.data() as JournalMeta;
            restored[data.id] = data;
          });

          // Merge with existing
          set((state) => ({
            journals: { ...state.journals, ...restored },
            isLoading: false
          }));
          
          return snapshot.size;
        } catch (error) {
          console.error("Restore failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      // Subscribe to real-time updates
      subscribeToJournal: (journalId) => {
        // Clean previous listener
        const oldUnsub = get()._unsubscribe;
        if (oldUnsub) {
          oldUnsub();
        }

        set({ isLoading: true });

        // SCHEMA FIXED: Listen to sub-collection 'entries'
        const entriesRef = collection(db, "journals", journalId, "entries");
        const q = query(entriesRef, orderBy("createdAt", "desc"));

const unsub = onSnapshot(
          q,
          (snapshot) => {
            // 1. Convert docs to entries
            const entries = snapshot.docs.map((doc) => ({
              entryId: doc.id,
              ...doc.data(),
            }));

            // 2. Check for NEW arrivals (Notification Trigger)
            // We ignore initial load (snapshot.size === changes.length usually implies first sync)
            // We also ignore our own local writes (hasPendingWrites)
            if (!snapshot.metadata.hasPendingWrites) {
              snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                  const data = change.doc.data();
                  // Only notify if the entry is recent (e.g., within last minute) to prevent blast on reconnect
                  const isRecent = Date.now() - (data.createdAt || 0) < 60000;
                  
                  // Don't notify for own actions
                  const isOthers = data.owner !== get().currentUser && data.userId !== get().currentUser;

                  if (isRecent && isOthers) {
                    const author = data.authorName || "Someone";
                    sendImmediateNotification("New Journal Entry", `${author} added a new entry.`);
                  }
                }
              });
            }

            // 3. Update Store
            set((state) => ({
              sharedEntries: {
                ...state.sharedEntries,
                [journalId]: entries,
              },
              isLoading: false,
            }));
          },
          (error) => {
            console.error("Shared Journal Sync Error:", error);
            set({ isLoading: false });
          }
        );

        set({ _unsubscribe: unsub });
      },

// Add entry to shared journal
      addSharedEntry: async (entry) => {
        const targetId = entry.journalId || get().currentJournalId;
        if (!targetId) return;

        const timestamp = Date.now();
        const entriesCol = collection(db, "journals", targetId, "entries");
        const journalRef = doc(db, "journals", targetId);
        
        // 1. Add the Entry
        await addDoc(entriesCol, {
          ...entry,
          createdAt: timestamp,
        });

        // 2. Update Journal Metadata (Snippet)
        // This allows the list screen to show "User: Hello..." without fetching all entries
        await updateDoc(journalRef, {
          lastEntry: {
            text: entry.text.substring(0, 50),
            author: entry.authorName,
            createdAt: timestamp
          },
          updatedAt: timestamp
        });
      },

      // Delete an entry
      deleteSharedEntry: async (journalId: string, entryId: string) => {
        try {
          const ref = doc(db, "journals", journalId, "entries", entryId);
          await deleteDoc(ref);
          
          // Optimistic update: Remove from local state immediately
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

      // Update an entry
      updateSharedEntry: async (journalId: string, entryId: string, newText: string) => {
        try {
          const ref = doc(db, "journals", journalId, "entries", entryId);
          await updateDoc(ref, {
            text: newText,
            updatedAt: Date.now(),
          });
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
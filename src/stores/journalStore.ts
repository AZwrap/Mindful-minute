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
  collection,
  query,
  orderBy,
  addDoc,
  Unsubscribe
} from "firebase/firestore";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

// Metadata for the journal itself
export interface JournalMeta {
  id: string;
  name: string;
  members: string[];      // Array of user IDs or Names
  createdAt?: any;        // Firestore Timestamp or number
  owner?: string;
}

// State & Actions
interface JournalState {
  currentJournalId: string | null;
  sharedEntries: Record<string, any[]>; // { [journalId]: Entry[] }
  journalInfo: JournalMeta | null;
  isLoading: boolean;
  _unsubscribe: Unsubscribe | null;
  journals: Record<string, JournalMeta>; // List of joined journals
  currentUser: string | null; // Track who is logged in (for invites)
}

interface JournalActions {
  createJournal: (ownerName: string) => Promise<string>;
  joinJournal: (journalId: string, memberName?: string) => Promise<boolean>;
  subscribeToJournal: (journalId: string) => void;
  addSharedEntry: (entry: any) => Promise<void>;
  
  // Helpers for SyncedService
  setSharedEntries: (journalId: string, entries: any[]) => void;
  updateJournalMeta: (journalId: string, data: any) => void;
  addSharedEntryList: (journalId: string, entries: any[]) => void;
  addJournal: (journal: JournalMeta) => void;
  removeJournal: (journalId: string) => void;
  setCurrentUser: (userId: string) => void;
  
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
      sharedEntries: {},
      journalInfo: null,
      isLoading: false,
      _unsubscribe: null,
      journals: {},
      currentUser: null,

      // ACTIONS
      setCurrentUser: (userId) => set({ currentUser: userId }),

      // Create a new shared journal
      createJournal: async (ownerName = "User") => {
        const journalId = generateId();
        
        // SCHEMA FIXED: Use 'journals' root collection
        const ref = doc(db, "journals", journalId);

        const newJournal: JournalMeta = {
          id: journalId,
          name: "Shared Journal",
          members: [ownerName],
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

        await updateDoc(ref, {
          members: arrayUnion(memberName),
        });

        const info = snap.data() as JournalMeta;

        set((state) => ({
          currentJournalId: journalId,
          journalInfo: info,
          journals: { ...state.journals, [journalId]: info }
        }));

        get().subscribeToJournal(journalId);
        return true;
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
            const entries = snapshot.docs.map((doc) => ({
              entryId: doc.id,
              ...doc.data(),
            }));

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
        const journalId = get().currentJournalId;
        if (!journalId) return;

        // SCHEMA FIXED: Add to 'entries' sub-collection
        const entriesCol = collection(db, "journals", journalId, "entries");
        
        await addDoc(entriesCol, {
          ...entry,
          createdAt: Date.now(),
        });
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
        // We persist shared entries so they load offline
        sharedEntries: state.sharedEntries, 
        currentUser: state.currentUser,
      }),
    }
  )
);
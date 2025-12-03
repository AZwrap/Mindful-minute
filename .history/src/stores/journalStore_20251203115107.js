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
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";

// --------------------------------------------------
// Utility: Generate ID (safe for Expo)
// --------------------------------------------------
function generateId() {
  return "jid_" + Math.random().toString(36).slice(2, 10);
}

export const useJournalStore = create(
  persist(
    (set, get) => ({
      // --------------------------------------------------
      // STATE
      // --------------------------------------------------
      currentJournalId: null,
      sharedEntries: {}, // { [journalId]: [...] }
      journalInfo: null, // metadata of journal
      isLoading: false,
      _unsubscribe: null, // Firestore listener cleanup

      // --------------------------------------------------
      // ACTIONS
      // --------------------------------------------------

      // Create a new shared journal
      createJournal: async (ownerName = "User") => {
        const journalId = generateId();
        const ref = doc(db, "sharedJournals", journalId);

        await setDoc(ref, {
          id: journalId,
          createdAt: serverTimestamp(),
          members: [ownerName],
          name: "Shared Journal",
        });

        set({
          currentJournalId: journalId,
          journalInfo: { id: journalId, members: [ownerName], name: "Shared Journal" },
        });

        get().subscribeToJournal(journalId);
        return journalId;
      },

      // Join an existing journal
      joinJournal: async (journalId, memberName = "User") => {
        const ref = doc(db, "sharedJournals", journalId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          throw new Error("Journal does not exist");
        }

        await updateDoc(ref, {
          members: arrayUnion(memberName),
        });

        set({
          currentJournalId: journalId,
          journalInfo: snap.data(),
        });

        get().subscribeToJournal(journalId);
        return true;
      },

      // Subscribe to real-time updates (With Loading State)
      subscribeToJournal: (journalId) => {
        // Clean previous listener
        if (get()._unsubscribe) {
          get()._unsubscribe();
        }

        // 1. Start Loading
        set({ isLoading: true });

        const entriesRef = doc(db, "sharedEntries", journalId);

        const unsub = onSnapshot(
          entriesRef,
          (snap) => {
            const data = snap.data();
            const entries = data?.entries || [];

            const prev = get().sharedEntries?.[journalId] || [];

            // Only update if changed
            const changed =
              prev.length !== entries.length ||
              JSON.stringify(prev) !== JSON.stringify(entries);

            if (changed) {
              set((state) => ({
                sharedEntries: {
                  ...state.sharedEntries,
                  [journalId]: entries,
                },
              }));
            }

            // 2. Stop Loading (Success)
            set({ isLoading: false });
          },
          (error) => {
            console.error("Shared Journal Sync Error:", error);
            // 3. Stop Loading (Error)
            set({ isLoading: false });
          }
        );

        set({ _unsubscribe: unsub });
      },

      // Add entry to shared journal
      addSharedEntry: async (entry) => {
        const journalId = get().currentJournalId;
        if (!journalId) return;

        const ref = doc(db, "sharedEntries", journalId);

        // We use setDoc with merge to ensure the document exists if it hasn't been created yet
        await setDoc(
          ref,
          { entries: arrayUnion(entry) },
          { merge: true }
        );
      },

      // Helpers for SyncedService
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
            ...(state.journalInfo || {}),
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

      // Leave / Reset
      leaveJournal: () => {
        if (get()._unsubscribe) {
          get()._unsubscribe();
        }

        set({
          currentJournalId: null,
          sharedEntries: {},
          journalInfo: null,
          _unsubscribe: null,
        });
      },

      reset: () => {
        get().leaveJournal();
      },
    }),
    {
      name: "journal-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentJournalId: state.currentJournalId,
        journalInfo: state.journalInfo,
      }),
    }
  )
);
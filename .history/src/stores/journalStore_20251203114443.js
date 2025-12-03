import { create } from "zustand";
import { persist } from "zustand/middleware";
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
      currentJournalId: null,          // The ONLY shared journal
      sharedEntries: {},               // { [journalId]: [...] }
         // Entries inside the shared journal
      journalInfo: null,               // metadata of journal
      isLoading: false,
      _unsubscribe: null,              // Firestore listener cleanup

      // --------------------------------------------------
      // ACTION: Create a new shared journal
      // --------------------------------------------------
      createJournal: async (ownerName = "User") => {
        const journalId = generateId();

        const ref = doc(db, "sharedJournals", journalId);

        await setDoc(ref, {
          id: journalId,
          createdAt: serverTimestamp(),
          members: [ownerName],
        });

        set({
          currentJournalId: journalId,
          journalInfo: { id: journalId, members: [ownerName] },
        });

        get().subscribeToJournal(journalId);

        return journalId;
      },

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
    journals: {
      ...(state.journals || {}),
      [journalId]: {
        ...(state.journals?.[journalId] || {}),
        ...data,
      },
    },
  })),
addSharedEntryList: (journalId, entries) =>
  set((state) => ({
    sharedEntries: {
      ...state.sharedEntries,
      [journalId]: entries,
    },
  })),


      // --------------------------------------------------
      // ACTION: Join existing journal
      // --------------------------------------------------
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

// --------------------------------------------------
      // ACTION: Subscribe to shared journal updates
      // --------------------------------------------------
      subscribeToJournal: (journalId) => {
        // Clean previous listener
        if (get()._unsubscribe) {
          get()._unsubscribe();
        }

        // 1. Set loading to true immediately
        set({ isLoading: true });

        const entriesRef = doc(db, "sharedEntries", journalId);

        const unsub = onSnapshot(
          entriesRef, 
          (snap) => {
            const data = snap.data();
            const entries = data?.entries || [];

            const prev = get().sharedEntries?.[journalId] || [];

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
            
            // 2. Data received, stop loading
            set({ isLoading: false });
          },
          (error) => {
            console.error("Shared Journal Sync Error:", error);
            set({ isLoading: false }); // Stop loading even on error
          }
        );

        set({ _unsubscribe: unsub });
      },
        }

        const entriesRef = doc(db, "sharedEntries", journalId);

        const unsub = onSnapshot(entriesRef, (snap) => {
  const data = snap.data();
  const entries = data?.entries || [];

  const prev = get().sharedEntries?.[journalId] || [];

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
});


        set({ _unsubscribe: unsub });
      },

      // --------------------------------------------------
      // ACTION: Add entry to shared journal
      // --------------------------------------------------
      addSharedEntry: async (entry) => {
        const journalId = get().currentJournalId;
        if (!journalId) return;

        const ref = doc(db, "sharedEntries", journalId);

        await updateDoc(ref, {
          entries: arrayUnion(entry),
        });
      },

      // --------------------------------------------------
      // ACTION: Leave journal (clear local only)
      // --------------------------------------------------
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

      createSharedJournal: async (name) => {
  const id = "j-" + Math.random().toString(36).slice(2, 10);

  await setDoc(doc(db, "sharedJournals", id), {
    name: name || "Shared Journal",
    createdAt: Date.now(),
    owner: "you",
  });

  set({
    currentJournalId: id,
    sharedEntries: {
      ...get().sharedEntries,
      [id]: [],
    },
  });

  return id;
},

joinSharedJournal: async (journalId) => {
  if (!journalId) return false;

  const ref = doc(db, "sharedJournals", journalId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return false;

  // local: ensure journal slot exists
  const existing = get().sharedEntries[journalId] || [];

  set({
    currentJournalId: journalId,
    sharedEntries: {
      ...get().sharedEntries,
      [journalId]: existing,
    },
  });

  return true;
},

setCurrentJournal: (id) => set({ currentJournalId: id }),


      // --------------------------------------------------
      // Cleanup on unmount (optional)
      // --------------------------------------------------
      reset: () => {
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
    }),
    {
      name: "journal-store",
      partialize: (state) => ({
        currentJournalId: state.currentJournalId,
      }),
    }
  )
);

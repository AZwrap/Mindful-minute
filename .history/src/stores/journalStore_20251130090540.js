// journalStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

// Simple ID generator (no expo-crypto needed)
const generateId = () => Math.random().toString(36).substring(2, 12);

export const useJournalStore = create(
  persist(
    (set, get) => ({
      // ----------------------------------------
      // LOCAL JOURNAL (PRIVATE ENTRIES)
      // ----------------------------------------
      entries: {}, // { "2025-01-01": { text, moodTag } }

      // Save a private entry
      saveEntry: (date, text, moodTag) => {
        set((state) => ({
          entries: {
            ...state.entries,
            [date]: { text, moodTag },
          },
        }));
      },

      // Delete a private entry
      deleteEntry: (date) => {
        const next = { ...get().entries };
        delete next[date];
        set({ entries: next });
      },

      // ----------------------------------------
      // SHARED JOURNALS (ONLINE)
      // ----------------------------------------
      journals: [], // [{ journalId, name, members, entries: [] }]

      // local cache of Firestore unsubscribe functions
      _unsubs: {},

      // Create a new shared journal (owner + members)
      createSharedJournal: async (ownerEmail, name = "Shared Journal") => {
        const id = generateId();
        const journalRef = doc(db, "journals", id);

        await setDoc(journalRef, {
          journalId: id,
          name,
          members: [ownerEmail],
        });

        // Add locally
        set((state) => ({
          journals: [
            ...state.journals,
            {
              journalId: id,
              name,
              members: [ownerEmail],
              entries: [],
            },
          ],
        }));

        return id;
      },

      // Join an existing journal
      joinSharedJournal: async (journalId, userEmail) => {
        const journalRef = doc(db, "journals", journalId);

        await setDoc(
          journalRef,
          {
            members: [userEmail],
          },
          { merge: true }
        );

        // Add locally if missing
        const exists = get().journals.find(
          (j) => j.journalId === journalId
        );

        if (!exists) {
          set((state) => ({
            journals: [
              ...state.journals,
              {
                journalId,
                name: "Shared Journal",
                members: [userEmail],
                entries: [],
              },
            ],
          }));
        }
      },

      // ----------------------------------------
      // REAL-TIME SYNC
      // ----------------------------------------
      subscribeToJournal: (journalId) => {
        const { _unsubs } = get();

        // prevent duplicate listeners
        if (_unsubs[journalId]) return;

        const colRef = collection(
          db,
          "journals",
          journalId,
          "entries"
        );

        const unsub = onSnapshot(colRef, (snap) => {
          const entries = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          // Update only matching journal (safe updater)
          set((state) => ({
            journals: state.journals.map((j) =>
              j.journalId === journalId
                ? { ...j, entries }
                : j
            ),
          }));
        });

        // cache the unsubscribe function
        set((state) => ({
          _unsubs: { ...state._unsubs, [journalId]: unsub },
        }));
      },

      // ----------------------------------------
      // SHARED ENTRY ACTIONS
      // ----------------------------------------
      addSharedEntry: async (journalId, text, author) => {
        const entryId = generateId();

        const entryRef = doc(
          db,
          "journals",
          journalId,
          "entries",
          entryId
        );

        const entry = {
          id: entryId,
          text,
          author,
          createdAt: Date.now(),
        };

        await setDoc(entryRef, entry);
      },

      updateSharedEntry: async (journalId, entryId, newText) => {
        const ref = doc(
          db,
          "journals",
          journalId,
          "entries",
          entryId
        );

        await setDoc(
          ref,
          {
            text: newText,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      },

      deleteSharedEntry: async (journalId, entryId) => {
        const ref = doc(
          db,
          "journals",
          journalId,
          "entries",
          entryId
        );

        await deleteDoc(ref);
      },
    }),
    {
      name: "journal-storage",
      partialize: (state) => ({
        entries: state.entries,
        journals: state.journals,
      }),
    }
  )
);

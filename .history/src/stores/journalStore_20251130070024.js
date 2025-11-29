// src/stores/journalStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";


// NOTE:
// A real UID is required for Firestore security.
// For now: anonymous device UID (until you add real auth)
const deviceUID = uuidv4();

export const useJournalStore = create(
  persist(
    (set, get) => ({

      // ─────────────────────────────────────────────
      // CURRENT USER (required for Firestore rules)
      // ─────────────────────────────────────────────
      currentUser: deviceUID,

      // ─────────────────────────────────────────────
      // ALL JOURNALS (private + shared)
      // ─────────────────────────────────────────────
      journals: [],

      // ─────────────────────────────────────────────
      // ADD JOURNAL (local + shared)
      // ─────────────────────────────────────────────
      addJournal: (journal) => {
        const journals = get().journals;

        // If journal already exists → update it
        const exists = journals.find((j) => j.journalId === journal.journalId);

        if (exists) {
          set({
            journals: journals.map((j) =>
              j.journalId === journal.journalId
                ? { ...j, ...journal }
                : j
            ),
          });
        } else {
          set({ journals: [...journals, journal] });
        }
      },

      // ─────────────────────────────────────────────
      // UPDATE JOURNAL (used by Firestore sync)
      // ─────────────────────────────────────────────
      updateJournal: (journalId, data) => {
        const journals = get().journals;
        set({
          journals: journals.map((j) =>
            j.journalId === journalId ? { ...j, ...data } : j
          ),
        });
      },

      // ─────────────────────────────────────────────
      // REMOVE JOURNAL (owner only)
      // ─────────────────────────────────────────────
      removeJournal: (journalId) => {
        const journals = get().journals;
        set({
          journals: journals.filter((j) => j.journalId !== journalId),
        });
      },

      // ─────────────────────────────────────────────
      // GET SPECIFIC JOURNAL
      // ─────────────────────────────────────────────
      getJournalById: (journalId) => {
        return get().journals.find((j) => j.journalId === journalId);
      },

    }),
    {
      name: "journal-store",
    }
  )
);

console.log("ENTRIES STORE LOADED", useEntriesStore ? "OK" : "ERROR");

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useEntriesStore = create(
  persist(
    (set, get) => ({

      // ─────────────────────────────────────────────
      // LOCAL ENTRIES (private journals)
      // ─────────────────────────────────────────────
      entries: [],

      // ─────────────────────────────────────────────
      // SHARED ENTRIES: stored by journalId
      // {
      //   journalId: [entry1, entry2...]
      // }
      // ─────────────────────────────────────────────
      sharedEntries: {},

      // ============================================================
      // PRIVATE ENTRY CREATION
      // ============================================================
      addEntry: (entry) => {
        const list = get().entries;
        set({ entries: [...list, entry] });
      },

      // ============================================================
      // SHARED ENTRY CREATION (local only)
      // ============================================================
      addSharedEntryLocal: (journalId, entry) => {
        const current = get().sharedEntries[journalId] || [];
        set({
          sharedEntries: {
            ...get().sharedEntries,
            [journalId]: [...current, entry],
          },
        });
      },

      // ============================================================
      // GET ENTRIES FOR JOURNAL
      // ============================================================
      getEntriesForJournal: (journalId, isShared = false) => {
        if (isShared) {
          return get().sharedEntries[journalId] || [];
        }
        return get().entries.filter((e) => e.journalId === journalId);
      },

      // ============================================================
      // DELETE PRIVATE ENTRY
      // ============================================================
      deleteEntry: (entryId) => {
        set({
          entries: get().entries.filter((e) => e.entryId !== entryId),
        });
      },

      // ============================================================
      // DELETE SHARED ENTRY (local only)
      // Firestore delete comes later
      // ============================================================
      deleteSharedEntryLocal: (journalId, entryId) => {
        const current = get().sharedEntries[journalId] || [];
        set({
          sharedEntries: {
            ...get().sharedEntries,
            [journalId]: current.filter((e) => e.entryId !== entryId),
          },
        });
      },

    }),
    {
      name: "entries-store",
    }
  )
);

// ✅ Correct export — proper Zustand hook
export const useEntries = (...args) => useEntriesStore(...args);

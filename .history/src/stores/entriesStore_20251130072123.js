// src/stores/entriesStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addSharedEntry } from "../services/syncedJournalService";


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
      // PRIVATE ENTRY CREATION (unchanged behavior)
      // ============================================================
      addEntry: (entry) => {
        const list = get().entries;
        set({ entries: [...list, entry] });
      },

      // ============================================================
      // SHARED ENTRY CREATION (syncs to Firestore)
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

      // Called from UI → sends to Firestore then local
      saveSharedEntry: async (journalId, entry) => {
        await addSharedEntry(journalId, entry);
        get().addSharedEntryLocal(journalId, entry);
      },

      // ============================================================
      // SHARED ENTRY SYNC (from Firestore onSnapshot)
      // ============================================================
      loadSharedEntries: (journalId, entries) => {
        set({
          sharedEntries: {
            ...get().sharedEntries,
            [journalId]: entries,
          },
        });
      },

      // ============================================================
      // GET ENTRIES FOR A GIVEN JOURNAL
      // Shared journals → real-time sync
      // Private journals → local entries[]
      // ============================================================
      getEntriesForJournal: (journalId, isShared = false) => {
        if (isShared) {
          return get().sharedEntries[journalId] || [];
        }
        return get().entries.filter((e) => e.journalId === journalId);
      },

      // ============================================================
      // DELETE ENTRY (PRIVATE)
      // ============================================================
      deleteEntry: (entryId) => {
        set({
          entries: get().entries.filter((e) => e.entryId !== entryId),
        });
      },

      // ============================================================
      // DELETE ENTRY (SHARED)
      // Firestore version is step 6
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
export const useEntries = useEntriesStore;

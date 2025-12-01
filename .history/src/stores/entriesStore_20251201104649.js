// src/stores/entriesStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware"; // Updated import
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useEntriesStore = create(
  persist(
    (set, get) => ({
      // ─────────────────────────────────────────────
      // PRIVATE JOURNAL ENTRIES (BY DATE)
      // ─────────────────────────────────────────────
      entries: {}, // Main storage: { "2024-01-01": { text, mood, prompt... } }

      // FIXED: Accepts a single object 'newEntry' to match your screens
      upsert: (newEntry) => {
        const { date } = newEntry;
        if (!date) return;

        set((state) => ({
          entries: {
            ...state.entries,
            [date]: {
              ...state.entries[date], // Keep existing data if merging
              ...newEntry,            // Overwrite with new data
            },
          },
        }));
      },

      deleteEntry: (date) => {
        set((state) => {
          const copy = { ...state.entries };
          delete copy[date];
          return { entries: copy };
        });
      },

      // Helper for screens that try to use s.map (alias for entries)
      get map() {
        return get().entries;
      },

      // ─────────────────────────────────────────────
      // DRAFT SYSTEM
      // ─────────────────────────────────────────────
      drafts: {},

      setDraft: (date, text) => {
        set((state) => ({
          drafts: { ...state.drafts, [date]: text },
        }));
      },

      getDraft: (date) => {
        return get().drafts?.[date] || "";
      },

      // ─────────────────────────────────────────────
      // DRAFT TIMER & POMODORO
      // ─────────────────────────────────────────────
      draftTimers: {},
      pomodoroState: {},

      setDraftTimer: (date, seconds, pomodoroData = null) => {
        set((state) => {
          const updates = {
            draftTimers: { ...state.draftTimers, [date]: seconds },
          };
          if (pomodoroData) {
            updates.pomodoroState = {
              ...state.pomodoroState,
              [date]: pomodoroData,
            };
          }
          return updates;
        });
      },

      getDraftTimer: (date) => {
        return get().draftTimers?.[date] ?? null;
      },

      getPomodoroState: (date) => {
        return get().pomodoroState?.[date] ?? null;
      },
    }),
    {
      name: "entries-store",
      storage: createJSONStorage(() => AsyncStorage), // Standard Zustand/AsyncStorage setup
    }
  )
);
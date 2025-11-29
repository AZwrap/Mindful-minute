// entriesStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useEntriesStore = create(
  persist(
    (set, get) => ({
      // ─────────────────────────────────────────────
      // PRIVATE JOURNAL ENTRIES (BY DATE)
      // ─────────────────────────────────────────────
      entries: {}, // { "2024-01-01": { text, moodTag } }

      upsert: (date, text, moodTag) => {
        set((state) => ({
          entries: {
            ...state.entries,
            [date]: { text, moodTag },
          },
        }));
      },

      deleteEntry: (date) => {
        const copy = { ...get().entries };
        delete copy[date];
        set({ entries: copy });
      },

      // ─────────────────────────────────────────────
      // DRAFT SYSTEM
      // ─────────────────────────────────────────────
      drafts: {}, // { "2024-01-01": "draft text" }

      setDraft: (date, text) => {
        set((state) => ({
          drafts: { ...state.drafts, [date]: text },
        }));
      },

      getDraft: (date) => {
        return get().drafts?.[date] || "";
      },

      // ─────────────────────────────────────────────
      // DRAFT TIMER STORAGE
      // ─────────────────────────────────────────────
      draftTimers: {}, // { "2024-01-01": secondsRemaining }

      setDraftTimer: (date, seconds) => {
        set((state) => ({
          draftTimers: { ...state.draftTimers, [date]: seconds },
        }));
      },

      getDraftTimer: (date) => {
        return get().draftTimers?.[date] ?? null;
      },

      // ─────────────────────────────────────────────
      // POMODORO STATE STORAGE
      // ─────────────────────────────────────────────
      pomodoroState: {}, // { date: { cycle, phase } }

      setPomodoroState: (date, data) => {
        set((state) => ({
          pomodoroState: { ...state.pomodoroState, [date]: data },
        }));
      },

      getPomodoroState: (date) => {
        return get().pomodoroState?.[date] ?? null;
      },
    }),
    {
      name: "entries-store",

      // IMPORTANT: real React Native storage
      storage: {
        getItem: async (name) => {
          const item = await AsyncStorage.getItem(name);
          return item ? JSON.parse(item) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);

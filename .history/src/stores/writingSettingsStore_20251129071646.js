import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useWritingSettings = create(
  persist(
    (set) => ({
      // Default writing settings
      writeDuration: 60,      // seconds
      breakDuration: 30,      // seconds
      totalCycles: 4,         // cycles
      showTimer: true,        // toggle for timer visibility

      // Setters
      setWriteDuration: (v) => set({ writeDuration: Number(v) }),
setBreakDuration: (v) => set({ breakDuration: Number(v) }),
setTotalCycles: (v) => set({ totalCycles: Number(v) }),

      setShowTimer: (v) => set({ showTimer: v }),
    }),
    {
      name: "writing-settings", // MMKV / storage key
    }
  )
);

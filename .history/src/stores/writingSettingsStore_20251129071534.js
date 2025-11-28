import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useWritingSettings = create(
  persist(
    (set) => ({
      // Default writing settings
     setWriteDuration: (v) => set({ writeDuration: Number(v) }),
setBreakDuration: (v) => set({ breakDuration: Number(v) }),
setTotalCycles: (v) => set({ totalCycles: Number(v) }),

      showTimer: true,        // toggle for timer visibility

      // Setters
      setWriteDuration: (v) => set({ writeDuration: v }),
      setBreakDuration: (v) => set({ breakDuration: v }),
      setTotalCycles: (v) => set({ totalCycles: v }),
      setShowTimer: (v) => set({ showTimer: v }),
    }),
    {
      name: "writing-settings", // MMKV / storage key
    }
  )
);

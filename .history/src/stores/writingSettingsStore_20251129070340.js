import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useWritingSettings = create(
  persist(
    (set) => ({
      writeDuration: 60,          // default 1 min
      breakDuration: 30,          // default 30s
      totalCycles: 4,             // default 4 cycles
      showTimer: true,            // toggle in settings

      setWriteDuration: (v) => set({ writeDuration: v }),
      setBreakDuration: (v) => set({ breakDuration: v }),
      setTotalCycles: (v) => set({ totalCycles: v }),
      setShowTimer: (v) => set({ showTimer: v }),
    }),
    { name: "writing-settings" }
  )
);

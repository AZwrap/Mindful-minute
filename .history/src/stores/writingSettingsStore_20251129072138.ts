import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useWritingSettings = create(
  persist(
    (set) => ({
      // default values
      writeDuration: 60,
      breakDuration: 30,
      totalCycles: 4,
      showTimer: true,

      // setters
      setWriteDuration: (v) => set({ writeDuration: Number(v) }),
      setBreakDuration: (v) => set({ breakDuration: Number(v) }),
      setTotalCycles: (v) => set({ totalCycles: Number(v) }),
      setShowTimer: (v) => set({ showTimer: v }),
    }),
    {
      name: "writing-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

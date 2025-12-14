import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WritingSettingsState {
  writeDuration: number; // Seconds
  breakDuration: number;
  totalCycles: number;
  showTimer: boolean;
  autoStartBreak: boolean;
}

interface WritingSettingsActions {
  setWriteDuration: (sec: number) => void;
  setBreakDuration: (sec: number) => void;
  setTotalCycles: (count: number) => void;
  setShowTimer: (show: boolean | ((prev: boolean) => boolean)) => void;
  setAutoStartBreak: (val: boolean) => void;
}

export const useWritingSettings = create<WritingSettingsState & WritingSettingsActions>()(
  persist(
    (set) => ({
      writeDuration: 60,
      breakDuration: 30,
      totalCycles: 4,
      showTimer: true,
      autoStartBreak: false,

      setWriteDuration: (d) => set({ writeDuration: d }),
      setBreakDuration: (d) => set({ breakDuration: d }),
      setTotalCycles: (c) => set({ totalCycles: c }),
      setShowTimer: (val) => set((state) => ({ 
        showTimer: typeof val === 'function' ? val(state.showTimer) : val 
      })),
      setAutoStartBreak: (val) => set({ autoStartBreak: val }),
    }),
    {
      name: 'writing-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
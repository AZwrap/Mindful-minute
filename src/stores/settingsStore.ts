import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface SettingsState {
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  preserveTimerProgress: boolean;
  gratitudeModeEnabled: boolean;
  zenModeEnabled: boolean; // New Setting
  reminderTime: { hour: number; minute: number };
  hasOnboarded: boolean;
  isBiometricsEnabled: boolean;
  smartRemindersEnabled: boolean;
  loaded: boolean;
}

interface SettingsActions {
  setHapticsEnabled: (val: boolean) => void;
  setSoundEnabled: (val: boolean) => void;
setPreserveTimerProgress: (val: boolean) => void;
  setGratitudeModeEnabled: (val: boolean) => void;
  setZenModeEnabled: (val: boolean) => void; // New Action
  setHasOnboarded: (val: boolean) => void;
setIsBiometricsEnabled: (val: boolean) => void;
  setSmartRemindersEnabled: (val: boolean) => void;
  setReminderTime: (hour: number, minute: number) => void; // New Action
  setLoaded: (val: boolean) => void;
}

type SettingsStore = SettingsState & SettingsActions;

// --------------------------------------------------
// STORE
// --------------------------------------------------
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      // STATE
      hapticsEnabled: true,
      soundEnabled: true,
preserveTimerProgress: true,
      gratitudeModeEnabled: false,
      zenModeEnabled: false, // Default to off
      hasOnboarded: false,
      isBiometricsEnabled: false,
      smartRemindersEnabled: false,
      reminderTime: { hour: 20, minute: 0 }, // Default to 8:00 PM
      
      loaded: false, 

      // ACTIONS
      setHapticsEnabled: (val) => set({ hapticsEnabled: val }),
      setSoundEnabled: (val) => set({ soundEnabled: val }),
setPreserveTimerProgress: (val) => set({ preserveTimerProgress: val }),
      setGratitudeModeEnabled: (val) => set({ gratitudeModeEnabled: val }),
      setZenModeEnabled: (val) => set({ zenModeEnabled: val }),
      setHasOnboarded: (val) => set({ hasOnboarded: val }),
setIsBiometricsEnabled: (val) => set({ isBiometricsEnabled: val }),
      setSmartRemindersEnabled: (val) => set({ smartRemindersEnabled: val }),
      setReminderTime: (hour, minute) => set({ reminderTime: { hour, minute } }),
      
      setLoaded: (val) => set({ loaded: val }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      
      partialize: (state) => ({
        hapticsEnabled: state.hapticsEnabled,
        soundEnabled: state.soundEnabled,
preserveTimerProgress: state.preserveTimerProgress,
        gratitudeModeEnabled: state.gratitudeModeEnabled,
        zenModeEnabled: state.zenModeEnabled,
hasOnboarded: state.hasOnboarded,
        isBiometricsEnabled: state.isBiometricsEnabled,
        smartRemindersEnabled: state.smartRemindersEnabled,
        reminderTime: state.reminderTime,
      }),
      
      // FIXED: Added safe navigation operator (?.) to prevent crash if state is undefined
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoaded(true);
        }
      },
    }
  )
);
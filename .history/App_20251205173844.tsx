import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface SettingsState {
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  preserveTimerProgress: boolean;
  gratitudeModeEnabled: boolean;
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
  setHasOnboarded: (val: boolean) => void;
  setIsBiometricsEnabled: (val: boolean) => void;
  setSmartRemindersEnabled: (val: boolean) => void;
  setLoaded: (val: boolean) => void;
}

// Combined Store Type
type SettingsStore = SettingsState & SettingsActions;

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(console.warn);

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
      hasOnboarded: false,
      isBiometricsEnabled: false,
      smartRemindersEnabled: false,
      
      loaded: false, 

      // ACTIONS
      setHapticsEnabled: (val) => set({ hapticsEnabled: val }),
      setSoundEnabled: (val) => set({ soundEnabled: val }),
      setPreserveTimerProgress: (val) => set({ preserveTimerProgress: val }),
      setGratitudeModeEnabled: (val) => set({ gratitudeModeEnabled: val }),
      setHasOnboarded: (val) => set({ hasOnboarded: val }),
      setIsBiometricsEnabled: (val) => set({ isBiometricsEnabled: val }),
      setSmartRemindersEnabled: (val) => set({ smartRemindersEnabled: val }),
      
      setLoaded: (val) => set({ loaded: val }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      
      // Ensure we only persist the preferences, not the 'loaded' flag
      partialize: (state) => ({
        hapticsEnabled: state.hapticsEnabled,
        soundEnabled: state.soundEnabled,
        preserveTimerProgress: state.preserveTimerProgress,
        gratitudeModeEnabled: state.gratitudeModeEnabled,
        hasOnboarded: state.hasOnboarded,
        isBiometricsEnabled: state.isBiometricsEnabled,
        smartRemindersEnabled: state.smartRemindersEnabled,
      }),
      
      // Trigger loaded state when hydration finishes
      onRehydrateStorage: () => (state) => {
        state?.setLoaded(true);
      },
    }
  )
);
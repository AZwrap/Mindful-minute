import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSettings = create(
  persist(
    (set) => ({
      // --------------------------------------------------
      // STATE
      // --------------------------------------------------
      hapticsEnabled: true,
      soundEnabled: true,
      preserveTimerProgress: true,
      gratitudeModeEnabled: false,
      hasOnboarded: false,        // Track if user saw onboarding
      isBiometricsEnabled: false, // Track if app lock is active

      // --------------------------------------------------
      // ACTIONS
      // --------------------------------------------------
      setHapticsEnabled: (val) => set({ hapticsEnabled: val }),
      
      setSoundEnabled: (val) => set({ soundEnabled: val }),
      
      setPreserveTimerProgress: (val) => set({ preserveTimerProgress: val }),

      setGratitudeModeEnabled: (val) => set({ gratitudeModeEnabled: val }),
      
      setHasOnboarded: (val) => set({ hasOnboarded: val }),
      
      setIsBiometricsEnabled: (val) => set({ isBiometricsEnabled: val }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // This ensures ONLY these fields are saved to disk
      partialize: (state) => ({
        hapticsEnabled: state.hapticsEnabled,
        soundEnabled: state.soundEnabled,
        preserveTimerProgress: state.preserveTimerProgress,
        gratitudeModeEnabled: state.gratitudeModeEnabled,
        hasOnboarded: state.hasOnboarded,
        isBiometricsEnabled: state.isBiometricsEnabled,
      }),
    }
  )
);
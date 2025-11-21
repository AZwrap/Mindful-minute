import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useTheme = create(
  persist(
    (set, get) => ({
      theme: 'device', // 'device', 'light', or 'dark'
      
      setTheme: (theme) => set({ theme }),
      
      getCurrentTheme: (systemScheme) => {
        const { theme } = get();
        if (theme === 'device') {
          return systemScheme || 'light';
        }
        return theme;
      }
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
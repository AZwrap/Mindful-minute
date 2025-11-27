// src/stores/themeStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Simple sunrise/sunset
const DAY_START = 6;   // 06:00 = light
const NIGHT_START = 18; // 18:00 = dark

// Dynamic theme: Day = light, Night = dark
function getDynamicTheme() {
  const hour = new Date().getHours();
  // Night from 19:00 → 06:59
  return hour >= 19 || hour < 7 ? 'dark' : 'light';
}


export const useTheme = create(
  persist(
    (set, get) => ({
      // "device" | "light" | "dark" | "dynamic"
      theme: "device",

      setTheme: (theme) => set({ theme }),

      /**
       * Returns the actual theme the UI should use.
       * systemScheme comes from useColorScheme() in App.js
       */
getCurrentTheme: (systemScheme) => {
  const t = get().theme;
  if (t === 'light' || t === 'dark') return t;
  if (t === 'dynamic') return getDynamicTheme();
  return systemScheme === 'dark' ? 'dark' : 'light';
},

    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

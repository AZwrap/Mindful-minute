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


export const useTheme = create((set, get) => ({
  theme: "system",

  // default values
  dynamicSunrise: "06:00",
  dynamicSunset: "18:00",

  // setters
  setTheme: (t) => set({ theme: t }),
  setDynamicSunrise: (time) => set({ dynamicSunrise: time }),
  setDynamicSunset: (time) => set({ dynamicSunset: time }),

  // the main resolver
  getCurrentTheme: (system) => {
    const { theme, dynamicSunrise, dynamicSunset } = get();

    if (theme === "system") return system;

    if (theme === "dynamic") {
      const [sunH, sunM] = dynamicSunrise.split(":").map(Number);
      const [setH, setM] = dynamicSunset.split(":").map(Number);

      const sunriseMin = sunH * 60 + sunM;
      const sunsetMin = setH * 60 + setM;

      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();

      return nowMin >= sunriseMin && nowMin < sunsetMin ? "light" : "dark";
    }

    return theme;
  }
}));


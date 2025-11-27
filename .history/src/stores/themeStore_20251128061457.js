// src/stores/themeStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSettings } from "./settingsStore";


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
getCurrentTheme: (systemScheme) => {
  const { theme } = get();
  const {
    sunriseTime,
    sunsetTime,
    loaded,
  } = useSettings.getState();

  // System theme mode
  if (theme === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }

  // Manual light/dark
  if (theme !== "dynamic") {
    return theme;
  }

  // Dynamic mode
  if (!loaded || !sunriseTime || !sunsetTime) {
    return "dark"; // fallback
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [srH, srM] = sunriseTime.split(":").map(Number);
  const [ssH, ssM] = sunsetTime.split(":").map(Number);

  const sunriseMin = srH * 60 + srM;
  const sunsetMin = ssH * 60 + ssM;

  return (nowMin >= sunriseMin && nowMin < sunsetMin)
    ? "light"
    : "dark";
},


}));


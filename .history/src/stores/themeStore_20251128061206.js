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
getCurrentTheme: (systemScheme) => {
  const { theme } = get();
  const {
    sunriseTime,
    sunsetTime,
    loaded,
    useSystemTheme,   // if you have this setting
  } = useSettings.getState();

  // 1. System Theme
  if (theme === "system") {
    return systemScheme === "dark" ? "dark" : "light";
  }

  // 2. Manual Theme (light/dark)
  if (theme !== "dynamic") {
    return theme; 
  }

  // 3. Dynamic Theme (sunrise → light → sunset)
  if (!loaded || !sunriseTime || !sunsetTime) {
    return "dark"; // fallback
  }

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [srH, srM] = sunriseTime.split(":").map(Number);
  const [ssH, ssM] = sunsetTime.split(":").map(Number);

  const sunriseMin = srH * 60 + srM;
  const sunsetMin = ssH * 60 + ssM;

  // Light theme during day → dark theme at night
  if (nowMin >= sunriseMin && nowMin < sunsetMin) {
    return "light";
  }

  return "dark";
},

}));


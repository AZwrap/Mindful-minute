// src/stores/themeStore.js
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

function parseTimeString(t) {
  // "HH:MM" → Date object today
  if (!t || typeof t !== "string") return null;
  const [hh, mm] = t.split(":").map((n) => parseInt(n));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

function isTimeInLightRange(now, sunrise, sunset) {
  if (!sunrise || !sunset) return false;

  const sr = parseTimeString(sunrise);
  const ss = parseTimeString(sunset);
  if (!sr || !ss) return false;

  const nowTime =
    now.getHours() * 60 + now.getMinutes();
  const srTime = sr.getHours() * 60 + sr.getMinutes();
  const ssTime = ss.getHours() * 60 + ss.getMinutes();

  // Case 1 → Normal day: sunrise < sunset
  if (srTime < ssTime) {
    return nowTime >= srTime && nowTime < ssTime;
  }

  // Case 2 → Over-midnight pattern (e.g. 22:00 → 06:00)
  // Light period is 22:00–23:59 AND 00:00–06:00
  return nowTime >= srTime || nowTime < ssTime;
}

export const useTheme = create((set, get) => ({
  theme: "system",      
  sunriseTime: null,    
  sunsetTime: null,     
  loaded: false,

  setTheme: (theme) => {
    set({ theme });
    AsyncStorage.setItem("theme", theme);
  },

  setDynamicSunrise: (value) => {
    set({ sunriseTime: value });
    AsyncStorage.setItem("sunriseTime", value);
  },

  setDynamicSunset: (value) => {
    set({ sunsetTime: value });
    AsyncStorage.setItem("sunsetTime", value);
  },

  loadTheme: async () => {
    const theme = (await AsyncStorage.getItem("theme")) || "system";
    const sunriseTime = await AsyncStorage.getItem("sunriseTime");
    const sunsetTime = await AsyncStorage.getItem("sunsetTime");

    set({
      theme,
      sunriseTime,
      sunsetTime,
      loaded: true,
    });
  },

  getCurrentTheme: (systemColorScheme = "light") => {
    const { theme, sunriseTime, sunsetTime } = get();
    const now = new Date();

    if (theme === "light") return "light";
    if (theme === "dark") return "dark";

    // ✔ System theme
    if (theme === "system") {
      return systemColorScheme === "dark" ? "dark" : "light";
    }

    // ✔ Dynamic theme (sunrise/sunset)
    if (theme === "dynamic") {
      const isLight = isTimeInLightRange(now, sunriseTime, sunsetTime);
      return isLight ? "light" : "dark";
    }

    // fallback
    return "light";
  },
}));

// Load persisted theme immediately
useTheme.getState().loadTheme();

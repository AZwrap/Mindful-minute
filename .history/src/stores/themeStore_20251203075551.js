// src/stores/themeStore.js
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Helpers ----------------------------------------------------

function parseTimeString(t) {
  // "HH:MM" → Date object today
  if (!t || typeof t !== "string") return null;
  const [hh, mm] = t.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

// Pure check: is "now" in the light range between sunrise & sunset?
function isTimeInLightRange(now, sunrise, sunset) {
  if (!sunrise || !sunset) return false;

  const sr = parseTimeString(sunrise);
  const ss = parseTimeString(sunset);
  if (!sr || !ss) return false;

  const nowTime = now.getHours() * 60 + now.getMinutes();
  const srTime = sr.getHours() * 60 + sr.getMinutes();
  const ssTime = ss.getHours() * 60 + ss.getMinutes();

  // Case 1 → Normal day: sunrise < sunset
  if (srTime < ssTime) {
    return nowTime >= srTime && nowTime < ssTime;
  }

  // Case 2 → Over-midnight pattern (e.g. 22:00 → 06:00)
  return nowTime >= srTime || nowTime < ssTime;
}

// Timer handle for dynamic theme transitions
let dynamicTimeout = null;

// Compute current dynamic theme AND schedule the next flip
function updateDynamicThemeAndScheduleNext(set, get) {
  const { theme, sunriseTime, sunsetTime } = get();

  if (dynamicTimeout) {
    clearTimeout(dynamicTimeout);
    dynamicTimeout = null;
  }

  if (theme !== "dynamic" || !sunriseTime || !sunsetTime) {
    set({ currentDynamicTheme: null });
    return;
  }

  const now = new Date();
  const sr = parseTimeString(sunriseTime);
  const ss = parseTimeString(sunsetTime);
  if (!sr || !ss) {
    set({ currentDynamicTheme: null });
    return;
  }

  const nowM = now.getHours() * 60 + now.getMinutes();
  const srM = sr.getHours() * 60 + sr.getMinutes();
  const ssM = ss.getHours() * 60 + ss.getMinutes();

  // 1) Set current theme based on current time
  const isLight = isTimeInLightRange(now, sunriseTime, sunsetTime);
  set({ currentDynamicTheme: isLight ? "light" : "dark" });

  // 2) Find the NEXT boundary
  let nextBoundaryMinutes;

  if (srM === ssM) return;

  if (srM < ssM) {
    if (nowM < srM) nextBoundaryMinutes = srM;
    else if (nowM >= srM && nowM < ssM) nextBoundaryMinutes = ssM;
    else nextBoundaryMinutes = srM + 24 * 60;
  } else {
    const inLight = nowM >= srM || nowM < ssM;
    if (inLight) {
      if (nowM >= srM) nextBoundaryMinutes = ssM + 24 * 60;
      else nextBoundaryMinutes = ssM;
    } else {
      nextBoundaryMinutes = srM;
    }
  }

  const nowTotal = nowM;
  let deltaMinutes = (nextBoundaryMinutes - nowTotal + 1440) % 1440;
  if (deltaMinutes === 0) deltaMinutes = 1;

  const deltaMs = deltaMinutes * 60 * 1000;

  dynamicTimeout = setTimeout(() => {
    updateDynamicThemeAndScheduleNext(set, get);
  }, deltaMs);
}

// --- Store ------------------------------------------------------

export const useTheme = create((set, get) => ({
  theme: "system",           
  sunriseTime: "06:00",      
  sunsetTime: "18:00",          
  accentColor: "#6366F1",    // <--- ADDED ACCENT COLOR
  currentDynamicTheme: null, 
  loaded: false,

  // Every minute: re-evaluate dynamic theme at MM:00
  startMinuteChecker: () => {
    const delay = (60 - new Date().getSeconds()) * 1000;
    setTimeout(() => {
      if (get().theme === "dynamic") {
        updateDynamicThemeAndScheduleNext(set, get);
      }
      setInterval(() => {
        if (get().theme === "dynamic") {
          updateDynamicThemeAndScheduleNext(set, get);
        }
      }, 60000);
    }, delay);
  },

  setTheme: (theme) => {
    set({ theme });
    AsyncStorage.setItem("theme", theme);
    if (theme === "dynamic") {
      updateDynamicThemeAndScheduleNext(set, get);
    } else {
      if (dynamicTimeout) {
        clearTimeout(dynamicTimeout);
        dynamicTimeout = null;
      }
      set({ currentDynamicTheme: null });
    }
  },

  setDynamicSunrise: (value) => {
    set({ sunriseTime: value });
    AsyncStorage.setItem("sunriseTime", value);
    if (get().theme === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
  },

  setDynamicSunset: (value) => {
    set({ sunsetTime: value });
    AsyncStorage.setItem("sunsetTime", value);
    if (get().theme === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
  },

  // NEW ACTION: Set Accent Color
  setAccentColor: (color) => {
    set({ accentColor: color });
    AsyncStorage.setItem("accentColor", color);
  },

  loadTheme: async () => {
    try {
      const theme = (await AsyncStorage.getItem("theme")) || "system";
      const sunriseTime = (await AsyncStorage.getItem("sunriseTime")) || "06:00";
      const sunsetTime = (await AsyncStorage.getItem("sunsetTime")) || "18:00";
      const accentColor = (await AsyncStorage.getItem("accentColor")) || "#6366F1"; // Load accent

      set({ theme, sunriseTime, sunsetTime, accentColor, loaded: true });

      if (theme === "dynamic") {
        updateDynamicThemeAndScheduleNext(set, get);
      }
    } catch (e) {
      console.error("Failed to load theme settings", e);
      set({ loaded: true });
    }
  },

  getCurrentTheme: (systemColorScheme = "light") => {
    const { theme, sunriseTime, sunsetTime, currentDynamicTheme, loaded } = get();

    if (!loaded) return systemColorScheme === "dark" ? "dark" : "light";
    if (theme === "light") return "light";
    if (theme === "dark") return "dark";
    if (theme === "system") return systemColorScheme === "dark" ? "dark" : "light";

    if (theme === "dynamic") {
      if (currentDynamicTheme) return currentDynamicTheme;
      const now = new Date();
      const isLight = isTimeInLightRange(now, sunriseTime, sunsetTime);
      return isLight ? "light" : "dark";
    }

    return "light";
  },
}));

// Kick off loading
const s = useTheme.getState();
s.loadTheme();
s.startMinuteChecker();
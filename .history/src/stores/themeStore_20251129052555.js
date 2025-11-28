// src/stores/themeStore.js
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Helpers ----------------------------------------------------

function parseTimeString(t) {
  if (!t || typeof t !== "string") return null;
  const [hh, mm] = t.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;

  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

// Check if "now" is inside the light window
function isTimeInLightRange(now, sunrise, sunset) {
  if (!sunrise || !sunset) return false;

  const sr = parseTimeString(sunrise);
  const ss = parseTimeString(sunset);
  if (!sr || !ss) return false;

  const nowM = now.getHours() * 60 + now.getMinutes();
  const srM = sr.getHours() * 60 + sr.getMinutes();
  const ssM = ss.getHours() * 60 + ss.getMinutes();

  // Normal pattern (sunrise < sunset)
  if (srM < ssM) {
    return nowM >= srM && nowM < ssM;
  }

  // Over-midnight (sunrise > sunset)
  return nowM >= srM || nowM < ssM;
}

// --- Dynamic theme scheduling ----------------------------------

let dynamicTimeout = null;

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

  // 1. Set current dynamic light/dark
  const isLight = isTimeInLightRange(now, sunriseTime, sunsetTime);
  set({ currentDynamicTheme: isLight ? "light" : "dark" });

  // 2. Determine next flip time
  let nextBoundary;

  if (srM < ssM) {
    // Normal daytime
    if (nowM < srM) nextBoundary = srM;
    else if (nowM < ssM) nextBoundary = ssM;
    else nextBoundary = srM + 1440;
  } else {
    // Over-midnight light window
    const inLight = nowM >= srM || nowM < ssM;
    if (inLight) {
      if (nowM >= srM) nextBoundary = ssM + 1440;
      else nextBoundary = ssM;
    } else {
      nextBoundary = srM;
    }
  }

  const delta = ((nextBoundary - nowM + 1440) % 1440) || 1;
  const deltaMs = delta * 60 * 1000;

  dynamicTimeout = setTimeout(() => {
    updateDynamicThemeAndScheduleNext(set, get);
  }, deltaMs);
}

// --- STORE -----------------------------------------------------

export const useTheme = create((set, get) => ({
  theme: "system",
  sunriseTime: null,
  sunsetTime: null,
  currentDynamicTheme: null,
  loaded: false,

  // Choose theme mode
  setTheme: (theme) => {
    set({ theme });
    AsyncStorage.setItem("theme", theme);

    if (theme === "dynamic") {
      updateDynamicThemeAndScheduleNext(set, get);
    } else {
      if (dynamicTimeout) clearTimeout(dynamicTimeout);
      set({ currentDynamicTheme: null });
    }
  },

  // Sunrise setter
  setDynamicSunrise: (value) => {
    set({ sunriseTime: value });
    AsyncStorage.setItem("sunriseTime", value);
    updateDynamicThemeAndScheduleNext(set, get);
  },

  // Sunset setter
  setDynamicSunset: (value) => {
    set({ sunsetTime: value });
    AsyncStorage.setItem("sunsetTime", value);
    updateDynamicThemeAndScheduleNext(set, get);
  },

  // Load from storage
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

    updateDynamicThemeAndScheduleNext(set, get);
  },

  // THEME DECISION FUNCTION — CLEAN VERSION
  getCurrentTheme: (systemColorScheme = "light") => {
    const {
      theme,
      sunriseTime,
      sunsetTime,
      currentDynamicTheme,
      loaded,
    } = get();

    if (!loaded) {
      return systemColorScheme === "dark" ? "dark" : "light";
    }

    if (theme === "light") return "light";
    if (theme === "dark") return "dark";

    if (theme === "system") {
      return systemColorScheme === "dark" ? "dark" : "light";
    }

    if (theme === "dynamic") {
      if (currentDynamicTheme) return currentDynamicTheme;

      const now = new Date();
      return isTimeInLightRange(now, sunriseTime, sunsetTime)
        ? "light"
        : "dark";
    }

    return "light";
  },
}));

// Startup
useTheme.getState().loadTheme();

// Extra safety: re-check every minute at :00
setInterval(() => {
  const { theme } = useTheme.getState();
  if (theme === "dynamic") {
    updateDynamicThemeAndScheduleNext(useTheme.setState, useTheme.getState);
  }
}, 60000);

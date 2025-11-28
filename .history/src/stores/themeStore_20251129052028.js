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
  // Light period is 22:00–23:59 AND 00:00–06:00
  return nowTime >= srTime || nowTime < ssTime;
}

// Timer handle for dynamic theme transitions
let dynamicTimeout = null;

// Compute current dynamic theme AND schedule the next flip
function updateDynamicThemeAndScheduleNext(set, get) {
  const { theme, sunriseTime, sunsetTime } = get();

  // Clear any previous timer
  if (dynamicTimeout) {
    clearTimeout(dynamicTimeout);
    dynamicTimeout = null;
  }

  // Only do anything if we're in dynamic mode and have times
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

  // 2) Find the NEXT boundary (either sunrise or sunset) in minutes
  let nextBoundaryMinutes;

  if (srM === ssM) {
    // Weird edge case: same time → nothing sensible to schedule
    return;
  }

  if (srM < ssM) {
    // Normal: sunrise < sunset (daytime in between)
    // Dark before sunrise → next = sunrise today
    // Light between sunrise & sunset → next = sunset today
    // Dark after sunset → next = sunrise tomorrow
    if (nowM < srM) {
      nextBoundaryMinutes = srM;
    } else if (nowM >= srM && nowM < ssM) {
      nextBoundaryMinutes = ssM;
    } else {
      nextBoundaryMinutes = srM + 24 * 60; // tomorrow's sunrise
    }
  } else {
    // Over-midnight pattern (e.g. 22:00 → 06:00, light at night)
    // Light: now >= sr OR now < ss
    // Dark: between ss and sr
    const inLight = nowM >= srM || nowM < ssM;

    if (inLight) {
      // If we're already past sunrise today (>= srM),
      // next boundary is sunset tomorrow (ssM + 1440)
      // If we're before ssM, next boundary is sunset today (ssM)
      if (nowM >= srM) {
        nextBoundaryMinutes = ssM + 24 * 60;
      } else {
        nextBoundaryMinutes = ssM;
      }
    } else {
      // Dark between ss and sr → next boundary is sunrise today
      nextBoundaryMinutes = srM;
    }
  }

  const nowTotal = nowM;
  let deltaMinutes = (nextBoundaryMinutes - nowTotal + 1440) % 1440;

  // If somehow we landed exactly on the boundary, push 1 minute ahead
  if (deltaMinutes === 0) {
    deltaMinutes = 1;
  }

  const deltaMs = deltaMinutes * 60 * 1000;

  dynamicTimeout = setTimeout(() => {
    // Re-compute at the exact minute the boundary is crossed
    updateDynamicThemeAndScheduleNext(set, get);
  }, deltaMs);
}

// --- Store ------------------------------------------------------

export const useTheme = create((set, get) => ({
  theme: "system",          // "light" | "dark" | "system" | "dynamic"
  sunriseTime: null,        // "HH:MM"
  sunsetTime: null,         // "HH:MM"
  currentDynamicTheme: null, // "light" | "dark" (for dynamic only)
  loaded: false,

  setTheme: (theme) => {
    set({ theme });
    AsyncStorage.setItem("theme", theme);

    if (theme === "dynamic") {
      updateDynamicThemeAndScheduleNext(set, get);
    } else {
      // Leaving dynamic mode → clear timer & cached theme
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
    updateDynamicThemeAndScheduleNext(set, get);


    // If we're in dynamic mode, recompute & reschedule
    if (get().theme === "dynamic") {
      updateDynamicThemeAndScheduleNext(set, get);
    }
  },

  setDynamicSunset: (value) => {
    set({ sunsetTime: value });
    AsyncStorage.setItem("sunsetTime", value);
    updateDynamicThemeAndScheduleNext(set, get);


    if (get().theme === "dynamic") {
      updateDynamicThemeAndScheduleNext(set, get);
    }
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

updateDynamicThemeAndScheduleNext(set, get);

  },

  // This is what the rest of the app should use
  getCurrentTheme: (systemColorScheme = "light") => {
    const {
      theme,
      sunriseTime,
      sunsetTime,
      currentDynamicTheme,
    } = get();

    // Prevent dynamic theme from running before values are loaded
const { loaded } = get();
if (!loaded) {
  return systemColorScheme === "dark" ? "dark" : "light";
}


    if (theme === "light") return "light";
    if (theme === "dark") return "dark";

    if (theme === "system") {
      return systemColorScheme === "dark" ? "dark" : "light";
    }

    if (theme === "dynamic") {
      // Prefer the cached, timer-driven value
      if (currentDynamicTheme) return currentDynamicTheme;

      // Fallback if it hasn't been computed yet
      const now = new Date();
      const isLight = isTimeInLightRange(now, sunriseTime, sunsetTime);
      return isLight ? "light" : "dark";
    }

    return "light";
  },
}));

// Kick off loading (and scheduling) on startup
useTheme.getState().loadTheme().then(() => {
  const { theme } = useTheme.getState();
  if (theme === "dynamic") {
    updateDynamicThemeAndScheduleNext(
      useTheme.setState,
      useTheme.getState
    );
  }
});
// EXTRA: Re-check dynamic theme every full minute (only at :00)
setInterval(() => {
  const { theme } = useTheme.getState();
  if (theme === "dynamic") {
    updateDynamicThemeAndScheduleNext(
      useTheme.setState,
      useTheme.getState
    );
  }
}, 60 * 1000);

console.log("Dynamic theme:", {
  sunriseTime,
  sunsetTime,
  currentDynamicTheme,
  fallbackIsLight: isTimeInLightRange(new Date(), sunriseTime, sunsetTime)
});

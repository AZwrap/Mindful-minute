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

// --------------------------------------------------
      // STATE
      // --------------------------------------------------
      theme: 'system', // system | light | dark | dynamic
      // Theme customization settings
      dynamicSunrise: '06:00',
      dynamicSunset: '18:00',
      accentColor: '#6366F1', // <--- ADD THIS: Default primary color (Tailwind indigo-500)

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
  theme: "system",           // "light" | "dark" | "system" | "dynamic"
  sunriseTime: null,         // "HH:MM"
  sunsetTime: null,          // "HH:MM"
  currentDynamicTheme: null, // "light" | "dark" (for dynamic only)
  loaded: false,
    // Every minute: re-evaluate dynamic theme at MM:00
  startMinuteChecker: () => {
    // Align first run to the next MM:00
    const delay = (60 - new Date().getSeconds()) * 1000;

    setTimeout(() => {
      // Run immediately once aligned
      if (get().theme === "dynamic") {
        const now = new Date();
        const isLight = isTimeInLightRange(now, get().sunriseTime, get().sunsetTime);
        const nextTheme = isLight ? "light" : "dark";

        if (nextTheme !== get().currentDynamicTheme) {
          set({ currentDynamicTheme: nextTheme });
        }
      }

      // Then run every 60s
      setInterval(() => {
        if (get().theme === "dynamic") {
          const now = new Date();
          const isLight = isTimeInLightRange(now, get().sunriseTime, get().sunsetTime);
          const nextTheme = isLight ? "light" : "dark";

          if (nextTheme !== get().currentDynamicTheme) {
            set({ currentDynamicTheme: nextTheme });
          }
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

    if (get().theme === "dynamic") {
      updateDynamicThemeAndScheduleNext(set, get);
    }
  },

  setDynamicSunset: (value) => {
    set({ sunsetTime: value });
    AsyncStorage.setItem("sunsetTime", value);

    if (get().theme === "dynamic") {
      updateDynamicThemeAndScheduleNext(set, get);
    }
  },
setAccentColor: (color) => set({ accentColor: color }),
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

    if (theme === "dynamic") {
      updateDynamicThemeAndScheduleNext(set, get);
    }
  },

  // This is what the rest of the app should use
getCurrentTheme: (systemScheme) => {
    const { theme, dynamicSunrise, dynamicSunset } = get();

    if (theme === 'system') {
      return systemScheme;
    }
    if (theme === 'light') {
      return 'light';
    }
    if (theme === 'dark') {
      return 'dark';
    }

    if (theme === 'dynamic') {
      // Logic for time-based switching (Light by day, dark by night)
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      // Convert custom times (e.g., "06:00") to minutes since midnight
      const parseTime = (timeStr) => {
        if (!timeStr) return NaN; // Fallback if time is not set
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const currentTimeInMinutes = currentHours * 60 + currentMinutes;
      const sunriseMinutes = parseTime(dynamicSunrise);
      const sunsetMinutes = parseTime(dynamicSunset);

      // Default to system if dynamic times are invalid
      if (isNaN(sunriseMinutes) || isNaN(sunsetMinutes)) {
          return systemScheme;
      }
      
      // Determine if it is day (between sunrise and sunset)
      if (sunriseMinutes < sunsetMinutes) {
          // Standard day: sunrise --- sunset
          return (currentTimeInMinutes >= sunriseMinutes && currentTimeInMinutes < sunsetMinutes) ? 'light' : 'dark';
      } else {
          // Midnight crossover (e.g., sunset 01:00, sunrise 05:00)
          // It's DAY if time is AFTER sunrise OR BEFORE sunset (e.g., 03:00)
          return (currentTimeInMinutes >= sunriseMinutes || currentTimeInMinutes < sunsetMinutes) ? 'light' : 'dark';
      }
    }
    
    return 'light'; // Default fallback
  },
}));

// Kick off loading AND minute checker AND boundary scheduler
const s = useTheme.getState();
s.loadTheme();
s.startMinuteChecker();


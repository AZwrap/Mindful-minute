import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Helpers for Dynamic Theme (Sunrise/Sunset) ---
function parseTimeString(t) {
  if (!t || typeof t !== "string") return null;
  const [hh, mm] = t.split(":").map((n) => parseInt(n, 10));
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

  const nowTime = now.getHours() * 60 + now.getMinutes();
  const srTime = sr.getHours() * 60 + sr.getMinutes();
  const ssTime = ss.getHours() * 60 + ss.getMinutes();

  if (srTime < ssTime) {
    return nowTime >= srTime && nowTime < ssTime;
  }
  return nowTime >= srTime || nowTime < ssTime;
}

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
  const isLight = isTimeInLightRange(now, sunriseTime, sunsetTime);
  set({ currentDynamicTheme: isLight ? "light" : "dark" });

  // Simple reschedule check in 1 minute to keep it accurate
  dynamicTimeout = setTimeout(() => {
    updateDynamicThemeAndScheduleNext(set, get);
  }, 60000); 
}

// --- The Store ---
export const useTheme = create(
  persist(
    (set, get) => ({
      theme: "system",
      sunriseTime: "06:00",
      sunsetTime: "18:00",
      accentColor: "#6366F1", // <--- 1. Default Indigo
      currentDynamicTheme: null,
      
      setTheme: (v) => {
        set({ theme: v });
        if (v === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
        else {
          if (dynamicTimeout) clearTimeout(dynamicTimeout);
          set({ currentDynamicTheme: null });
        }
      },

      setDynamicSunrise: (v) => {
        set({ sunriseTime: v });
        if (get().theme === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
      },

      setDynamicSunset: (v) => {
        set({ sunsetTime: v });
        if (get().theme === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
      },

      // <--- 2. Action to set color
      setAccentColor: (color) => set({ accentColor: color }),

      getCurrentTheme: (systemScheme) => {
        const { theme, currentDynamicTheme } = get();
        if (theme === "dynamic" && currentDynamicTheme) return currentDynamicTheme;
        if (theme === "system") return systemScheme === "dark" ? "dark" : "light";
        return theme;
      },
      
      // Init helper
      init: () => {
         if (get().theme === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
      }
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Start the checker immediately
useTheme.getState().init();
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColorSchemeName } from "react-native";

// --------------------------------------------------
// TYPES
// --------------------------------------------------
export type ThemeType = "light" | "dark" | "system" | "dynamic";

interface ThemeState {
  theme: ThemeType;
  sunriseTime: string;
  sunsetTime: string;
  accentColor: string;
  currentDynamicTheme: "light" | "dark" | null;
}

interface ThemeActions {
  setTheme: (v: ThemeType) => void;
  setDynamicSunrise: (v: string) => void;
  setDynamicSunset: (v: string) => void;
  setAccentColor: (color: string) => void;
  getCurrentTheme: (systemScheme: ColorSchemeName) => "light" | "dark";
  init: () => void;
}

// Combined Store Type
type ThemeStore = ThemeState & ThemeActions;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function parseTimeString(t: string): Date | null {
  if (!t || typeof t !== "string") return null;
  const [hh, mm] = t.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

function isTimeInLightRange(now: Date, sunrise: string, sunset: string): boolean {
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
  // Crosses midnight (e.g. 20:00 -> 06:00)
  return nowTime >= srTime || nowTime < ssTime;
}

let dynamicTimeout: NodeJS.Timeout | null = null;

// Helper to update logic outside the hook
const updateDynamicThemeAndScheduleNext = (
  set: (fn: (state: ThemeStore) => Partial<ThemeStore>) => void,
  get: () => ThemeStore
) => {
  const { theme, sunriseTime, sunsetTime } = get();

  if (dynamicTimeout) {
    clearTimeout(dynamicTimeout);
    dynamicTimeout = null;
  }

  if (theme !== "dynamic" || !sunriseTime || !sunsetTime) {
    set((state) => ({ ...state, currentDynamicTheme: null }));
    return;
  }

  const now = new Date();
  const isLight = isTimeInLightRange(now, sunriseTime, sunsetTime);
  set((state) => ({ ...state, currentDynamicTheme: isLight ? "light" : "dark" }));

  // Check again in 1 minute
  dynamicTimeout = setTimeout(() => {
    updateDynamicThemeAndScheduleNext(set, get);
  }, 60000);
};

// --------------------------------------------------
// STORE
// --------------------------------------------------
export const useTheme = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // State
      theme: "system",
      sunriseTime: "06:00",
      sunsetTime: "18:00",
      accentColor: "#6366F1",
      currentDynamicTheme: null,

      // Actions
      setTheme: (v) => {
        set((state) => ({ ...state, theme: v }));
        if (v === "dynamic") {
          updateDynamicThemeAndScheduleNext(set, get);
        } else {
          if (dynamicTimeout) clearTimeout(dynamicTimeout);
          set((state) => ({ ...state, currentDynamicTheme: null }));
        }
      },

      setDynamicSunrise: (v) => {
        set((state) => ({ ...state, sunriseTime: v }));
        if (get().theme === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
      },

      setDynamicSunset: (v) => {
        set((state) => ({ ...state, sunsetTime: v }));
        if (get().theme === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
      },

      setAccentColor: (color) => set((state) => ({ ...state, accentColor: color })),

      getCurrentTheme: (systemScheme) => {
        const { theme, currentDynamicTheme } = get();
        if (theme === "dynamic" && currentDynamicTheme) return currentDynamicTheme;
        if (theme === "system") return systemScheme === "dark" ? "dark" : "light";
        return theme === "dark" ? "dark" : "light";
      },

      init: () => {
        if (get().theme === "dynamic") updateDynamicThemeAndScheduleNext(set, get);
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Start checker immediately
useTheme.getState().init();
// src/stores/themeStore.js
import { create } from "zustand";
import { useSettings } from "./settingsStore";

// Dynamic theme: day/night detection
export const useTheme = create((set, get) => ({
  theme: "system",

  // default dynamic times
  dynamicSunrise: "06:00",
  dynamicSunset: "18:00",

  // setters
  setTheme: (value) => {
    set({ theme: value });

    if (value === "dynamic") {
      const systemScheme = "light";
      const newTheme = get().getCurrentTheme(systemScheme);
      set({ currentTheme: newTheme });
    } else {
      set({ currentTheme: value });
    }
  },

  setDynamicSunrise: (t) => set({ dynamicSunrise: t }),
  setDynamicSunset: (t) => set({ dynamicSunset: t }),

  // MAIN THEME RESOLVER
  getCurrentTheme: (systemScheme) => {
    const { theme } = get();
    const { sunriseTime, sunsetTime, loaded } = useSettings.getState();

    // system
    if (theme === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }

    // manual
    if (theme !== "dynamic") return theme;

    // fallback
    if (!loaded || !sunriseTime || !sunsetTime) return "dark";

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const [srH, srM] = sunriseTime.split(":").map(Number);
    const [ssH, ssM] = sunsetTime.split(":").map(Number);

    const sunriseMin = srH * 60 + srM;
    const sunsetMin = ssH * 60 + ssM;

    // Normal case: sunrise < sunset
    if (sunriseMin < sunsetMin) {
      return nowMin >= sunriseMin && nowMin < sunsetMin ? "light" : "dark";
    }

    // Overnight case: light wraps past midnight
    return nowMin >= sunriseMin || nowMin < sunsetMin ? "light" : "dark";
  },
}));

// AUTO REFRESH EVERY MINUTE
setInterval(() => {
  const { theme } = useTheme.getState();
  if (theme === "dynamic") {
    const systemScheme = "light"; // RN cannot track system realtime
    const newTheme = useTheme.getState().getCurrentTheme(systemScheme);
    useTheme.setState({ currentTheme: newTheme });
  }
}, 60000);

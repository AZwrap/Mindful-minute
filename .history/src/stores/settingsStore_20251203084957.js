// settingsStore.js
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "app_settings_v1";

// DEFAULTS (these are ALWAYS used as fallback)
const DEFAULTS = {
  dynamicTheme: false,
  useSystemTheme: true,
  sunriseTime: null,
  sunsetTime: null,

    // NEW:
  hapticsEnabled: true,
  soundEnabled: true,
  preserveTimerProgress: true,
  gratitudeModeEnabled: false,
  hasOnboarded: false,
};

async function loadSettings() {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return DEFAULTS;

    const parsed = JSON.parse(json);

    // Important: guarantee missing keys are added
    return {
      ...DEFAULTS,
      ...parsed,
    };
  } catch (e) {
    console.log("Failed to load settings:", e);
    return DEFAULTS;
  }
}

export const useSettings = create((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  loadFromStorage: async () => {
    const data = await loadSettings();
    set({
      ...data,
      loaded: true,
    });
  },

  setHapticsEnabled: (v) => {
  set({ hapticsEnabled: v });
  get().save();
},

setSoundEnabled: (v) => {
  set({ soundEnabled: v });
  get().save();
},

setPreserveTimerProgress: (v) => {
  set({ preserveTimerProgress: v });
  get().save();
},

setGratitudeModeEnabled: (v) => {
  set({ gratitudeModeEnabled: v });
  get().save();
},
  // Save helper
  save: async () => {
    const s = get();
    const toSave = {
      dynamicTheme: s.dynamicTheme,
      useSystemTheme: s.useSystemTheme,
      sunriseTime: s.sunriseTime,
      sunsetTime: s.sunsetTime,
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
  },

  // Mutators
  setDynamicTheme: (v) => {
    set({ dynamicTheme: v });
    get().save();
  },

  setUseSystemTheme: (v) => {
    set({ useSystemTheme: v });
    get().save();
  },

  setSunriseTime: (date) => {
    set({ sunriseTime: date });
    get().save();
  },

  setSunsetTime: (date) => {
    set({ sunsetTime: date });
    get().save();
  },
}));

// Load immediately
useSettings.getState().loadFromStorage();

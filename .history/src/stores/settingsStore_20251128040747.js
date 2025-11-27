import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SunTimesSelector from "../components/SunTimesSelector";


const KEY = 'settings_v1';

const DEFAULTS = {
  showTimer: true,
  durationSec: 60,
  hapticsEnabled: true,
  soundEnabled: true,
  preserveTimerProgress: false,
  theme: 'device',
  // Pomodoro defaults:
  writeDuration: 300,     // 5 minutes
  breakDuration: 30,      // 30 seconds  
  longBreakDuration: 300, // 5 minutes
  totalCycles: 4,         // 4 cycles
    gratitudeModeEnabled: false,
};

sunriseTime: null,
sunsetTime: null,

setSunriseTime: (time) => set({ sunriseTime: time }),
setSunsetTime:  (time) => set({ sunsetTime: time }),


async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
async function saveSettings(obj) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
}

export const useSettings = create((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  init: async () => {
    const s = await loadSettings();
    set({ ...s, loaded: true });
  },

  setShowTimer: async (value) => {
    const next = { ...get(), showTimer: value };
    set({ showTimer: value });
    await saveSettings(next);
  },

  toggleShowTimer: async () => {
    const v = !get().showTimer;
    const next = { ...get(), showTimer: v };
    set({ showTimer: v });
    await saveSettings(next);
  },

  setDurationSec: async (seconds) => {
    const n = Math.round(Number(seconds));
    if (!Number.isFinite(n)) return;
    const next = { ...get(), durationSec: n };
    set({ durationSec: n });
    await saveSettings(next);
  },

  setHapticsEnabled: async (value) => {
    const next = { ...get(), hapticsEnabled: value };
    set({ hapticsEnabled: value });
    await saveSettings(next);
  },

  toggleHaptics: async () => {
    const v = !get().hapticsEnabled;
    const next = { ...get(), hapticsEnabled: v };
    set({ hapticsEnabled: v });
    await saveSettings(next);
  },

  setSoundEnabled: async (value) => {
    const next = { ...get(), soundEnabled: value };
    set({ soundEnabled: value });
    await saveSettings(next);
  },

  toggleSound: async () => {
    const v = !get().soundEnabled;
    const next = { ...get(), soundEnabled: v };
    set({ soundEnabled: v });
    await saveSettings(next);
  },

  setPreserveTimerProgress: async (value) => {
    const next = { ...get(), preserveTimerProgress: value };
    set({ preserveTimerProgress: value });
    await saveSettings(next);
  },

  setTheme: async (value) => {
    const next = { ...get(), theme: value };
    set({ theme: value });
    await saveSettings(next);
  },

  // ADD POMODORO SETTER FUNCTIONS:
  setWriteDuration: async (duration) => {
    const n = Math.round(Number(duration));
    if (!Number.isFinite(n)) return;
    const next = { ...get(), writeDuration: n };
    set({ writeDuration: n });
    await saveSettings(next);
  },

  setBreakDuration: async (duration) => {
    const n = Math.round(Number(duration));
    if (!Number.isFinite(n)) return;
    const next = { ...get(), breakDuration: n };
    set({ breakDuration: n });
    await saveSettings(next);
  },

  setLongBreakDuration: async (duration) => {
    const n = Math.round(Number(duration));
    if (!Number.isFinite(n)) return;
    const next = { ...get(), longBreakDuration: n };
    set({ longBreakDuration: n });
    await saveSettings(next);
  },

  setTotalCycles: async (cycles) => {
    const n = Math.round(Number(cycles));
    if (!Number.isFinite(n)) return;
    const next = { ...get(), totalCycles: n };
    set({ totalCycles: n });
    await saveSettings(next);
  },
  setGratitudeModeEnabled: async (enabled) => {
    const next = { ...get(), gratitudeModeEnabled: enabled };
    set({ gratitudeModeEnabled: enabled });
    await saveSettings(next);
  },
}));
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';


const KEY = 'entries_map_v1';
const KEY_DRAFTS = 'entries_drafts_v2';

async function loadAll() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
async function saveAll(map) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

async function loadDrafts() {
  try {
    const raw = await AsyncStorage.getItem(KEY_DRAFTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
async function saveDrafts(map) {
  try { await AsyncStorage.setItem(KEY_DRAFTS, JSON.stringify(map)); } catch {}
}

export const useEntries = create((set, get) => ({
  map: {},
  drafts: {},
  loaded: false,
  draftsLoaded: false,

  // transient flag to flash a row in History after finalize
  flashDate: null,

  init: async () => {
    const [m, d] = await Promise.all([loadAll(), loadDrafts()]);
    set({ map: m, drafts: d, loaded: true, draftsLoaded: true });
  },

  upsert: ({ date, prompt, text, mood, xpAwarded, createdAt, journalId = "default" }) => {
    const map = { ...(get().map || {}) };
    const prev = map[date];
    map[date] = {
      promptId: prompt?.id ?? prev?.promptId ?? null,
      promptText: prompt?.text ?? prev?.promptText ?? '',
      text,
      moodTag: mood ? { type: mood.type, value: mood.value } : prev?.moodTag ?? null,
      createdAt: createdAt ?? prev?.createdAt ?? new Date().toISOString(), // Store ISO string
      updatedAt: new Date().toISOString(),
      xpAwarded: xpAwarded ?? prev?.xpAwarded ?? 0,
      journalId: journalId ?? prev?.journalId ?? "default",
    };
    set({ map });
    saveAll(map);
  },

  setXpForDate: (date, xp) => {
    const map = { ...(get().map || {}) };
    if (map[date]) {
      map[date].xpAwarded = xp;
      set({ map });
      saveAll(map);
    }
  },

  getByDate: (date) => (get().map || {})[date] ?? null,
  listDesc: () => {
    const map = get().map || {};
    const entries = Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
    return entries;
  },

  listByJournal: (journalId) => {
  const map = get().map || {};
  return Object.entries(map)
    .filter(([_, entry]) => entry.journalId === journalId)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, entry]) => ({ date, ...entry }));
},


  deleteEntry: (date) => {
    const map = { ...(get().map || {}) };
    if (map[date]) {
      delete map[date];
      set({ map });
      saveAll(map);
    }
  },

  archiveEntry: (date) => {
    const map = { ...(get().map || {}) };
    if (map[date]) {
      map[date].archived = true;
      set({ map });
      saveAll(map);
    }
  },

  deleteAll: async () => {
    set({ map: {}, loaded: true });
    try { await AsyncStorage.setItem(KEY, JSON.stringify({})); } catch {}
  },

  // --- Drafts (text + timer remaining + pomodoro state) ---
  setDraft: async (date, text, pomodoroState = null) => {
    const drafts = { ...(get().drafts || {}) };
    const prev = drafts[date] || {};
    const next = { 
      text, 
      remaining: prev.remaining ?? null,
      pomodoroState: pomodoroState ?? prev.pomodoroState ?? null
    };
    const updated = { ...drafts, [date]: next };
    set({ drafts: updated });
    await saveDrafts(updated);
  },

  setDraftTimer: async (date, remaining, pomodoroState = null) => {
    const drafts = { ...(get().drafts || {}) };
    const prev = drafts[date] || {};
    const next = { 
      text: prev.text ?? '', 
      remaining,
      pomodoroState: pomodoroState ?? prev.pomodoroState ?? null
    };
    const updated = { ...drafts, [date]: next };
    set({ drafts: updated });
    await saveDrafts(updated);
  },

  getDraft: (date) => (get().drafts || {})[date]?.text ?? '',
  getDraftTimer: (date) => (get().drafts || {})[date]?.remaining ?? null,
  getPomodoroState: (date) => (get().drafts || {})[date]?.pomodoroState ?? null,

  clearDraft: async (date) => {
    const drafts = { ...(get().drafts || {}) };
    if (drafts[date]) {
      delete drafts[date];
      set({ drafts });
      await saveDrafts(drafts);
    }
  },

  // --- Flash flag for History ---
  setFlashDate: (date) => set({ flashDate: date }),
  consumeFlashDate: () => {
    const d = get().flashDate;
    set({ flashDate: null });
    return d;
  },
}));
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface ProgressState {
  streak: number;
  totalEntries: number;
  lastEntryDate: string | null; // ISO Date string YYYY-MM-DD
}

interface ProgressActions {
  updateStreak: (date: string) => void;
  incrementTotalEntries: () => void;
  resetProgress: () => void;
}

// Combined Store Type
type ProgressStore = ProgressState & ProgressActions;

// --------------------------------------------------
// STORE
// --------------------------------------------------
export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      // STATE
      streak: 0,
      totalEntries: 0,
      lastEntryDate: null,

      // ACTIONS
      updateStreak: (date: string) => {
        const { streak, lastEntryDate } = get();

        // 1. If same day, do nothing
        if (lastEntryDate === date) return;

        // 2. Calculate gap
        const prev = lastEntryDate ? new Date(lastEntryDate) : null;
        const current = new Date(date);

        // Normalize time to midnight for accurate day diff
        if (prev) prev.setHours(0, 0, 0, 0);
        current.setHours(0, 0, 0, 0);

        let newStreak = 1; // Default to 1 if no prev date or broken streak

        if (prev) {
          const diffTime = Math.abs(current.getTime() - prev.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

          if (diffDays === 1) {
            // Consecutive day
            newStreak = streak + 1;
          } else if (diffDays > 1) {
            // Broken streak
            newStreak = 1;
          }
        }

        set({ streak: newStreak, lastEntryDate: date });
      },

      incrementTotalEntries: () => {
        set((state) => ({ totalEntries: state.totalEntries + 1 }));
      },

      resetProgress: () => {
        set({ streak: 0, totalEntries: 0, lastEntryDate: null });
      },
    }),
    {
      name: 'progress-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
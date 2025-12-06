import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface ProgressState {
  streak: number;
  totalEntries: number;
  lastEntryDate: string | null; 
  unlockedIds: string[]; // Track unlocked IDs
}

interface ProgressActions {
  updateStreak: (date: string) => void;
  incrementTotalEntries: () => void;
  resetProgress: () => void;
  getAchievements: () => any;
  applyDailySave: (data: { date: string; mood: string; wordCount: number; [key: string]: any }) => { newAchievements: any[] };
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
      unlockedIds: [],

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

      applyDailySave: (data) => {
        const { date } = data;
        
        // 1. Update Stats
        get().updateStreak(date);
        get().incrementTotalEntries();

        // 2. Check Achievements
        // Ensure getAchievements exists (from previous step)
        const { unlocked } = get().getAchievements(); 
        const currentUnlockedIds = get().unlockedIds || [];
        
        // Find which ones are NEW
        const newAchievements = unlocked.filter((a: any) => !currentUnlockedIds.includes(a.id));
        
        // 3. Persist new unlocks
        if (newAchievements.length > 0) {
            set({ unlockedIds: [...currentUnlockedIds, ...newAchievements.map((a: any) => a.id)] });
        }
        
        return { newAchievements };
      },

      resetProgress: () => {
        set({ streak: 0, totalEntries: 0, lastEntryDate: null });
      },

      getAchievements: () => {
        const { streak, totalEntries } = get();
        
        // Define achievements data 
        const allAchievements: any = {
          'streak_3': { id: 'streak_3', name: 'Consistency Is Key', description: 'Reach a 3-day streak', category: 'consistency', tier: 'bronze' },
          'streak_7': { id: 'streak_7', name: 'Weekly Warrior', description: 'Reach a 7-day streak', category: 'consistency', tier: 'silver' },
          'entries_1': { id: 'entries_1', name: 'First Step', description: 'Write your first entry', category: 'patterns', tier: 'bronze' },
          'entries_10': { id: 'entries_10', name: 'Journaling Habit', description: 'Write 10 entries', category: 'patterns', tier: 'silver' },
        };

        const unlocked: any[] = [];
        
        // Check logic
        if (streak >= 3) unlocked.push(allAchievements['streak_3']);
        if (streak >= 7) unlocked.push(allAchievements['streak_7']);
        if (totalEntries >= 1) unlocked.push(allAchievements['entries_1']);
        if (totalEntries >= 10) unlocked.push(allAchievements['entries_10']);

        // Calculate mastery (ensure all categories exist to prevent UI crashes)
        const mastery = {
          consistency: { progress: streak, total: 30, unlocked: streak >= 30 },
          patterns: { progress: totalEntries, total: 100, unlocked: totalEntries >= 100 },
          depth: { progress: 0, total: 10, unlocked: false },
          range: { progress: 0, total: 10, unlocked: false },
          mindfulness: { progress: 0, total: 10, unlocked: false },
          gratitude: { progress: 0, total: 10, unlocked: false },
        };

        return { unlocked, allAchievements, mastery };
      },
    }),
    {
      name: 'progress-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
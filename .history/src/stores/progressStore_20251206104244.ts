import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Achievement Definitions
export const ACHIEVEMENTS: Record<string, any> = {
  // Consistency
  'streak_3': { id: 'streak_3', name: 'Consistency Is Key', description: 'Reach a 3-day streak', category: 'consistency', tier: 'bronze' },
  'streak_7': { id: 'streak_7', name: 'Weekly Warrior', description: 'Reach a 7-day streak', category: 'consistency', tier: 'silver' },
  'streak_14': { id: 'streak_14', name: 'Momentum Master', description: 'Reach a 14-day streak', category: 'consistency', tier: 'gold' },
  'streak_30': { id: 'streak_30', name: 'Unstoppable', description: 'Reach a 30-day streak', category: 'consistency', tier: 'platinum' },

  // Patterns (Total Entries)
  'entries_1': { id: 'entries_1', name: 'First Step', description: 'Write your first entry', category: 'patterns', tier: 'bronze' },
  'entries_10': { id: 'entries_10', name: 'Journaling Habit', description: 'Write 10 entries', category: 'patterns', tier: 'silver' },
  'entries_50': { id: 'entries_50', name: 'Dedicated Writer', description: 'Write 50 entries', category: 'patterns', tier: 'gold' },
  'entries_100': { id: 'entries_100', name: 'Legacy Builder', description: 'Write 100 entries', category: 'patterns', tier: 'platinum' },

  // Depth (Word Count)
  'depth_1': { id: 'depth_1', name: 'Thoughtful', description: 'Write an entry over 50 words', category: 'depth', tier: 'bronze' },
  'depth_2': { id: 'depth_2', name: 'Deep Diver', description: 'Write an entry over 150 words', category: 'depth', tier: 'gold' },

  // Mindfulness (Time/Specifics)
  'early_bird': { id: 'early_bird', name: 'Early Bird', description: 'Write an entry before 8 AM', category: 'mindfulness', tier: 'silver' },
  'night_owl': { id: 'night_owl', name: 'Night Owl', description: 'Write an entry after 10 PM', category: 'mindfulness', tier: 'silver' },
  'weekend_warrior': { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Journal on a Saturday or Sunday', category: 'mindfulness', tier: 'bronze' },

  // Gratitude
  'gratitude_1': { id: 'gratitude_1', name: 'Grateful Heart', description: 'Log a gratitude entry', category: 'gratitude', tier: 'bronze' },
  'gratitude_10': { id: 'gratitude_10', name: 'Attitude of Gratitude', description: '10 gratitude entries', category: 'gratitude', tier: 'silver' },
  'gratitude_50': { id: 'gratitude_50', name: 'Abundance Mindset', description: '50 gratitude entries', category: 'gratitude', tier: 'gold' },
};
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

      getAchievements: () => {
        const { streak, totalEntries, unlockedIds } = get();
        const unlocked = unlockedIds.map(id => ACHIEVEMENTS[id]).filter(Boolean);

        // Calculate mastery for each category
        const mastery = {
          consistency: { progress: streak, total: 14, unlocked: streak >= 14 },
          patterns: { progress: totalEntries, total: 50, unlocked: totalEntries >= 50 },
          gratitude: { progress: 0, total: 10, unlocked: false }, // Placeholder logic
          depth: { progress: 0, total: 10, unlocked: false },
          range: { progress: 0, total: 10, unlocked: false },
          mindfulness: { progress: 0, total: 10, unlocked: false },
        };

        return { unlocked, allAchievements: ACHIEVEMENTS, mastery };
      },

applyDailySave: (data) => {
        const { date, isGratitude, wordCount = 0, entryHour } = data;
        const state = get();
        
        // 1. Update Stats
        get().updateStreak(date);
        get().incrementTotalEntries();

        // 2. Check for new Unlocks
        const newStreak = state.lastEntryDate === date ? state.streak : state.streak + 1;
        const newTotal = state.totalEntries + 1;
        const currentUnlocked = new Set(state.unlockedIds);
        const newUnlocks: string[] = [];

        // --- CONSISTENCY ---
        if (newStreak >= 3 && !currentUnlocked.has('streak_3')) newUnlocks.push('streak_3');
        if (newStreak >= 7 && !currentUnlocked.has('streak_7')) newUnlocks.push('streak_7');
        if (newStreak >= 14 && !currentUnlocked.has('streak_14')) newUnlocks.push('streak_14');
        if (newStreak >= 30 && !currentUnlocked.has('streak_30')) newUnlocks.push('streak_30');
        
        // --- PATTERNS ---
        if (newTotal >= 1 && !currentUnlocked.has('entries_1')) newUnlocks.push('entries_1');
        if (newTotal >= 10 && !currentUnlocked.has('entries_10')) newUnlocks.push('entries_10');
        if (newTotal >= 50 && !currentUnlocked.has('entries_50')) newUnlocks.push('entries_50');
        if (newTotal >= 100 && !currentUnlocked.has('entries_100')) newUnlocks.push('entries_100');

        // --- DEPTH (Word Count) ---
        if (wordCount >= 50 && !currentUnlocked.has('depth_1')) newUnlocks.push('depth_1');
        if (wordCount >= 150 && !currentUnlocked.has('depth_2')) newUnlocks.push('depth_2');

        // --- MINDFULNESS (Time/Day) ---
        // Early Bird (Before 8am)
        if (entryHour !== undefined && entryHour < 8 && !currentUnlocked.has('early_bird')) newUnlocks.push('early_bird');
        // Night Owl (After 10pm / 22:00)
        if (entryHour !== undefined && entryHour >= 22 && !currentUnlocked.has('night_owl')) newUnlocks.push('night_owl');
        
        // Weekend Warrior
        const day = new Date(date).getDay();
        if ((day === 0 || day === 6) && !currentUnlocked.has('weekend_warrior')) newUnlocks.push('weekend_warrior');

        // --- GRATITUDE ---
        if (isGratitude) {
           if (!currentUnlocked.has('gratitude_1')) newUnlocks.push('gratitude_1');
           // Simple simulation for gratitude counts since we don't track separate gratitude total yet
           // Realistically you'd need a separate 'totalGratitude' counter in state
           if (newTotal >= 10 && !currentUnlocked.has('gratitude_10')) newUnlocks.push('gratitude_10');
           if (newTotal >= 50 && !currentUnlocked.has('gratitude_50')) newUnlocks.push('gratitude_50');
        }

        // 3. Persist
        if (newUnlocks.length > 0) {
          set({ unlockedIds: [...state.unlockedIds, ...newUnlocks] });
        }
        
        return { newAchievements: newUnlocks.map(id => ACHIEVEMENTS[id]).filter(Boolean) };
      },

      resetProgress: () => {
        set({ streak: 0, totalEntries: 0, lastEntryDate: null, unlockedIds: [] });
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
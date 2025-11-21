import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mmkvStorage = {
  setItem: async (name, value) => {
    return await AsyncStorage.setItem(name, value);
  },
  getItem: async (name) => {
    const value = await AsyncStorage.getItem(name);
    return value ?? null;
  },
  removeItem: async (name) => {
    return await AsyncStorage.removeItem(name);
  },
};
// Achievement Definitions
const ACHIEVEMENTS = {
  // CONSISTENCY
  first_entry: { id: 'first_entry', name: 'First Reflection', description: 'Write your first journal entry', icon: '📝', category: 'consistency', tier: 'bronze' },
  three_day_streak: { id: 'three_day_streak', name: 'Building Routine', description: 'Write for 3 consecutive days', icon: '🔥', category: 'consistency', tier: 'bronze' },
  weekly_rhythm: { id: 'weekly_rhythm', name: 'Weekly Rhythm', description: 'Write 7 days in a month', icon: '📅', category: 'consistency', tier: 'silver' },
  month_streak: { id: 'month_streak', name: 'Dedicated Practice', description: 'Write for 30 consecutive days', icon: '🌟', category: 'consistency', tier: 'gold' },

  // DEPTH
  thoughtful: { id: 'thoughtful', name: 'Thoughtful', description: 'Write 100+ words in an entry', icon: '💭', category: 'depth', tier: 'bronze' },
  storyteller: { id: 'storyteller', name: 'Storyteller', description: 'Write 500+ words total', icon: '📖', category: 'depth', tier: 'silver' },
  word_master: { id: 'word_master', name: 'Word Master', description: 'Write 1000+ words total', icon: '✍️', category: 'depth', tier: 'gold' },

  // RANGE
  emotional_explorer: { id: 'emotional_explorer', name: 'Emotional Explorer', description: 'Use 5 different moods', icon: '🎭', category: 'range', tier: 'silver' },
  mood_master: { id: 'mood_master', name: 'Mood Master', description: 'Use all predefined moods', icon: '🌈', category: 'range', tier: 'gold' },
  balanced_perspective: { id: 'balanced_perspective', name: 'Balanced Perspective', description: 'Write in both positive and challenging moods', icon: '⚖️', category: 'range', tier: 'bronze' },

  // MINDFULNESS
  mindful_starter: { id: 'mindful_starter', name: 'Mindful Starter', description: 'Complete your first timed session', icon: '⏱️', category: 'mindfulness', tier: 'bronze' },
  present_moment: { id: 'present_moment', name: 'Present Moment', description: 'Use timer 10 times', icon: '🧘', category: 'mindfulness', tier: 'silver' },
  meditation_master: { id: 'meditation_master', name: 'Meditation Master', description: 'Use timer 25 times', icon: '🙏', category: 'mindfulness', tier: 'gold' },

  // PATTERNS
  morning_person: { id: 'morning_person', name: 'Morning Person', description: 'Write 5 morning entries (5am-12pm)', icon: '🌅', category: 'patterns', tier: 'silver' },
  night_owl: { id: 'night_owl', name: 'Night Owl', description: 'Write 5 evening entries (9pm-5am)', icon: '🌙', category: 'patterns', tier: 'silver' },
  weekend_writer: { id: 'weekend_writer', name: 'Weekend Writer', description: 'Write entries on both Saturday and Sunday', icon: '📆', category: 'patterns', tier: 'bronze' }
};

const defaultState = {
  totalXP: 0,
  level: 1,
  tier: 'seed',
  lastEntryDate: null,
  streak: 0,
  achievements: {
    unlocked: [],
    progress: {
      totalEntries: 0,
      differentMoods: [],
      morningEntries: 0,
      eveningEntries: 0,
      timedSessions: 0,
      entriesThisMonth: 0,
      currentMonth: new Date().getMonth()
    }
  }
};

// Helper: Check for new achievements based on current progress
function checkNewAchievements(unlocked, progress, wordCount, streak) {
  const newAchievements = [];

  // Helper to check if unlocked
  const isLocked = (id) => !unlocked.includes(id);

  // CONSISTENCY
  if (progress.totalEntries >= 1 && isLocked('first_entry')) newAchievements.push('first_entry');
  if (streak >= 3 && isLocked('three_day_streak')) newAchievements.push('three_day_streak');
  if (progress.entriesThisMonth >= 7 && isLocked('weekly_rhythm')) newAchievements.push('weekly_rhythm');
  if (streak >= 30 && isLocked('month_streak')) newAchievements.push('month_streak');

  // DEPTH (Note: Word count checks are usually per entry or total, adapting logic here)
  if (wordCount >= 100 && isLocked('thoughtful')) newAchievements.push('thoughtful');
  // Note: You might want a 'totalWords' tracker in progress for 'storyteller' and 'word_master'
  
  // RANGE
  if (progress.differentMoods.length >= 5 && isLocked('emotional_explorer')) newAchievements.push('emotional_explorer');
  // Note: 'mood_master' would need a check against all available moods

  // MINDFULNESS
  if (progress.timedSessions >= 1 && isLocked('mindful_starter')) newAchievements.push('mindful_starter');
  if (progress.timedSessions >= 10 && isLocked('present_moment')) newAchievements.push('present_moment');
  if (progress.timedSessions >= 25 && isLocked('meditation_master')) newAchievements.push('meditation_master');

  // PATTERNS
  if (progress.morningEntries >= 5 && isLocked('morning_person')) newAchievements.push('morning_person');
  if (progress.eveningEntries >= 5 && isLocked('night_owl')) newAchievements.push('night_owl');

  return newAchievements;
}

export const useProgress = create(
  persist(
    (set, get) => ({
      ...defaultState,

      reset: () => set(defaultState),

      applyDailySave: ({ date, moodTagged, force = false, wordCount = 0, mood = null, usedTimer = false, entryHour = null }) => {
        const s = get();
        
        // 1. Handle Monthly Reset
        const currentMonth = new Date().getMonth();
        let entriesThisMonth = s.achievements.progress.entriesThisMonth;
        if (currentMonth !== s.achievements.progress.currentMonth) {
          entriesThisMonth = 0;
        }

        // 2. Prevent duplicate processing for same day (unless forced)
        if (!force && s.lastEntryDate === date) {
          return { xpGained: 0, levelUp: false, tierChanged: null, streakNow: s.streak, newAchievements: [] };
        }

        // 3. Calculate Streak
        const last = s.lastEntryDate ? new Date(`${s.lastEntryDate}T00:00:00`) : null;
        const cur = new Date(`${date}T00:00:00`);
        let nextStreak = s.streak;
        
        if (!last) {
          nextStreak = 1;
        } else {
          const diffTime = Math.abs(cur - last);
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            nextStreak = s.streak + 1; // Consecutive day
          } else if (diffDays > 1) {
            nextStreak = 1; // Streak broken
          }
          // If diffDays === 0, we already handled it in step 2, or it's a force update
        }

        // 4. Calculate XP
        let xp = 10; // Base XP
        if (moodTagged) xp += 2;
        // Streak bonuses
        if (nextStreak >= 4 && nextStreak <= 6) xp += 2;
        else if (nextStreak >= 7) xp += 5;

        const totalXP = s.totalXP + xp;
        const level = Math.floor(totalXP / 100) + 1;
        const tier = level <= 3 ? 'seed' : level <= 6 ? 'sprout' : level <= 9 ? 'bloom' : level <= 12 ? 'grove' : 'aurora';
        const levelUp = level > s.level;
        const tierChanged = tier !== s.tier ? { from: s.tier, to: tier } : null;

        // 5. Update Achievement Progress
        const newProgress = {
          ...s.achievements.progress,
          totalEntries: s.achievements.progress.totalEntries + 1,
          entriesThisMonth: entriesThisMonth + 1,
          currentMonth: currentMonth,
          // Update these if changed
          morningEntries: s.achievements.progress.morningEntries,
          eveningEntries: s.achievements.progress.eveningEntries,
          timedSessions: s.achievements.progress.timedSessions,
          differentMoods: [...s.achievements.progress.differentMoods]
        };

        // Track mood diversity
        if (mood && !newProgress.differentMoods.includes(mood)) {
          newProgress.differentMoods.push(mood);
        }

        // Track time patterns
        if (entryHour !== null) {
          if (entryHour >= 5 && entryHour < 12) {
            newProgress.morningEntries += 1;
          } else if (entryHour >= 21 || entryHour < 5) {
            newProgress.eveningEntries += 1;
          }
        }

        // Track timer usage
        if (usedTimer) {
          newProgress.timedSessions += 1;
        }

        // 6. Check for newly unlocked achievements
        const newAchievementsIds = checkNewAchievements(
          s.achievements.unlocked, 
          newProgress, 
          wordCount, 
          nextStreak
        );

        // 7. Update State
        set({
          totalXP,
          level,
          tier,
          lastEntryDate: date,
          streak: nextStreak,
          achievements: {
            unlocked: [...s.achievements.unlocked, ...newAchievementsIds],
            progress: newProgress
          }
        });

        // 8. Return results for UI (Popups, etc.)
        return { 
          xpGained: xp, 
          levelUp, 
          tierChanged, 
          streakNow: nextStreak,
          newAchievements: newAchievementsIds.map(id => ACHIEVEMENTS[id])
        };
      },

      // Helper to get formatted achievement data for UI
      getAchievements: () => {
        const state = get();
        
        // Calculate mastery progress
        const mastery = {
          consistency: { unlocked: false, progress: 0, total: 0 },
          depth: { unlocked: false, progress: 0, total: 0 },
          range: { unlocked: false, progress: 0, total: 0 },
          mindfulness: { unlocked: false, progress: 0, total: 0 },
          patterns: { unlocked: false, progress: 0, total: 0 }
        };

        // Count achievements per category
        Object.values(ACHIEVEMENTS).forEach(achievement => {
          if (mastery[achievement.category]) {
            mastery[achievement.category].total++;
            if (state.achievements.unlocked.includes(achievement.id)) {
              mastery[achievement.category].progress++;
            }
          }
        });

        // Check if mastery is unlocked (all achievements in category)
        Object.keys(mastery).forEach(category => {
          mastery[category].unlocked = mastery[category].progress === mastery[category].total && mastery[category].total > 0;
        });

        return {
          unlocked: state.achievements.unlocked.map(id => ACHIEVEMENTS[id]),
          progress: state.achievements.progress,
          allAchievements: ACHIEVEMENTS,
          mastery: mastery
        };
      }
    }),
    {
      name: 'progress-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
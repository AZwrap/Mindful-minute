import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'consistency' | 'depth' | 'range' | 'mindfulness';
}

interface AchievementProgress {
  entriesWritten: number;
  differentMoods: Set<string>; // Sets don't persist well in JSON, we might need to handle this
  morningEntries: number;
  eveningEntries: number;
  timedSessions: number;
  savedExits: number;
  wordCountMilestones: {
    hundredWords: boolean;
    fiveHundredTotal: boolean;
    thousandTotal: boolean;
  };
}

interface AchievementState {
  unlocked: string[];
  progress: AchievementProgress;
  achievements: Record<string, Achievement>;
}

interface AchievementActions {
  unlockAchievement: (achievementId: string) => void;
  updateProgress: (updates: Partial<AchievementProgress>) => void;
  checkNewAchievements: (entries: any[], streak: number, stats: any) => string[];
  reset: () => void;
}

type AchievementStore = AchievementState & AchievementActions;

// --------------------------------------------------
// STORE
// --------------------------------------------------
export const useAchievement = create<AchievementStore>()(
  persist(
    (set, get) => ({
      // STATE
      unlocked: [],
      
      progress: {
        entriesWritten: 0,
        differentMoods: new Set<string>(),
        morningEntries: 0,
        eveningEntries: 0,
        timedSessions: 0,
        savedExits: 0,
        wordCountMilestones: {
          hundredWords: false,
          fiveHundredTotal: false,
          thousandTotal: false
        }
      },
      
      achievements: {
        // Consistency
        first_entry: {
          id: 'first_entry',
          name: 'First Reflection',
          description: 'Write your first journal entry',
          icon: '📝',
          category: 'consistency'
        },
        three_day_streak: {
          id: 'three_day_streak', 
          name: 'Building Routine',
          description: 'Write for 3 consecutive days',
          icon: '🔥',
          category: 'consistency'
        },
        weekly_rhythm: {
          id: 'weekly_rhythm',
          name: 'Weekly Rhythm', 
          description: 'Write 7 days in a month',
          icon: '📅',
          category: 'consistency'
        },
        
        // Writing Depth
        thoughtful: {
          id: 'thoughtful',
          name: 'Thoughtful',
          description: 'Write 100+ words in an entry',
          icon: '💭',
          category: 'depth'
        },
        storyteller: {
          id: 'storyteller',
          name: 'Storyteller',
          description: 'Write 500+ words total',
          icon: '📖',
          category: 'depth'
        },
        
        // Emotional Range  
        emotional_explorer: {
          id: 'emotional_explorer',
          name: 'Emotional Explorer',
          description: 'Use 5 different moods',
          icon: '🎭',
          category: 'range'
        },
        balanced_perspective: {
          id: 'balanced_perspective',
          name: 'Balanced Perspective',
          description: 'Write in both positive and challenging moods',
          icon: '⚖️',
          category: 'range'
        },
        
        // Mindfulness
        mindful_starter: {
          id: 'mindful_starter',
          name: 'Mindful Starter',
          description: 'Complete your first timed session',
          icon: '⏱️',
          category: 'mindfulness'
        },
        present_moment: {
          id: 'present_moment',
          name: 'Present Moment',
          description: 'Use timer 10 times',
          icon: '🧘',
          category: 'mindfulness'
        }
      },
      
      // ACTIONS
      unlockAchievement: (achievementId) => set((state) => ({
        unlocked: [...new Set([...state.unlocked, achievementId])]
      })),
      
      updateProgress: (updates) => set((state) => ({
        progress: { ...state.progress, ...updates }
      })),
      
      checkNewAchievements: (entries, streak, stats) => {
        const state = get();
        const newAchievements: string[] = [];
        const { progress } = state;
        
        // Check consistency
        if (entries.length >= 1 && !state.unlocked.includes('first_entry')) {
          newAchievements.push('first_entry');
        }
        
        if (streak >= 3 && !state.unlocked.includes('three_day_streak')) {
          newAchievements.push('three_day_streak');
        }
        
        // Check writing depth
        if (stats?.totalWords >= 500 && !state.unlocked.includes('storyteller')) {
          newAchievements.push('storyteller');
        }
        
        // Check emotional range (Handle Set conversion if coming from storage)
        const moodCount = progress.differentMoods instanceof Set 
          ? progress.differentMoods.size 
          : new Set(progress.differentMoods).size;

        if (moodCount >= 5 && !state.unlocked.includes('emotional_explorer')) {
          newAchievements.push('emotional_explorer');
        }
        
        // Unlock locally
        newAchievements.forEach(achievementId => {
          get().unlockAchievement(achievementId);
        });
        
        return newAchievements;
      },
      
      reset: () => set({ 
        unlocked: [],
        progress: {
          entriesWritten: 0,
          differentMoods: new Set(),
          morningEntries: 0,
          eveningEntries: 0,
          timedSessions: 0,
          savedExits: 0,
          wordCountMilestones: {
            hundredWords: false,
            fiveHundredTotal: false,
            thousandTotal: false
          }
        }
      })
    }),
    {
      name: 'achievement-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Serialization for Sets
      partialize: (state) => ({
        unlocked: state.unlocked,
        progress: {
          ...state.progress,
          differentMoods: Array.from(state.progress.differentMoods), // Convert Set to Array for storage
        },
      }),
      // Deserialization for Sets
      onRehydrateStorage: () => (state) => {
        if (state && state.progress.differentMoods) {
          state.progress.differentMoods = new Set(state.progress.differentMoods);
        }
      },
    }
  )
);
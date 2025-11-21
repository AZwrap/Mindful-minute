import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAchievement = create(
  persist(
    (set, get) => ({
      // Unlocked achievements
      unlocked: [],
      
      // Progress tracking
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
      },
      
      // Achievement definitions
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
      
      // Actions
      unlockAchievement: (achievementId) => set((state) => ({
        unlocked: [...new Set([...state.unlocked, achievementId])]
      })),
      
      updateProgress: (updates) => set((state) => ({
        progress: { ...state.progress, ...updates }
      })),
      
      checkNewAchievements: (entries, streak, stats) => {
        const state = get();
        const newAchievements = [];
        const { progress } = state;
        
        // Check consistency achievements
        if (entries.length >= 1 && !state.unlocked.includes('first_entry')) {
          newAchievements.push('first_entry');
        }
        
        if (streak >= 3 && !state.unlocked.includes('three_day_streak')) {
          newAchievements.push('three_day_streak');
        }
        
        // Check writing depth
        if (stats.totalWords >= 500 && !state.unlocked.includes('storyteller')) {
          newAchievements.push('storyteller');
        }
        
        // Check emotional range
        if (progress.differentMoods.size >= 5 && !state.unlocked.includes('emotional_explorer')) {
          newAchievements.push('emotional_explorer');
        }
        
        // Unlock new achievements
        newAchievements.forEach(achievementId => {
          get().unlockAchievement(achievementId);
        });
        
        return newAchievements;
      },
      
      // Reset for testing
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
    }
  )
);
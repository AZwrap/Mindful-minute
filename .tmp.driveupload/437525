import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV
const storage = new MMKV();

// MMKV Storage Wrapper
const mmkvStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name) => storage.delete(name),
};

export const useCustomization = create(
  persist(
    (set, get) => ({
      // Current active customizations
      activeTheme: 'default',
      activeFont: 'default',
      activeGradient: 'default',
      
      // Available unlocks
      unlockedThemes: ['default'],
      unlockedFonts: ['default'], 
      unlockedGradients: ['default'],
      
      // Theme definitions
      themes: {
        default: {
          name: 'Default',
          primary: '#6366F1',
          secondary: '#8B5CF6',
          unlockCondition: { type: 'default' }
        },
        serene: {
          name: 'Serene',
          primary: '#10B981', 
          secondary: '#059669',
          unlockCondition: { type: 'mastery', category: 'mindfulness', required: true }
        },
        focused: {
          name: 'Focused',
          primary: '#F59E0B',
          secondary: '#D97706',
          unlockCondition: { type: 'mastery', category: 'depth', required: true }
        },
        balanced: {
          name: 'Balanced', 
          primary: '#8B5CF6',
          secondary: '#7C3AED',
          unlockCondition: { type: 'mastery', category: 'range', required: true }
        },
        dedicated: {
          name: 'Dedicated',
          primary: '#EF4444',
          secondary: '#DC2626', 
          unlockCondition: { type: 'mastery', category: 'consistency', required: true }
        }
      },
      
      // Font definitions
      fonts: {
        default: {
          name: 'System Default',
          family: 'System',
          unlockCondition: { type: 'default' }
        },
        serene: {
          name: 'Serene Sans',
          family: 'System',
          weight: '300',
          unlockCondition: { type: 'achievement', id: 'mindful_starter' }
        },
        focused: {
          name: 'Focused Mono', 
          family: 'System',
          weight: '600',
          unlockCondition: { type: 'achievement', id: 'thoughtful' }
        },
        creative: {
          name: 'Creative Script',
          family: 'System', 
          style: 'italic',
          unlockCondition: { type: 'achievement', id: 'emotional_explorer' }
        }
      },
      
      getUnlockRequirements: (itemKey, category) => {
        const requirements = {
          themes: {
            'serene': 'Master Mindfulness category',
            'focused': 'Master Depth category', 
            'balanced': 'Master Range category',
            'dedicated': 'Master Consistency category'
          },
          fonts: {
            'serene': 'Unlock Mindful Starter achievement',
            'focused': 'Unlock Thoughtful achievement',
            'creative': 'Unlock Emotional Explorer achievement'
          },
          gradients: {
            'morning': 'Unlock Morning Person achievement',
            'evening': 'Unlock Night Owl achievement', 
            'mastery': 'Master any category'
          }
        };
        
        return requirements[category]?.[itemKey] || 'Complete achievements to unlock';
      },
      
      // Gradient definitions  
      gradients: {
        default: {
          name: 'Default Gradient',
          colors: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
          unlockCondition: { type: 'default' }
        },
        morning: {
          name: 'Morning Glow',
          colors: ['#FFFBEB', '#FEF3C7', '#FDE68A'],
          unlockCondition: { type: 'achievement', id: 'morning_person' }
        },
        evening: {
          name: 'Evening Calm',
          colors: ['#F0F9FF', '#E0F2FE', '#BAE6FD'],
          unlockCondition: { type: 'achievement', id: 'night_owl' }
        },
        mastery: {
          name: 'Mastery Glow',
          colors: ['#F0FDF4', '#DCFCE7', '#BBF7D0'],
          unlockCondition: { type: 'any_mastery', required: true }
        }
      },
      
      // Actions
      unlockAll: () => set((state) => ({
        unlockedThemes: Object.keys(state.themes),
        unlockedFonts: Object.keys(state.fonts),
        unlockedGradients: Object.keys(state.gradients),
      })),

      unlockCustomization: (type, key) => set((state) => ({
        [`unlocked${type.charAt(0).toUpperCase() + type.slice(1)}s`]: [
          ...state[`unlocked${type.charAt(0).toUpperCase() + type.slice(1)}s`],
          key
        ]
      })),
      
      setActiveTheme: (theme) => set({ activeTheme: theme }),
      setActiveFont: (font) => set({ activeFont: font }),
      setActiveGradient: (gradient) => set({ activeGradient: gradient }),
      
      // Check for new unlocks based on achievements
      checkForUnlocks: (achievements, mastery) => {
        const state = get();
        const newUnlocks = [];
        
        // Check theme unlocks
        Object.entries(state.themes).forEach(([key, theme]) => {
          if (!state.unlockedThemes.includes(key) && checkUnlockCondition(theme.unlockCondition, achievements, mastery)) {
            state.unlockCustomization('theme', key);
            newUnlocks.push({ type: 'theme', name: theme.name });
          }
        });
        
        // Check font unlocks
        Object.entries(state.fonts).forEach(([key, font]) => {
          if (!state.unlockedFonts.includes(key) && checkUnlockCondition(font.unlockCondition, achievements, mastery)) {
            state.unlockCustomization('font', key);
            newUnlocks.push({ type: 'font', name: font.name });
          }
        });
        
        // Check gradient unlocks
        Object.entries(state.gradients).forEach(([key, gradient]) => {
          if (!state.unlockedGradients.includes(key) && checkUnlockCondition(gradient.unlockCondition, achievements, mastery)) {
            state.unlockCustomization('gradient', key);
            newUnlocks.push({ type: 'gradient', name: gradient.name });
          }
        });
        
        return newUnlocks;
      },
      
      reset: () => set({ 
        activeTheme: 'default',
        activeFont: 'default',
        activeGradient: 'default',
        unlockedThemes: ['default'],
        unlockedFonts: ['default'],
        unlockedGradients: ['default']
      })
    }),
    {
      name: 'customization-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);

// Helper function to check unlock conditions
function checkUnlockCondition(condition, achievements, mastery) {
  if (!condition) return false;
  
  switch(condition.type) {
    case 'default':
      return true;
    case 'achievement':
      // Check if the achievement ID exists in the unlocked array
      return achievements.unlocked.some(id => id === condition.id);
    case 'mastery':
      return mastery[condition.category]?.unlocked === condition.required;
    case 'any_mastery':
      return Object.values(mastery).some(m => m.unlocked === condition.required);
    default:
      return false;
  }
}
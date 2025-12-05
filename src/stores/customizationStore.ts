import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
export type UnlockType = 'default' | 'mastery' | 'achievement' | 'any_mastery';

export interface UnlockCondition {
  type: UnlockType;
  category?: string;
  required?: boolean;
  id?: string;
}

export interface ThemeDef {
  name: string;
  primary: string;
  secondary: string;
  unlockCondition: UnlockCondition;
}

export interface FontDef {
  name: string;
  family: string;
  weight?: string; // React Native font weights are strings '100'-'900' or 'bold'
  style?: 'normal' | 'italic';
  unlockCondition: UnlockCondition;
}

export interface GradientDef {
  name: string;
  colors: string[];
  unlockCondition: UnlockCondition;
}

interface CustomizationState {
  activeTheme: string;
  activeFont: string;
  activeGradient: string;

  unlockedThemes: string[];
  unlockedFonts: string[];
  unlockedGradients: string[];

  themes: Record<string, ThemeDef>;
  fonts: Record<string, FontDef>;
  gradients: Record<string, GradientDef>;
}

interface CustomizationActions {
  setActiveTheme: (key: string) => void;
  setActiveFont: (key: string) => void;
  setActiveGradient: (key: string) => void;

  unlockCustomization: (type: 'theme' | 'font' | 'gradient', key: string) => void;
  unlockAll: () => void;
  checkForUnlocks: (achievements: any, mastery: any) => Array<{ type: string; name: string }>;
  getUnlockRequirements: (key: string, category: 'themes' | 'fonts' | 'gradients') => string;
  reset: () => void;
}

type CustomizationStore = CustomizationState & CustomizationActions;

// --------------------------------------------------
// HELPER
// --------------------------------------------------
function checkUnlockCondition(condition: UnlockCondition, achievements: any, mastery: any): boolean {
  if (!condition) return false;

  switch (condition.type) {
    case 'default':
      return true;
    case 'achievement':
      return achievements.unlocked.some((id: string) => id === condition.id);
    case 'mastery':
      if (!condition.category) return false;
      return mastery[condition.category]?.unlocked === condition.required;
    case 'any_mastery':
      return Object.values(mastery).some((m: any) => m.unlocked === condition.required);
    default:
      return false;
  }
}

// --------------------------------------------------
// STORE
// --------------------------------------------------
export const useCustomization = create<CustomizationStore>()(
  persist(
    (set, get) => ({
      // STATE
      activeTheme: 'default',
      activeFont: 'default',
      activeGradient: 'default',

      unlockedThemes: ['default'],
      unlockedFonts: ['default'],
      unlockedGradients: ['default'],

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

      // ACTIONS
      setActiveTheme: (theme) => set({ activeTheme: theme }),
      setActiveFont: (font) => set({ activeFont: font }),
      setActiveGradient: (gradient) => set({ activeGradient: gradient }),

      unlockCustomization: (type, key) => set((state) => {
        const field = `unlocked${type.charAt(0).toUpperCase() + type.slice(1)}s` as keyof CustomizationState;
        // Safety check to ensure we are modifying an array
        const currentList = state[field];
        if (Array.isArray(currentList)) {
            return { [field]: [...currentList, key] } as Partial<CustomizationState>;
        }
        return {};
      }),

      unlockAll: () => set((state) => ({
        unlockedThemes: Object.keys(state.themes),
        unlockedFonts: Object.keys(state.fonts),
        unlockedGradients: Object.keys(state.gradients),
      })),

      checkForUnlocks: (achievements, mastery) => {
        const state = get();
        const newUnlocks: Array<{ type: string; name: string }> = [];

        // Themes
        Object.entries(state.themes).forEach(([key, theme]) => {
          if (!state.unlockedThemes.includes(key) && checkUnlockCondition(theme.unlockCondition, achievements, mastery)) {
            state.unlockCustomization('theme', key);
            newUnlocks.push({ type: 'theme', name: theme.name });
          }
        });

        // Fonts
        Object.entries(state.fonts).forEach(([key, font]) => {
          if (!state.unlockedFonts.includes(key) && checkUnlockCondition(font.unlockCondition, achievements, mastery)) {
            state.unlockCustomization('font', key);
            newUnlocks.push({ type: 'font', name: font.name });
          }
        });

        // Gradients
        Object.entries(state.gradients).forEach(([key, gradient]) => {
          if (!state.unlockedGradients.includes(key) && checkUnlockCondition(gradient.unlockCondition, achievements, mastery)) {
            state.unlockCustomization('gradient', key);
            newUnlocks.push({ type: 'gradient', name: gradient.name });
          }
        });

        return newUnlocks;
      },

      getUnlockRequirements: (itemKey, category) => {
        const requirements: Record<string, Record<string, string>> = {
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
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
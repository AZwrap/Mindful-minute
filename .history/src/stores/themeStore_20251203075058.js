import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper: Parse "HH:MM" into minutes from midnight
const parseToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hh, mm] = timeStr.split(':').map(Number);
  return hh * 60 + mm;
};

export const useTheme = create(
  persist(
    (set, get) => ({
      // --------------------------------------------------
      // STATE
      // --------------------------------------------------
      theme: 'system', // 'light' | 'dark' | 'system' | 'dynamic'
      
      // Theme customization settings
      dynamicSunrise: '06:00',
      dynamicSunset: '18:00',
      accentColor: '#6366F1', // Default Indigo

      // --------------------------------------------------
      // ACTIONS
      // --------------------------------------------------
      setTheme: (newTheme) => set({ theme: newTheme }),
      
      setDynamicSunrise: (time) => set({ dynamicSunrise: time }),
      
      setDynamicSunset: (time) => set({ dynamicSunset: time }),

      setAccentColor: (color) => set({ accentColor: color }),

      // --------------------------------------------------
      // COMPUTED LOGIC
      // --------------------------------------------------
      getCurrentTheme: (systemScheme) => {
        const { theme, dynamicSunrise, dynamicSunset } = get();

        // 1. Static overrides
        if (theme === 'light') return 'light';
        if (theme === 'dark') return 'dark';
        if (theme === 'system') return systemScheme === 'dark' ? 'dark' : 'light';

        // 2. Dynamic Time-Based Logic
        if (theme === 'dynamic') {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          
          const sunrise = parseToMinutes(dynamicSunrise || '06:00');
          const sunset = parseToMinutes(dynamicSunset || '18:00');

          // Handle midnight crossover (e.g., sunset 22:00, sunrise 06:00)
          if (sunrise < sunset) {
            // Standard day: 06:00 -> 18:00 is light
            return (currentMinutes >= sunrise && currentMinutes < sunset) ? 'light' : 'dark';
          } else {
            // Crossover: 22:00 -> 06:00 is dark (so light is OR)
            return (currentMinutes >= sunrise || currentMinutes < sunset) ? 'light' : 'dark';
          }
        }

        return 'light'; // Fallback
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        theme: state.theme,
        dynamicSunrise: state.dynamicSunrise,
        dynamicSunset: state.dynamicSunset,
        accentColor: state.accentColor,
      }),
    }
  )
);
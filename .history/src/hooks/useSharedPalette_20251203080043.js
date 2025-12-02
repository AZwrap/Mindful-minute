import { useColorScheme } from 'react-native';
import { useTheme } from '../stores/themeStore';

export const useSharedPalette = () => {
  const systemScheme = useColorScheme();
  // 1. Grab the custom accent color from the store
  const { getCurrentTheme, accentColor } = useTheme(); 
  
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  // 2. Use that color instead of hardcoded Indigo (#6366F1)
  const activeColor = accentColor || '#6366F1';

  const colors = isDark
    ? {
        bg: '#0F172A',
        card: '#1E293B',
        text: '#E5E7EB',
        subtleText: '#94A3B8',
        border: '#334155',
        accent: activeColor, // <--- DYNAMIC
        surface: '#1E293B',
        error: '#EF4444',
      }
    : {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        text: '#0F172A',
        subtleText: '#64748B',
        border: '#E2E8F0',
        accent: activeColor, // <--- DYNAMIC
        surface: '#F1F5F9',
        error: '#EF4444',
      };

  return colors;
};
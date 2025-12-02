import { useColorScheme } from 'react-native';
import { useTheme } from '../stores/themeStore';

export const useSharedPalette = () => {
  const systemScheme = useColorScheme();
  const { getCurrentTheme, accentColor } = useTheme(); // Get custom accent
  
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  // Base colors based on theme
  const colors = isDark
    ? {
        bg: '#0F172A',
        card: '#1E293B',
        text: '#E5E7EB',
        subtleText: '#94A3B8',
        border: '#334155',
        // Use user-defined accent, or fallback to Indigo
        accent: accentColor || '#6366F1', 
        surface: '#1E293B',
        error: '#EF4444',
      }
    : {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        text: '#0F172A',
        subtleText: '#64748B',
        border: '#E2E8F0',
        // Use user-defined accent, or fallback to Indigo
        accent: accentColor || '#6366F1',
        surface: '#F1F5F9',
        error: '#EF4444',
      };

  return colors;
};
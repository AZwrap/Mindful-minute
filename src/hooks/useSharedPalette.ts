import { useColorScheme } from 'react-native';
import { useTheme } from '../stores/themeStore';

interface Palette {
  bg: string;
  card: string;
  text: string;
  subtleText: string;
  border: string;
  accent: string;
  accentText: string;
  success: string;
  error: string;
  sub: string; // Alias for backward compatibility
}

export const useSharedPalette = (): Palette => {
  const system = useColorScheme();
  const { getCurrentTheme, accentColor } = useTheme();
  
  const theme = getCurrentTheme(system);
  const isDark = theme === 'dark';

  return {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#0F172A',
    subtleText: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    
    // Dynamic Accent
    accent: accentColor,
    accentText: '#FFFFFF',

    // Status
    success: '#10B981',
    error: '#EF4444',
    
    // Alias
    sub: isDark ? '#94A3B8' : '#64748B',
  };
};
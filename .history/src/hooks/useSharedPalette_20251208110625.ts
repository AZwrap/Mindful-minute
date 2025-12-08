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

    // SEMANTIC COLORS (Add these)
    surfaceHighlight: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderSubtle: isDark ? '#334155' : '#E2E8F0',
    successSoft: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7', // Soft Green
    successText: isDark ? '#4ADE80' : '#15803D', // Strong Green text
    glassBg: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
  };
};
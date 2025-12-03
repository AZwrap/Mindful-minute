import { useColorScheme } from 'react-native';
import { useTheme } from '../stores/themeStore';

// Helper: Calculate brightness to determine text color (Black or White)
const getContrastTextColor = (hex) => {
  if (!hex) return '#FFFFFF';
  
  // Clean hash
  const c = hex.substring(1);
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;

  // Standard luma formula (Rec. 601)
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // If bright (> 160), use dark text. Otherwise white.
  return luma > 160 ? '#0F172A' : '#FFFFFF';
};

export const useSharedPalette = () => {
  const systemScheme = useColorScheme();
  const { getCurrentTheme, accentColor } = useTheme();
  
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  const activeColor = accentColor || '#6366F1';
  const contrastText = getContrastTextColor(activeColor); // <--- DYNAMIC TEXT COLOR

  const colors = isDark
    ? {
        bg: '#0F172A',
        card: '#1E293B',
        text: '#E5E7EB',
        subtleText: '#94A3B8',
        border: '#334155',
        accent: activeColor,
        accentText: contrastText, // <--- NEW KEY
        accentSoft: activeColor + '20',
        surface: '#1E293B',
        error: '#EF4444',
      }
    : {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        text: '#0F172A',
        subtleText: '#64748B',
        border: '#E2E8F0',
        accent: activeColor,
        accentText: contrastText, // <--- NEW KEY
        accentSoft: activeColor + '20',
        surface: '#F1F5F9',
        error: '#EF4444',
      };

  return colors;
};
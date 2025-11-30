import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { useTheme } from "../stores/themeStore";

export function useSharedPalette() {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === "dark";

  return useMemo(() => ({
    bg: isDark ? "#0F172A" : "#F8FAFC",
    card: isDark ? "rgba(30,41,59,0.60)" : "rgba(241,245,249,0.80)",
    text: isDark ? "#E5E7EB" : "#0F172A",
    sub: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    accent: "#6366F1",
    accentSoft: isDark ? "rgba(99,102,241,0.20)" : "rgba(99,102,241,0.10)",
  }), [isDark]);
}

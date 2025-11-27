// src/screens/PremiumScreen.js
import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import PremiumPressable from "../components/PremiumPressable";
import { useTheme } from "../stores/themeStore";

export default function PremiumScreen({ navigation }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === "dark";

  const gradients = {
    dark: ["#0F172A", "#1E293B", "#334155"],
    light: ["#F8FAFC", "#F1F5F9", "#E2E8F0"],
  };

  return (
    <LinearGradient
      colors={gradients[currentTheme]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.card}>
        <Text
          style={[
            styles.title,
            { color: isDark ? "#E5E7EB" : "#0F172A" },
          ]}
        >
          Mindful Minute Premium
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: isDark ? "#94A3B8" : "#475569" },
          ]}
        >
          Unlock all advanced features and accelerate your growth.
        </Text>

        <View style={styles.benefits}>
          <Text
            style={[
              styles.benefit,
              { color: isDark ? "#CBD5E1" : "#334155" },
            ]}
          >
            ✓ Unlimited smart prompts
          </Text>
          <Text
            style={[
              styles.benefit,
              { color: isDark ? "#CBD5E1" : "#334155" },
            ]}
          >
            ✓ Detailed mood analytics
          </Text>
          <Text
            style={[
              styles.benefit,
              { color: isDark ? "#CBD5E1" : "#334155" },
            ]}
          >
            ✓ Advanced progress insights
          </Text>
          <Text
            style={[
              styles.benefit,
              { color: isDark ? "#CBD5E1" : "#334155" },
            ]}
          >
            ✓ More premium themes & customization
          </Text>
        </View>

        <PremiumPressable
          onPress={() => {}}
          haptic="light"
          style={[
            styles.button,
            { backgroundColor: "#6366F1" },
          ]}
        >
          <Text style={styles.buttonText}>Upgrade Now</Text>
        </PremiumPressable>

        <PremiumPressable
          onPress={() => navigation.goBack()}
          haptic="light"
          style={[styles.backButton]}
        >
          <Text
            style={[
              styles.backButtonText,
              { color: isDark ? "#A5B4FC" : "#4F46E5" },
            ]}
          >
            Maybe Later
          </Text>
        </PremiumPressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  benefits: {
    marginBottom: 30,
    gap: 8,
  },
  benefit: {
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  backButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  backButtonText: {
    fontWeight: "700",
    fontSize: 15,
  },
});

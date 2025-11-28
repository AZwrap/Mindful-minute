// src/components/ThemeFadeWrapper.js
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { useColorScheme } from "react-native";
import { useTheme } from "../stores/themeStore";

export default function ThemeFadeWrapper({ children }) {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(system);
  const isDark = currentTheme === "dark";

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const bgAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: isDark ? 1 : 0,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }, [isDark]);

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#F8FAFC", "#0F172A"],
  });

  return (
    <Animated.View style={{ flex: 1, backgroundColor, opacity: fadeAnim }}>
      {children}
    </Animated.View>
  );
}

import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { useTheme } from "../stores/themeStore";
import { useColorScheme } from "react-native";

export default function ThemeFadeWrapper({ children }) {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const theme = getCurrentTheme(system);

  const fade = useRef(new Animated.Value(1)).current;
  const prevBg = useRef(theme === "dark" ? "#0F172A" : "#FFFFFF");

  useEffect(() => {
    const newBg = theme === "dark" ? "#0F172A" : "#FFFFFF";

    fade.setValue(0);

    Animated.timing(fade, {
      toValue: 1,
      duration: 350,
      useNativeDriver: false, // backgroundColor
    }).start(() => {
      prevBg.current = newBg; // ✅ THIS IS THE CORRECT UPDATE
    });
  }, [theme]);

  const bgInterpolate = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [
      prevBg.current,
      theme === "dark" ? "#0F172A" : "#FFFFFF",
    ],
  });

  return (
    <View style={{ flex: 1 }}>
      {/* BACKGROUND CROSSFADE */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: bgInterpolate, zIndex: -1 },
        ]}
      />

      {/* REAL APP */}
      {children}
    </View>
  );
}

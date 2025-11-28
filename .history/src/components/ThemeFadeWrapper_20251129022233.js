import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { useTheme } from "../stores/themeStore";
import { useColorScheme } from "react-native";
import { BlurView } from "expo-blur";

export default function ThemeFadeWrapper({ children }) {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();

  const theme = getCurrentTheme(system);
  const [prevTheme, setPrevTheme] = useState(theme);

  // MULTI-LAYER ANIMATIONS
  const bgFade = useRef(new Animated.Value(1)).current;    // background
  const uiFade = useRef(new Animated.Value(1)).current;    // UI content
  const blurAnim = useRef(new Animated.Value(0)).current;  // blur overlay

  useEffect(() => {
    if (theme === prevTheme) return;

    // Reset anim values
    bgFade.setValue(0);
    uiFade.setValue(0);
    blurAnim.setValue(1);

    Animated.parallel([
      // Background crossfade (slower → expensive feel)
      Animated.timing(bgFade, {
        toValue: 1,
        duration: 550,
        easing: Animated.Easing.out(Animated.Easing.cubic),
        useNativeDriver: true,
      }),

      // UI fade (faster → crisp)
      Animated.timing(uiFade, {
        toValue: 1,
        duration: 350,
        easing: Animated.Easing.out(Animated.Easing.cubic),
        useNativeDriver: true,
      }),

      // Light blur dissolve overlay (iOS style)
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 650,
        easing: Animated.Easing.inOut(Animated.Easing.quad),
        useNativeDriver: Platform.OS === "ios",
      }),
    ]).start(() => {
      setPrevTheme(theme);
    });
  }, [theme]);

  return (
    <>
      {/* OLD BACKGROUND */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          opacity: bgFade.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        }}
      >
        {children(prevTheme)}
      </Animated.View>

      {/* NEW BACKGROUND */}
      <Animated.View style={{ flex: 1, opacity: bgFade }}>
        {/* UI layer with lagged fade */}
        <Animated.View style={{ flex: 1, opacity: uiFade }}>
          {children(theme)}
        </Animated.View>
      </Animated.View>

      {/* BLUR DISSOLVE OVERLAY */}
      {Platform.OS === "ios" && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            opacity: blurAnim,
          }}
        >
          <BlurView intensity={50} tint="default" style={{ flex: 1 }} />
        </Animated.View>
      )}
    </>
  );
}

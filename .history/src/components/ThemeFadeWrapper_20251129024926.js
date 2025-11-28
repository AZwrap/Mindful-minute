import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Easing } from "react-native";
import { useTheme } from "../stores/themeStore";
import { useColorScheme } from "react-native";
import { BlurView } from "expo-blur";

export default function ThemeFadeWrapper({ children }) {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();

  const theme = getCurrentTheme(system);
  const [prevTheme, setPrevTheme] = useState(theme);

  // MULTI-LAYER ANIMATIONS (ULTRA)
  const bgFade = useRef(new Animated.Value(1)).current;    
  const uiFade = useRef(new Animated.Value(1)).current;    
  const blurAnim = useRef(new Animated.Value(0)).current;  

  useEffect(() => {
    if (theme === prevTheme) return;

    // Reset before animation
    bgFade.setValue(0);
    uiFade.setValue(0);
    blurAnim.setValue(1);

    Animated.parallel([
      Animated.timing(bgFade, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(uiFade, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.timing(blurAnim, {
        toValue: 0,
        duration: 650,
        easing: Easing.inOut(Easing.quad),
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
        <Animated.View style={{ flex: 1, opacity: uiFade }}>
          {children(theme)}
        </Animated.View>
      </Animated.View>

      {/* BLUR FADE (iOS only) */}
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

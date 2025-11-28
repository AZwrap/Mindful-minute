import React, { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { useTheme } from "../stores/themeStore";
import { useColorScheme } from "react-native";

export default function ThemeFadeWrapper({ children }) {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const theme = getCurrentTheme(system);

  const fade = useRef(new Animated.Value(1)).current;
  const [prevTheme, setPrevTheme] = useState(theme);

  useEffect(() => {
    if (theme === prevTheme) return;

    fade.setValue(0);

    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start(() => {
      setPrevTheme(theme);
    });
  }, [theme]);

  return (
    <>
      {/* OLD THEME LAYER (fades out) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          opacity: fade.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        }}
      >
        {children(prevTheme)}
      </Animated.View>

      {/* NEW THEME LAYER (visible) */}
      <Animated.View
  style={{
    flex: 1,
    opacity: fadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1],  // never transparent
    }),
  }}
>

        {children(theme)}
      </Animated.View>
    </>
  );
}

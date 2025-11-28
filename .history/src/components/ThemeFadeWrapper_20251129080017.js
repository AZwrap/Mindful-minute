import React, { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
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
  <View
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 99999,      // <-- CRITICAL FIX
      elevation: 99999,   // <-- ANDROID FIX
      pointerEvents: "none",
    }}
  >
    {/* OLD THEME LAYER */}
    <Animated.View
      style={{
        position: "absolute",
        inset: 0,
        opacity: fade.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1],
        }),
      }}
    >
      {children(prevTheme)}
    </Animated.View>

    {/* NEW THEME LAYER */}
    <Animated.View
      style={{
        position: "absolute",
        inset: 0,
        opacity: fade.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1],
        }),
      }}
    >
      {children(theme)}
    </Animated.View>
  </View>
);

}

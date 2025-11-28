import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export default function ThemeFadeWrapper({ children, theme, prevTheme }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false, // we animate backgroundColor
    }).start();
  }, [theme]);

  return (
    <View style={{ flex: 1 }}>
      {/* BACKGROUND CROSSFADE */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: fade.interpolate({
            inputRange: [0, 1],
            outputRange: [prevTheme.bg, theme.bg], // fade between colors
          }),
          zIndex: -1,
        }}
      />

      {/* Your real app content stays UP TOP */}
      {children}
    </View>
  );
}

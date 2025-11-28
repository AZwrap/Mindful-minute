import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export default function ThemeFadeWrapper({ children, theme }) {
  const fade = useRef(new Animated.Value(1)).current;

  // keep previous theme to crossfade
  const prevTheme = useRef(theme).current;

  useEffect(() => {
    fade.setValue(0);

    Animated.timing(fade, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      prevTheme.current = theme;
    });
  }, [theme]);

  return (
    <>
      {/* THEME OVERLAY ABOVE EVERYTHING */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 99999,
          elevation: 99999,
        }}
      >
        {/* old theme */}
        <Animated.View
          style={{
            position: "absolute",
            inset: 0,
            opacity: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1], // always fully visible
            }),
          }}
        >
          {children(prevTheme.current)}
        </Animated.View>

        {/* new theme */}
        <Animated.View
          style={{
            position: "absolute",
            inset: 0,
            opacity: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1], // fade in
            }),
          }}
        >
          {children(theme)}
        </Animated.View>
      </View>

      {/* REAL APP CONTENT BELOW THE OVERLAY */}
      <View style={{ flex: 1 }}>
        {children(theme)}
      </View>
    </>
  );
}

import React, { useEffect } from "react";
import { Platform, Animated, Easing } from "react-native";
import * as QuickActions from "expo-quick-actions";

import { NavigationContainer } from "@react-navigation/native";
import RootStack from "./src/navigation/RootStack";
import { navigationRef } from "./src/navigation/RootNavigation";

import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useTheme } from "./src/stores/themeStore";

export default function App() {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(system);
  const isDark = currentTheme === "dark";

  // fade animation
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [currentTheme]);

  // QuickActions safe setup
  useEffect(() => {
    if (!QuickActions.setShortcutItems) return;

    QuickActions.setShortcutItems([
      {
        id: "new_entry",
        title: "New Entry",
        subtitle: "Write now",
        icon: "ic_shortcut_edit",
      },
    ]);

    const sub = QuickActions.addShortcutListener((item) => {
      if (item.id === "new_entry") navigationRef.navigate("Write");
    });

    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <NavigationContainer ref={navigationRef}>
          <RootStack />
        </NavigationContainer>
      </Animated.View>
    </SafeAreaProvider>
  );
}

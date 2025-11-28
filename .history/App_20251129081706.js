import React, { useEffect } from "react";
import { Animated, Easing, Platform } from "react-native";
import * as QuickActions from "expo-quick-actions";

import { NavigationContainer } from "@react-navigation/native";
import RootStack from "./src/navigation/RootStack";
import { navigationRef } from "./src/navigation/RootNavigation";

import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useTheme } from "./src/stores/themeStore";
import AnimatedNavigator from "./src/navigation/AnimatedNavigator";

import ThemeFadeWrapper from "./src/components/ThemeFadeWrapper";

export default function App() {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(system);

  // REMOVE your old fade — ThemeFadeWrapper handles this
  // const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // Quick Actions
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
    <NavigationContainer ref={navigationRef}>
      <ThemeFadeWrapper>
        <RootStack />
      </ThemeFadeWrapper>
      <StatusBar style="light" />
    </NavigationContainer>
  );
}

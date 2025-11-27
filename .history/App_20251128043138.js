import React, { useEffect } from "react";
import { Platform } from "react-native";
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

useEffect(() => {
  if (!QuickActions.setShortcutItems) {
    console.log("QuickActions is NOT available");
    return;
  }

  QuickActions.setShortcutItems([
    {
      id: "new_entry",
      title: "New Entry",
      subtitle: "Write now",
      icon: "ic_shortcut_edit", // Android name
    },
  ]);

  const sub = QuickActions.addShortcutListener((item) => {
    console.log("Shortcut tapped:", item);

    if (item.id === "new_entry") {
      navigationRef.navigate("Write");
    }
  });

  return () => sub.remove();
}, []);


  return (
    <SafeAreaProvider>
          <StatusBar style={isDark ? "light" : "dark"} />

      <NavigationContainer ref={navigationRef}>
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

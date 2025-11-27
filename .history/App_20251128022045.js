// App.js
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

const system = useColorScheme();
const { getCurrentTheme } = useTheme();
const currentTheme = getCurrentTheme(system);
const isDark = currentTheme === "dark";

export default function App() {
  useEffect(() => {
    // QuickActions NOT supported in Expo Go → avoid crashing
    const HAS_QA =
      Platform.OS === "android" &&
      typeof QuickActions?.setShortcutItems === "function";

    if (!HAS_QA) {
      console.log("QuickActions unavailable (Expo Go or missing native build).");
      return;
    }

    // Register shortcut
    QuickActions.setShortcutItems([
      {
        id: "new_entry",
        title: "New Entry",
        subtitle: "Start writing",
        icon: "compose",
      },
    ]);

    // Listen for shortcut taps
    const sub = QuickActions.addShortcutListener((shortcut) => {
      console.log("Shortcut pressed:", shortcut);

      if (shortcut?.id === "new_entry") {
        navigationRef.current?.navigate("Write");
      }
    });

    return () => sub?.remove?.();
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

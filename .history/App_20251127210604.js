// App.js
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootStack from "./src/navigation/RootStack";
import { navigationRef } from "./src/navigation/RootNavigation";
import { ThemeProvider } from "./src/stores/themeStore";
import { EntriesProvider } from "./src/stores/entriesStore";
import { SettingsProvider } from "./src/stores/settingsStore";
import { ProgressProvider } from "./src/stores/progressStore";
import { QuickActions } from "expo-quick-actions";

export default function App() {
  // --- QUICK ACTIONS SETUP ---
  useEffect(() => {
    // 1. Register quick actions
    QuickActions.setItems([
      {
        id: "new_entry",
        title: "New Entry",
        subtitle: "Start writing",
        icon: "compose",
      },
      {
        id: "gratitude",
        title: "Gratitude Entry",
        subtitle: "Write 3 things you're grateful for",
        icon: "heart",
      },
    ]);

    // 2. Handle action selection
    const sub = QuickActions.addListener((item) => {
      if (!item) return;

      // NEW DAILY ENTRY
      if (item.id === "new_entry") {
        navigationRef.current?.navigate("Write", {
          date: new Date().toISOString(),
          prompt: null,
        });
      }

      // GRATITUDE ENTRY
      if (item.id === "gratitude") {
        navigationRef.current?.navigate("Write", {
          date: new Date().toISOString(),
          prompt: {
            text: "What are 3 things you're grateful for today?",
          },
        });
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <EntriesProvider>
      <ProgressProvider>
        <SettingsProvider>
          <ThemeProvider>
            <NavigationContainer ref={navigationRef}>
              <RootStack />
              <StatusBar style="auto" />
            </NavigationContainer>
          </ThemeProvider>
        </SettingsProvider>
      </ProgressProvider>
    </EntriesProvider>
  );
}

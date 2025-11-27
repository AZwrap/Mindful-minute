// App.js
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootStack from "./src/navigation/RootStack";
import { navigationRef } from "./src/navigation/RootNavigation";
import * as QuickActions from "expo-quick-actions";

export default function App() {
  useEffect(() => {
    // ===== REGISTER SHORTCUTS (ANDROID ONLY) =====
    try {
      QuickActions.setShortcutItems([
        {
          id: "new_entry",
          title: "New Entry",
          subtitle: "Start writing",
          icon: "compose", // Android icon from system
        },
      ]);

      console.log("Quick actions registered.");
    } catch (err) {
      console.log("QuickActions error:", err);
    }

    // ===== LISTENER =====
    const subscription = QuickActions.addShortcutListener((shortcut) => {
      console.log("Shortcut pressed:", shortcut);

      if (shortcut.id === "new_entry") {
        navigationRef.current?.navigate("Write");
      }
    });

    return () => subscription.remove?.();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack />
    </NavigationContainer>
  );
}

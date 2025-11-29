import 'react-native-get-random-values';
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as QuickActions from "expo-quick-actions";

import RootStack from "./src/navigation/RootStack";
import { navigationRef } from "./src/navigation/RootNavigation";
import { useColorScheme } from "react-native";
import { useTheme } from "./src/stores/themeStore";

import ThemeFadeWrapper from "./src/components/ThemeFadeWrapper";

import { Linking } from "react-native";
import { joinSharedJournal } from "./src/services/syncedJournalService";
import 'react-native-get-random-values';


export default function App() {
const system = useColorScheme();
const { getCurrentTheme } = useTheme();
const theme = getCurrentTheme(system);

const handleDeepLink = ({ url }) => {
  try {
    joinSharedJournal(url);
  } catch (e) {
    console.log("Deep link error:", e);
  }
};

useEffect(() => {
  const handleUrl = async ({ url }) => {
    if (url.includes("invite/journal/")) {
      const journalId = url.split("invite/journal/")[1];
      try {
        const joined = await joinSharedJournal(journalId);
        console.log("Joined shared journal:", joined.title);
      } catch (e) {
        console.log("Failed to join", e);
      }
    }
  };

  const sub = Linking.addEventListener("url", handleDeepLink);

  return () => {
  sub.remove();
};
}, []);


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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <ThemeFadeWrapper>
          <RootStack />
        </ThemeFadeWrapper>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

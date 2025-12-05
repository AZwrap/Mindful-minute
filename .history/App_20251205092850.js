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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SecurityGate from './src/components/SecurityGate';
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import './src/utils/ignoreWarnings';
import * as Notifications from 'expo-notifications'; // <--- Import this

// 🟢 Configure how notifications behave when the app is OPEN
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // <--- Changed to FALSE: No pop-up if app is open
    shouldPlaySound: false, // <--- Optional: Set to true if you still want the "Ding" sound
    shouldSetBadge: false,
  }),
});

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
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
<NavigationContainer ref={navigationRef}>
          <ThemeFadeWrapper>
            <ErrorBoundary>  {/* <--- ADD THIS WRAPPER */}
              <SecurityGate> 
                 <RootStack />
                 <StatusBar style={theme === "dark" ? "light" : "dark"} />
              </SecurityGate>
            </ErrorBoundary> {/* <--- CLOSE IT HERE */}
          </ThemeFadeWrapper>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

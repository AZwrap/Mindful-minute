import 'react-native-get-random-values';
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as QuickActions from "expo-quick-actions";
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, Linking } from "react-native";
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Navigation & Stores
import RootStack from "./src/navigation/RootStack";
import { navigationRef } from "./src/navigation/RootNavigation";
import { useTheme } from "./src/stores/themeStore";
import { useSettings } from "./src/stores/settingsStore";

// Components & Services
import ThemeFadeWrapper from "./src/components/ThemeFadeWrapper";
import SecurityGate from './src/components/SecurityGate';
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { joinSharedJournal } from "./src/services/syncedJournalService";
import './src/utils/ignoreWarnings';
import * as Notifications from 'expo-notifications';
import { scheduleDailyReminder, cancelDailyReminders, registerForPushNotificationsAsync } from "./src/lib/notifications";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(console.warn);

export default function App() {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const theme = getCurrentTheme(system);
  const settingsLoaded = useSettings((s) => s.loaded);
  const smartRemindersEnabled = useSettings((s) => s.smartRemindersEnabled);

  // 1. Hide splash screen only when settings are loaded
  useEffect(() => {
    if (settingsLoaded) {
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 500); 
    }
  }, [settingsLoaded]);

  // 2. Handle Deep Links (Cold Start + Background)
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      if (url && url.includes("invite")) {
        try {
          joinSharedJournal(url);
        } catch (e) {
          console.log("Deep link error:", e);
        }
      }
    };

    // Check if app was opened via link (Cold Start)
    const checkInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleDeepLink({ url: initialUrl });
        }
      } catch (e) {
        console.error("Initial URL Error:", e);
      }
    };
    checkInitialUrl();

    // Listen for new links while app is open
    const sub = Linking.addEventListener("url", handleDeepLink);
    return () => sub.remove();
  }, []);

  // 3. Quick Actions
  useEffect(() => {
    if (!QuickActions.setShortcutItems) return;

    QuickActions.setShortcutItems([
      {
        id: "new_entry",
        title: "New Entry",
        subtitle: "Write now",
        icon: "ic_shortcut_edit",
        params: { href: "/Write" }, // Added for TS compatibility if needed
      },
    ]);

    const sub = QuickActions.addShortcutListener((item) => {
      if (item.id === "new_entry") navigationRef.navigate("Write" as any);
    });

    return () => sub.remove();
  }, []);

  // 4. Notifications (Schedule & Tap Handler)
  useEffect(() => {
    // A. Handle "Tap to Open"
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      // Navigate to Write screen with a default prompt
      navigationRef.navigate("Write" as any, {
        date: new Date().toISOString().split('T')[0],
        prompt: { text: "Time for your daily mindful minute.", isSmart: false }
      });
    });

    // B. Manage Schedule based on Settings
    const manageSchedule = async () => {
      if (smartRemindersEnabled) {
        // Ensure we have permissions
        const token = await registerForPushNotificationsAsync();
        if (token !== undefined) {
          // Schedule for 8:00 PM (20:00)
          await scheduleDailyReminder(20, 0);
        }
      } else {
        await cancelDailyReminders();
      }
    };

    if (settingsLoaded) {
      manageSchedule();
    }

    return () => subscription.remove();
  }, [smartRemindersEnabled, settingsLoaded]);

  // Don't render the app structure until settings are ready
  if (!settingsLoaded) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>
          <ThemeFadeWrapper>
            <ErrorBoundary>
              <SecurityGate> 
                 <RootStack />
                 <StatusBar style={theme === "dark" ? "light" : "dark"} />
              </SecurityGate>
            </ErrorBoundary>
          </ThemeFadeWrapper>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
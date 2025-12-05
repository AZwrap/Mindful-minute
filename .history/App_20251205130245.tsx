import 'react-native-get-random-values'; // Import this ONCE at the very top
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as QuickActions from "expo-quick-actions";

import RootStack from "./src/navigation/RootStack";
import { navigationRef } from "./src/navigation/RootNavigation";
import { useColorScheme, Linking } from "react-native";
import { useTheme } from "./src/stores/themeStore";

import ThemeFadeWrapper from "./src/components/ThemeFadeWrapper";
import { joinSharedJournal } from "./src/services/syncedJournalService";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SecurityGate from './src/components/SecurityGate';
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import './src/utils/ignoreWarnings';

SplashScreen.preventAutoHideAsync().catch(console.warn);

export default function App() {
const system = useColorScheme();
const { getCurrentTheme } = useTheme();
const theme = getCurrentTheme(system);

const settingsLoaded = useSettings((s) => s.loaded);
  
  // Hide splash screen only when settings are loaded
  useEffect(() => {
    if (settingsLoaded) {
      // Add a small delay for a smoother visual transition (optional)
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 500); 
    }
  }, [settingsLoaded]);

  // Don't render the app structure until settings are ready
  if (!settingsLoaded) return null;

// Handle Deep Links (Both Cold Start & Background)
  useEffect(() => {
const handleDeepLink = ({ url }) => {
    if (url && url.includes("invite")) {
      try {
        joinSharedJournal(url);
      } catch (e) {
        console.log("Deep link error:", e);
      }
    }
  };

    // 1. Check if app was opened via link (Cold Start)
// Handle Deep Links (Cold Start + Background)
  useEffect(() => {
    // 1. Cold Start: App opened from closed state via link
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

// 2. Listener: App opened from background
    const sub = Linking.addEventListener("url", handleDeepLink);
    return () => sub.remove();
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
},

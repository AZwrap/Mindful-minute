import 'react-native-get-random-values';
import React, { useEffect } from "react"; // Add useEffect
import * as Notifications from 'expo-notifications'; // Add Notifications
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Navigation & Logic
import RootStack from "./src/navigation/RootStack";
import { navigationRef } from "./src/navigation/RootNavigation";
import { useAppInitialization } from "./src/hooks/useAppInitialization";

// Components
import ThemeFadeWrapper from "./src/components/ThemeFadeWrapper";
import SecurityGate from './src/components/SecurityGate';
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import GlobalAlert from "./src/components/GlobalAlert";
import './src/utils/ignoreWarnings';

export default function App() {
  const { isReady, theme, linking } = useAppInitialization();

  // Listen for notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Check if the notification contains a journalId and navigate
if (data?.journalId && navigationRef.current) {
        // Reset stack to ensure a clean back history (Home -> Groups -> Journal)
        // This prevents going back to unrelated screens like 'Write'
        (navigationRef.current as any).reset({
          index: 2,
          routes: [
            { name: 'MainTabs' },
            { name: 'JournalList' },
            { name: 'SharedJournal', params: { journalId: data.journalId } },
          ],
        });
      }
    });

    return () => subscription.remove();
  }, []);

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef} linking={linking}>
          <ThemeFadeWrapper>
<ErrorBoundary>
              <SecurityGate> 
                 <RootStack />
                 <GlobalAlert />
                 <StatusBar style={theme === "dark" ? "light" : "dark"} />
              </SecurityGate>
            </ErrorBoundary>
          </ThemeFadeWrapper>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
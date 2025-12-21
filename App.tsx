import 'react-native-get-random-values';
import React, { useEffect } from "react"; // Add useEffect
import * as Notifications from 'expo-notifications'; // Add Notifications
import { auth } from './src/firebaseConfig'; // <--- Added
import { useJournalStore } from './src/stores/journalStore'; // <--- Added
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';

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
  const [currentRouteName, setCurrentRouteName] = React.useState<string | undefined>();

  // SAFETY: Reset store immediately when user logs out to stop "Permission Denied" errors
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        useJournalStore.getState().reset();
      }
    });
    return unsubscribe;
  }, []);

// Listen for notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // 1. Handle Home Navigation (Daily Reminders)
      if (data?.screen === 'Home' && navigationRef.isReady()) {
        navigationRef.navigate('MainTabs' as any);
        return;
      }

      // 2. Handle Journal Navigation
if (data?.journalId && navigationRef.isReady()) {
        navigationRef.navigate('MainTabs', {
          screen: 'Today',
          params: {
            screen: 'SharedJournal',
            params: { journalId: data.journalId }
          }
        } as any);
      }
    });

    return () => subscription.remove();
  }, []);

  if (!isReady) return null;

  return (
<SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer 
          ref={navigationRef} 
          linking={linking}
          onReady={() => setCurrentRouteName(navigationRef.current?.getCurrentRoute()?.name)}
          onStateChange={() => setCurrentRouteName(navigationRef.current?.getCurrentRoute()?.name)}
        >
          <ThemeFadeWrapper>
<ErrorBoundary>
<SecurityGate> 
                 <RootStack />
                 <GlobalAlert />
                 
                 {/* DEV HEADER: Shows current screen name */}
                 {currentRouteName && (
                   <View style={{ position: 'absolute', top: 50, alignSelf: 'center', zIndex: 9999, pointerEvents: 'none' }}>
                     <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: '#00ff00', fontSize: 10, fontWeight: 'bold' }}>
                          DEV: {currentRouteName}
                        </Text>
                     </View>
                   </View>
                 )}

                 <StatusBar style={theme === "dark" ? "light" : "dark"} />
              </SecurityGate>
            </ErrorBoundary>
          </ThemeFadeWrapper>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
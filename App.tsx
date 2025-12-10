import 'react-native-get-random-values';
import React from "react";
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
import './src/utils/ignoreWarnings';

export default function App() {
  const { isReady, theme, linking } = useAppInitialization();

  if (!isReady) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef} linking={linking}>
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
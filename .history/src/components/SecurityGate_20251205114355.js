import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettings } from '../stores/settingsStore';
import { Lock } from 'lucide-react-native';
import PremiumPressable from './PremiumPressable';
import { useSharedPalette } from '../hooks/useSharedPalette';

export default function SecurityGate({ children }) {
  const isBiometricsEnabled = useSettings((s) => s.isBiometricsEnabled);
  const loaded = useSettings((s) => s.loaded);
  
  // Default to LOCKED to prevent content flashing before settings load
  const [isLocked, setIsLocked] = useState(true); 
  const appState = useRef(AppState.currentState);
  const isAuthenticating = useRef(false); // Prevents infinite loop on Android
  const palette = useSharedPalette();

  // 1. Handle Initial Load & Hydration
  useEffect(() => {
    if (!loaded) return; // Wait for storage

    if (!isBiometricsEnabled) {
      setIsLocked(false);
      return;
    }

    // If enabled, ensure we start locked
    setIsLocked(true);
    authenticate();
  }, [loaded, isBiometricsEnabled]);

  // 2. Handle Background/Foreground Transitions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Only lock if enabled AND we aren't currently showing the prompt
        // (Fixes Android issue where prompt itself causes app to go background)
        if (isBiometricsEnabled && !isAuthenticating.current) {
          setIsLocked(true);
          authenticate();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isBiometricsEnabled]);

  const authenticate = async () => {
    if (isAuthenticating.current) return;
    isAuthenticating.current = true;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setIsLocked(false); // Fallback
        isAuthenticating.current = false;
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Mindful Minute',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
      }
    } catch (error) {
      console.log('Auth error', error);
    } finally {
      // Delay resetting ref to let AppState settle (crucial for Android)
      setTimeout(() => {
        isAuthenticating.current = false;
      }, 500);
    }
  };

  // Prevent rendering anything until settings are loaded
  if (!loaded) return null;

  if (isBiometricsEnabled && isLocked) {
    return (
      <View style={[styles.container, { backgroundColor: palette.bg }]}>
        <View style={styles.iconContainer}>
          <Lock size={64} color={palette.accent} />
        </View>
        <Text style={[styles.title, { color: palette.text }]}>Journal Locked</Text>
        <Text style={[styles.subtitle, { color: palette.subtleText }]}>
          Your thoughts are private.
        </Text>
        
        <PremiumPressable
          onPress={authenticate}
          style={[styles.button, { backgroundColor: palette.accent }]}
          haptic="medium"
        >
          <Text style={[styles.buttonText, { color: palette.accentText }]}>
            Unlock
          </Text>
        </PremiumPressable>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 16,
  },
});
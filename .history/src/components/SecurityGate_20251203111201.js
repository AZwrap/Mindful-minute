import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettings } from '../stores/settingsStore';
import { Lock } from 'lucide-react-native';
import PremiumPressable from './PremiumPressable';
import { useSharedPalette } from '../hooks/useSharedPalette';

export default function SecurityGate({ children }) {
  const isBiometricsEnabled = useSettings(s => s.isBiometricsEnabled);
  const [isLocked, setIsLocked] = useState(isBiometricsEnabled);
  const appState = useRef(AppState.currentState);
  const palette = useSharedPalette();

  useEffect(() => {
    // If feature is turned off, ensure we are unlocked
    if (!isBiometricsEnabled) {
      setIsLocked(false);
      return;
    }

    // If feature is turned ON, lock immediately on mount
    setIsLocked(true);
    authenticate();

    // Listen for background/foreground changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Coming from background -> LOCK
        setIsLocked(true);
        authenticate();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isBiometricsEnabled]);

  const authenticate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setIsLocked(false); // Fallback if no hardware
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
    }
  };

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
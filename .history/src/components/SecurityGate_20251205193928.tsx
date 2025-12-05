import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Lock } from 'lucide-react-native';

import { useSettings } from '../stores/settingsStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import PremiumPressable from './PremiumPressable';

interface SecurityGateProps {
  children: React.ReactNode;
}

export default function SecurityGate({ children }: SecurityGateProps) {
  const isBiometricsEnabled = useSettings((s) => s.isBiometricsEnabled);
  const loaded = useSettings((s) => s.loaded);
  
  const [isLocked, setIsLocked] = useState(true); 
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isAuthenticating = useRef(false); 
  const palette = useSharedPalette();

  // 1. Initial Load
  useEffect(() => {
    if (!loaded) return;

    if (!isBiometricsEnabled) {
      setIsLocked(false);
      return;
    }

    setIsLocked(true);
    authenticate();
  }, [loaded, isBiometricsEnabled]);

  // 2. Background Listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
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
        setIsLocked(false); 
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
      setTimeout(() => {
        isAuthenticating.current = false;
      }, 500);
    }
  };

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

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 30,
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
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
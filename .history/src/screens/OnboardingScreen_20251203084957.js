import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../stores/settingsStore';
import PremiumPressable from '../components/PremiumPressable';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const setHasOnboarded = useSettings((s) => s.setHasOnboarded);

  const handleStart = () => {
    setHasOnboarded(true);
    // We replace the history so the user can't "go back" to onboarding
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <LinearGradient
      colors={['#4F46E5', '#0F172A']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>🧘</Text>
        <Text style={styles.title}>Mindful Minute</Text>
        <Text style={styles.subtitle}>
          Pause. Breathe. Reflect.
        </Text>
        
        <View style={styles.featureList}>
          <Text style={styles.feature}>✨ AI-Powered Writing Coach</Text>
          <Text style={styles.feature}>🌙 Dynamic Sunrise/Sunset Themes</Text>
          <Text style={styles.feature}>📊 Deep Mood Analytics</Text>
          <Text style={styles.feature}>🔒 Private & Secure on Device</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PremiumPressable
          onPress={handleStart}
          haptic="medium"
          style={styles.button}
        >
          <Text style={styles.buttonText}>Begin Journey</Text>
        </PremiumPressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 32 
  },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { 
    fontSize: 36, 
    fontWeight: '800', 
    color: 'white', 
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#A5B4FC',
    marginBottom: 48,
    textAlign: 'center',
  },
  featureList: { gap: 16 },
  feature: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  footer: {
    padding: 32,
    paddingBottom: 60,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 20,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    color: '#4F46E5',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
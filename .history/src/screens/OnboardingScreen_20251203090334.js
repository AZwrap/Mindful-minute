import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../stores/settingsStore';
import PremiumPressable from '../components/PremiumPressable';
import { Brain, PenTool, Moon, BarChart2, Shield } from 'lucide-react-native';

export default function OnboardingScreen({ navigation }) {
  const setHasOnboarded = useSettings((s) => s.setHasOnboarded);

  const handleStart = () => {
    setHasOnboarded(true);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const FeatureItem = ({ icon: Icon, text }) => (
    <View style={styles.featureRow}>
      <View style={styles.iconBg}>
        <Icon size={20} color="white" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#4F46E5', '#0F172A']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Main Hero Icon */}
        <View style={styles.heroIconContainer}>
          <Brain size={64} color="white" />
        </View>
        
        <Text style={styles.title}>Mindful Minute</Text>
        <Text style={styles.subtitle}>
          Pause. Breathe. Reflect.
        </Text>
        
        <View style={styles.divider} />

        <View style={styles.featureList}>
          <FeatureItem icon={PenTool} text="AI-Powered Writing Coach" />
          <FeatureItem icon={Moon} text="Dynamic Sunrise/Sunset Themes" />
          <FeatureItem icon={BarChart2} text="Deep Mood Analytics" />
          <FeatureItem icon={Shield} text="Private & Secure on Device" />
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
  heroIconContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 30,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: 'white', 
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A5B4FC',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: 32,
  },
  featureList: { 
    gap: 20, 
    width: '100%',
    maxWidth: 320,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBg: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    borderRadius: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#E2E8F0',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footer: {
    padding: 32,
    paddingBottom: 60,
    width: '100%',
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
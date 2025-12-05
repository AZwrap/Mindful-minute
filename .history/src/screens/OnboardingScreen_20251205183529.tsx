import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useSettings } from '../stores/settingsStore';
import PremiumPressable from '../components/PremiumPressable';
import { RootStackParamList } from '../navigation/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const FEATURES = [
  { id: 1, icon: 'edit-3', title: 'Daily Reflection', desc: 'Capture your thoughts with guided prompts every day.' },
  { id: 2, icon: 'bar-chart-2', title: 'Track Insights', desc: 'Visualize your mood trends and writing habits over time.' },
  { id: 3, icon: 'lock', title: 'Secure & Private', desc: 'Your journal is locked with biometrics and stored safely.' },
];

export default function OnboardingScreen({ navigation }: Props) {
  const setHasOnboarded = useSettings((s) => s.setHasOnboarded);
  const fadeAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animations = FEATURES.map((_, i) =>
      Animated.timing(fadeAnims[i], {
        toValue: 1,
        duration: 600,
        delay: i * 300,
        useNativeDriver: true,
      })
    );
    
    Animated.sequence([
      Animated.stagger(200, animations),
      Animated.timing(buttonFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleStart = () => {
    setHasOnboarded(true);
    navigation.replace('MainTabs');
  };

  return (
    <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={styles.container}>
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Feather name="book-open" size={40} color="#6366F1" />
          </View>
          <Text style={styles.title}>Mindful Minute</Text>
          <Text style={styles.subtitle}>Your space for clarity and growth.</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((item, index) => (
            <Animated.View 
              key={item.id} 
              style={[styles.featureItem, { opacity: fadeAnims[index], transform: [{ translateY: fadeAnims[index].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}
            >
              <View style={styles.iconBox}>
                <Feather name={item.icon as any} size={24} color="#6366F1" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <Animated.View style={[styles.footer, { opacity: buttonFade }]}>
          <PremiumPressable onPress={handleStart} style={styles.button} haptic="medium">
            <Text style={styles.buttonText}>Get Started</Text>
            <Feather name="arrow-right" size={20} color="white" />
          </PremiumPressable>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 32, justifyContent: 'space-between' },
  header: { alignItems: 'center', marginTop: 40 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366F1', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
    marginBottom: 24,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#64748B', textAlign: 'center' },
  features: { gap: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconBox: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  featureDesc: { fontSize: 14, color: '#64748B', lineHeight: 20 },
  footer: { marginBottom: 20 },
  button: {
    backgroundColor: '#6366F1', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 20, gap: 8,
    shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: '700' },
});
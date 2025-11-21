// src/screens/HomeScreen.js - Sophisticated Version
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEntries } from '../stores/entriesStore';
import { useProgress } from '../stores/progressStore';
import { useSettings } from '../stores/settingsStore';
import { useTheme } from '../stores/themeStore';
import PremiumPressable from '../components/PremiumPressable';
import { generateSmartPrompt, analyzeForSmartPrompts, getPromptExplanation } from '../utils/smartPrompts';

export default function HomeScreen({ navigation }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  // Get entries for analysis
  const map = useEntries((s) => s.map);
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

  // Get settings and progress
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const streak = useProgress((s) => s.streak);
  const level = useProgress((s) => s.level);
  const totalXP = useProgress((s) => s.totalXP);

  // Check for today's draft
  const today = new Date().toISOString().split('T')[0];
  const getDraft = useEntries((s) => s.getDraft);
  const hasDraft = !!getDraft(today);

  // State for today's prompt
  const [todayPrompt, setTodayPrompt] = useState(() => {
    const defaultPrompts = [
      "What's one small thing you're grateful for today?",
      "What did you learn about yourself today?",
      "What's present for you right now?",
      "Name a tension in your body and breathe into it...",
      "What surprised you—in a good way?"
    ];
    return {
      text: defaultPrompts[new Date().getDate() % defaultPrompts.length],
      isSmart: false
    };
  });

  // Generate smart prompt on component mount
  useEffect(() => {
    if (entries.length >= 3) {
      const userData = analyzeForSmartPrompts(entries);
      const newPrompt = generateSmartPrompt(userData);
      const explanation = getPromptExplanation(newPrompt, userData);
      
      setTodayPrompt({
        text: newPrompt,
        explanation: explanation,
        isSmart: true
      });
    }
  }, [entries]);

  // Generate new smart prompt
  const handleNewSmartPrompt = () => {
    if (entries.length >= 3) {
      const userData = analyzeForSmartPrompts(entries);
      const newPrompt = generateSmartPrompt(userData);
      const explanation = getPromptExplanation(newPrompt, userData);
      
      setTodayPrompt({
        text: newPrompt,
        explanation: explanation,
        isSmart: true
      });

      if (hapticsEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      Alert.alert(
        "More Data Needed",
        "Write a few more entries to unlock personalized prompts",
        [{ text: "OK" }]
      );
    }
  };

  // Navigation functions
  const navigateToWrite = () => {
    navigation.navigate('Write', {
      date: today,
      prompt: todayPrompt
    });
  };

  const navigateToHistory = () => navigation.navigate('History');
  const navigateToStats = () => navigation.navigate('Stats');
  const navigateToAchievements = () => navigation.navigate('Achievements');

  // Gradients
  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B', '#334155'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
    },
  };

  const currentGradient = gradients[currentTheme] || gradients.light;
  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';
  const borderColor = isDark ? '#374151' : '#E5E7EB';

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        {/* Minimal Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.appName, { color: textMain }]}>
              Mindful Minute
            </Text>
            <Text style={[styles.date, { color: textSub }]}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          
          {/* Minimal Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#6366F1' }]}>{streak}</Text>
              <Text style={[styles.statLabel, { color: textSub }]}>Streak</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#6366F1' }]}>{level}</Text>
              <Text style={[styles.statLabel, { color: textSub }]}>Level</Text>
            </View>
          </View>
        </View>

        {/* Today's Reflection Section */}
        <View style={styles.reflectionSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textMain }]}>
              Today's Reflection
            </Text>
            {todayPrompt.isSmart && (
              <Text style={[styles.smartIndicator, { color: '#6366F1' }]}>
                Personalized
              </Text>
            )}
          </View>
          
          <View style={[styles.promptCard, { 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(226, 232, 240, 0.8)'
          }]}>
            <Text style={[styles.promptText, { color: textMain }]}>
              {todayPrompt.text}
            </Text>
            {todayPrompt.explanation && (
              <Text style={[styles.promptSubtitle, { color: textSub }]}>
                {todayPrompt.explanation}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <PremiumPressable
              onPress={handleNewSmartPrompt}
              haptic="light"
              style={[
                styles.secondaryButton,
                { 
                  backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
                }
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: '#6366F1' }]}>
                New Prompt
              </Text>
            </PremiumPressable>

            <PremiumPressable
              onPress={navigateToWrite}
              haptic="medium"
              style={[styles.primaryButton, { backgroundColor: '#6366F1' }]}
            >
              <Text style={[styles.primaryButtonText, { color: 'white' }]}>
                {hasDraft ? 'Continue Reflection' : 'Begin Reflection'}
              </Text>
            </PremiumPressable>
          </View>
        </View>

        {/* Navigation Section */}
        <View style={styles.navigationSection}>
          <Text style={[styles.sectionTitle, { color: textMain, marginBottom: 16 }]}>
            Insights
          </Text>
          <View style={styles.navGrid}>
            <PremiumPressable
              onPress={navigateToHistory}
              haptic="light"
              style={[
                styles.navCard,
                { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)' }
              ]}
            >
              <View style={styles.navContent}>
                <Text style={[styles.navTitle, { color: textMain }]}>History</Text>
                <Text style={[styles.navDescription, { color: textSub }]}>
                  Past reflections
                </Text>
              </View>
            </PremiumPressable>

            <PremiumPressable
              onPress={navigateToStats}
              haptic="light"
              style={[
                styles.navCard,
                { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)' }
              ]}
            >
              <View style={styles.navContent}>
                <Text style={[styles.navTitle, { color: textMain }]}>Analytics</Text>
                <Text style={[styles.navDescription, { color: textSub }]}>
                  Patterns & trends
                </Text>
              </View>
            </PremiumPressable>

            <PremiumPressable
              onPress={navigateToAchievements}
              haptic="light"
              style={[
                styles.navCard,
                { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)' }
              ]}
            >
              <View style={styles.navContent}>
                <Text style={[styles.navTitle, { color: textMain }]}>Progress</Text>
                <Text style={[styles.navDescription, { color: textSub }]}>
                  Milestones & goals
                </Text>
              </View>
            </PremiumPressable>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingTop: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  date: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    opacity: 0.5,
  },
  reflectionSection: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  smartIndicator: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  promptText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
    marginBottom: 8,
  },
  promptSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navigationSection: {
    flex: 1,
  },
  navGrid: {
    gap: 12,
  },
  navCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  navContent: {
    gap: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  navDescription: {
    fontSize: 13,
    opacity: 0.8,
  },
});
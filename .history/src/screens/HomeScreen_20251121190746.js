// src/screens/HomeScreen.js
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

  // State for today's prompt (smart or default)
  const [todayPrompt, setTodayPrompt] = useState(() => {
    const defaultPrompts = [
      "What's one small thing you're grateful for today?",
      "What did you learn about yourself today?",
      "What's present for you right now?",
      "Name a tension in your body and breathe into it...",
      "What surprised you—in a good way?",
      "What moment from today will you remember?",
      "How did you care for yourself today?",
      "What made you feel alive today?",
      "What are you looking forward to?",
      "What challenged you today?"
    ];
    return {
      text: defaultPrompts[new Date().getDate() % defaultPrompts.length],
      isSmart: false
    };
  });

  // Generate smart prompt on component mount if we have enough data
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
      // Not enough data for smart prompts
      Alert.alert(
        "More Data Needed",
        "Write a few more entries to unlock personalized smart prompts!",
        [{ text: "OK" }]
      );
    }
  };

  // Navigate to WriteScreen with the current prompt
  const navigateToWrite = () => {
    navigation.navigate('Write', {
      date: today,
      prompt: todayPrompt
    });
  };

  // Navigate to other screens
  const navigateToHistory = () => navigation.navigate('History');
  const navigateToStats = () => navigation.navigate('Stats');
  const navigateToAchievements = () => navigation.navigate('Achievements');

  // Gradients
  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B', '#334155'],
      card: ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
      card: ['rgba(241, 245, 249, 0.8)', 'rgba(248, 250, 252, 0.9)'],
    },
  };

  const currentGradient = gradients[currentTheme] || gradients.light;
  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.contentCard}>
 {/* Header Section - Stats Only */}
        <View style={styles.header}>
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#6366F1' }]}>{streak}</Text>
              <Text style={[styles.statLabel, { color: textSub }]}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#6366F1' }]}>{level}</Text>
              <Text style={[styles.statLabel, { color: textSub }]}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#6366F1' }]}>{totalXP}</Text>
              <Text style={[styles.statLabel, { color: textSub }]}>Total XP</Text>
            </View>
          </View>
        </View>

        {/* Today's Prompt Section */}
        <View style={styles.promptSection}>
          <Text style={[styles.promptLabel, { color: textSub }]}>Today's Prompt</Text>
          <View style={[styles.promptCard, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
            <Text style={[styles.promptText, { color: textMain }]}>
              {todayPrompt.text}
            </Text>
            {todayPrompt.explanation && (
              <Text style={[styles.promptExplanation, { color: textSub }]}>
                 {todayPrompt.explanation}
              </Text>
            )}
            {todayPrompt.isSmart && (
              <Text style={[styles.smartBadge, { color: '#6366F1' }]}>
                Smart Prompt
              </Text>
            )}
          </View>

          {/* New Smart Prompt Button */}
          <PremiumPressable
            onPress={handleNewSmartPrompt}
            haptic="light"
            style={[
              styles.newPromptButton,
              { 
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
              }
            ]}
          >
            <Text style={[styles.newPromptText, { color: '#6366F1' }]}>
               New Smart Prompt
            </Text>
          </PremiumPressable>

          {/* Write Button */}
          <PremiumPressable
            onPress={navigateToWrite}
            haptic="medium"
            style={[styles.writeButton, { backgroundColor: '#6366F1' }]}
          >
            <Text style={[styles.writeButtonText, { color: 'white' }]}>
              {hasDraft ? 'Continue Writing' : 'Start Writing'}
            </Text>
          </PremiumPressable>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.actionsLabel, { color: textSub }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <PremiumPressable
              onPress={navigateToHistory}
              haptic="light"
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)' }
              ]}
            >
              <Text style={[styles.actionIcon, { color: '#6366F1' }]}></Text>
              <Text style={[styles.actionText, { color: textMain }]}>History</Text>
            </PremiumPressable>

            <PremiumPressable
              onPress={navigateToStats}
              haptic="light"
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)' }
              ]}
            >
              <Text style={[styles.actionIcon, { color: '#6366F1' }]}></Text>
              <Text style={[styles.actionText, { color: textMain }]}>Stats</Text>
            </PremiumPressable>

            <PremiumPressable
              onPress={navigateToAchievements}
              haptic="light"
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)' }
              ]}
            >
              <Text style={[styles.actionIcon, { color: '#6366F1' }]}></Text>
              <Text style={[styles.actionText, { color: textMain }]}>Achievements</Text>
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
  contentCard: {
    flex: 1,
    margin: 16,
    padding: 20,
    borderRadius: 24,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptSection: {
    marginBottom: 32,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  promptText: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 8,
    fontWeight: '500',
  },
  promptExplanation: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  smartBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  newPromptButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  newPromptText: {
    fontSize: 14,
    fontWeight: '600',
  },
  writeButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  writeButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
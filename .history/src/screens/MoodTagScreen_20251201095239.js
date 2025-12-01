// src/screens/MoodTagScreen.js (With gradient)
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, Animated, ScrollView, useColorScheme, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useJournalStore } from '../stores/journalStore';
import { useSettings } from '../stores/settingsStore';
import * as Haptics from 'expo-haptics';
import { useProgress } from '../stores/progressStore';
import { useCustomization } from '../stores/customizationStore';
import { useTheme } from '../stores/themeStore';
import PremiumPressable from '../components/PremiumPressable';

export default function MoodTagScreen({ navigation, route }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const { date, prompt, text, suggestedMood } = route.params || {};

  // DEBUG LOGGING
  useEffect(() => {
    console.log('=== MOODTAGSCREEN DEBUG ===');
    console.log('Route params:', route.params);
    console.log('suggestedMood:', suggestedMood);
    console.log('date:', date);
    console.log('text exists:', !!text);
  }, [route.params]);

  // SIMPLE STATE - NO COMPLEX INITIALIZATION
const [selectedMood, setSelectedMood] = useState(() => {
  console.log('🚨 INITIAL STATE - suggestedMood:', suggestedMood);
  return suggestedMood || '';
});
  const [customMood, setCustomMood] = useState('');
  const fadeAnim = useRef(new Animated.Value(0.4)).current;

  const [achievementQueue, setAchievementQueue] = useState([]);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [showAchievement, setShowAchievement] = useState(false);
  const [progressWidth, setProgressWidth] = useState(new Animated.Value(0));
  const achievementsData = useProgress(state => state.getAchievements)();

  // SIMPLE mood selection handler - NO ANIMATIONS
  const handleMoodPress = (mood) => {
    const wasSelected = selectedMood === mood;
    setSelectedMood(wasSelected ? '' : mood);
    setCustomMood('');
    
    if (!wasSelected && hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Debug popup state
  useEffect(() => {
    console.log('Popup state changed - showAchievement:', showAchievement, 'currentAchievement:', currentAchievement);
  }, [showAchievement, currentAchievement]);

const { addEntry, updateEntry, entries } = useJournalStore((s) => ({
  addEntry: s.addEntry,
  updateEntry: s.updateEntry,
  entries: s.entries,
}));
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);

const moodOptions = ['calm','grateful','anxious','focused','happy','reflective','tired','energized','optimistic','overwhelmed'];


  // XP calculation: 10 XP per entry + mood bonus
  const calculateXP = (mood, isCustom) => {
    let xp = 10; // Base XP for completing an entry
    
    // Bonus XP for adding a mood
    if (mood) {
      if (isCustom) {
        xp += 5; // +5 XP for custom moods (creativity bonus)
      } else {
        xp += 2; // +2 XP for predefined moods
      }
    }
    
    return xp;
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: selectedMood || customMood.trim() ? 1 : 0.4,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [selectedMood, customMood, fadeAnim]);

  const applyDailySave = useProgress(state => state.applyDailySave);

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

  async function handleSave() {
    // Validate text content
    if (!text?.trim()) {
      Alert.alert(
        'Missing Reflection',
        'Please go back and write something before saving.',
        [
          { 
            text: 'Go Back', 
            onPress: () => navigation.goBack() 
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Validate mood selection
    const mood = selectedMood || customMood.trim();
    if (!mood) {
      Alert.alert(
        'Select a Mood',
        'Please choose how you are feeling before saving.',
        [{ text: 'OK' }]
      );
      return;
    }

    // This creates the ACTUAL entry that appears in History
    const isCustom = !selectedMood && customMood.trim(); // True if using custom mood
    const xpAwarded = calculateXP(mood, isCustom);
    
    const result = applyDailySave({
      date,
      moodTagged: true,
      wordCount: text.trim().split(/\s+/).filter(word => word.length > 0).length,
      mood: selectedMood || customMood.trim(),
      usedTimer: true,
      entryHour: new Date().getHours()
    });

    console.log('ACHIEVEMENT RESULT:', {
      newAchievements: result.newAchievements,
      xpGained: result.xpGained,
      streak: result.streakNow
    });

    if (hapticsEnabled) {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    
    // UPDATED: Save with timestamp when entry is completed - FIXED PARAMETERS
    upsert({ 
      date,
      text, 
      prompt: { text: prompt?.text }, // Make sure this matches your store structure
      mood: { type: selectedMood ? 'chip' : 'custom', value: mood },
      createdAt: new Date().toISOString(),
      isComplete: true
    });

    if (result.newAchievements && result.newAchievements.length > 0) {
      if (hapticsEnabled) {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
  
      // Check for customization unlocks
      const customizationUnlocks = useCustomization.getState().checkForUnlocks(
        { unlocked: result.newAchievements.map(a => a.id) },
        achievementsData.mastery
      );

      console.log('Multiple achievements unlocked:', result.newAchievements.length);
  
      // Add all achievements to queue and show first one
      setAchievementQueue(result.newAchievements);
      showNextAchievement(result.newAchievements);
    } else {
      navigation.reset({ 
        index: 0, 
        routes: [{ name: 'Home', params: { savedFrom: 'mood' } }] 
      });
    }
  }

  const showNextAchievement = (queue) => {
    if (queue.length === 0) {
      // No more achievements, navigate home
      console.log('All achievements shown, navigating home...');
      navigation.reset({ 
        index: 0, 
        routes: [{ name: 'Home', params: { savedFrom: 'mood' } }] 
      });
      return;
    }

    const nextAchievement = queue[0];
    const remainingQueue = queue.slice(1);
    
    console.log('Showing achievement:', nextAchievement.name, 'Remaining:', remainingQueue.length);
    
    setCurrentAchievement(nextAchievement);
    setAchievementQueue(remainingQueue);
    setShowAchievement(true);

    // Reset progress bar
    setProgressWidth(new Animated.Value(0));

    // Animate progress bar over 2 seconds
    Animated.timing(progressWidth, {
      toValue: 100,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Show next achievement after 2 seconds or navigate if none left
    setTimeout(() => {
      setShowAchievement(false);
      
      // Brief pause between achievements
      setTimeout(() => {
        showNextAchievement(remainingQueue);
      }, 300); // 300ms gap between achievements
    }, 1500);
  };

  const palette = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? '#1F2937' : '#E2E8F0',
    text: isDark ? '#E5E7EB' : '#0F172A',
    sub: isDark ? '#CBD5E1' : '#334155',
    hint: isDark ? '#94A3B8' : '#64748B',
    accent: '#6366F1',
  };

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentCard}>
          {/* Your entry (single box) */}
          <View style={[styles.entrySection]}>
            <Text style={[styles.sectionTitle,{ color: palette.text }]}>
              Your entry {!text?.trim() && <Text style={{ color: '#EF4444' }}>*</Text>}
            </Text>
            <View style={[styles.entryBox,{ backgroundColor: isDark ? '#0B1220' : '#F1F5F9' }]}>
              <Text style={[styles.promptLabel,{ color: palette.sub }]}>{prompt?.text || "Today's Prompt"}</Text>
              <Text style={[styles.answerText,{ color: palette.text }]}>
                {text?.trim() || '(Please go back and write something)'}
              </Text>
            </View>
          </View>

          {/* Mood picker */}
          <View style={[styles.card,{ borderColor: palette.border, backgroundColor: palette.card }]}>
            <Text style={[styles.sectionTitle,{ color: palette.text }]}>Add a mood</Text>
            <Text style={{ color: palette.sub, marginTop: 2 }}>How do you feel about what you wrote?</Text>

{/* Suggested mood note - NO BACKGROUND */}
{suggestedMood && (
  <Text style={[styles.suggestionNote, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
    Based on your writing, we suggested "{suggestedMood.charAt(0).toUpperCase() + suggestedMood.slice(1)}"
  </Text>
)}

            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:12 }}>
              {moodOptions.map((m) => {
                const active = selectedMood === m;
                const isSuggested = m === suggestedMood;
                
                console.log(`Mood: ${m}, active: ${active}, isSuggested: ${isSuggested}`); // DEBUG
                
                return (
                  <Pressable
                    key={m}
                    onPress={() => handleMoodPress(m)}
                    style={[
                      styles.chip,
                      {
                        // SIMPLE, GUARANTEED STYLING:
                        borderColor: active ? '#6366F1' : (isSuggested ? '#6366F1' : palette.border),
                        borderWidth: active ? 2 : (isSuggested ? 2 : 1),
                        backgroundColor: active 
                          ? '#6366F1'  // SOLID PURPLE when selected
                          : (isSuggested ? 'rgba(99, 102, 241, 0.1)' : 'transparent'),
                      },
                    ]}
                  >
<Text style={{ 
  color: active ? '#FFFFFF' : (isSuggested ? '#6366F1' : palette.sub),
  fontWeight: '600',
}}>
  {m.charAt(0).toUpperCase() + m.slice(1)} {/* Capitalize display */}
</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label,{ color: palette.sub, marginTop:16 }]}>Or write your own</Text>
            <TextInput
              value={customMood}
              onChangeText={(t)=>{ setCustomMood(t); setSelectedMood(''); }}
              placeholder="e.g., quietly confident…"
              placeholderTextColor={palette.hint}
              style={[styles.input,{ color: palette.text, backgroundColor: palette.card, borderColor: palette.border }]}
            />
          </View>

          {/* Save button */}
          <Animated.View style={{ opacity: fadeAnim, marginTop: 8 }}>
            <PremiumPressable
              onPress={handleSave}
              disabled={!selectedMood && !customMood.trim()}
              haptic="light"
              style={[
                styles.saveBtn,
                (!selectedMood && !customMood.trim()) && styles.saveBtnDisabled,
              ]}
            >
              <Text style={styles.saveText}>
                {(!selectedMood && !customMood.trim()) ? 'Select Mood to Save' : 'Save Entry'}
              </Text>
            </PremiumPressable>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Achievement Popup */}
      {showAchievement && currentAchievement && (
        <View style={styles.achievementPopup}>
          <View style={[styles.achievementCard, { 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
          }]}>
            <Text style={styles.achievementTitle}>
              Achievement Unlocked ({achievementQueue.length + 1} of {achievementQueue.length + 1 + (achievementQueue?.length || 0)})
            </Text>
            <Text style={[styles.achievementName, { color: '#6366F1' }]}>
              {currentAchievement.name}
            </Text>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: progressWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  }) }
                ]} 
              />
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
  },
  contentCard: {
    flex: 1,
  },
  entrySection:{ marginBottom: 16 },
  entryBox:{ padding:14, borderRadius:14 },
  sectionTitle:{ fontSize:16, fontWeight:'700', marginBottom:8 },
  promptLabel:{ fontSize:12, fontWeight:'700', letterSpacing:0.3, textTransform:'uppercase', marginBottom:4 },
  answerText:{ fontSize:14, lineHeight:20 },
  card:{ borderWidth:1, borderRadius:16, padding:14, marginBottom: 8 },
  label:{ fontSize:14, marginBottom:6 },
  chip:{ borderWidth:1, borderRadius:999, paddingVertical:6, paddingHorizontal:12 },
  input:{ borderWidth:1, borderRadius:12, paddingVertical:10, paddingHorizontal:12, marginTop:8 },
  saveBtn:{ backgroundColor:'#6366F1', paddingVertical:14, paddingHorizontal:18, borderRadius:14, alignSelf:'flex-start' },
  saveBtnDisabled:{ backgroundColor:'#CBD5E1' },
  saveText:{ color:'white', fontWeight:'700', fontSize:15 },
  achievementPopup: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  achievementCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  achievementTitle: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 3,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  suggestionNote: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'left',
    marginTop: 8,
    marginBottom: 8,
  },
});
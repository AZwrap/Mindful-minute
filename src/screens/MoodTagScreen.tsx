// src/screens/MoodTagScreen.js (With gradient)
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, Animated, ScrollView, useColorScheme, Alert, Linking
} from 'react-native';
// @ts-ignore
import { MOOD_PLAYLISTS, getRecommendedPlaylist } from '../constants/moodCategories';
import { LinearGradient } from 'expo-linear-gradient';
import { useEntriesStore } from '../stores/entriesStore';
import { useSettings } from '../stores/settingsStore';
import * as Haptics from 'expo-haptics';
import { useUIStore } from '../stores/uiStore';
import { useProgress } from '../stores/progressStore';
import { useCustomization } from '../stores/customizationStore';
import { useTheme } from '../stores/themeStore';
import PremiumPressable from '../components/PremiumPressable';
import AchievementPopup from '../components/AchievementPopup';
import { Music, ExternalLink } from 'lucide-react-native';
import { shallow } from 'zustand/shallow'; // Ensure shallow is imported if available, or handled below
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMusicForMood } from '../utils/musicRecommender';

// --- ADD THIS ABOVE THE COMPONENT ---
// FIXED: Use Title Case to match database constants
const moodOptions = ['Calm','Grateful','Anxious','Focused','Happy','Reflective','Tired','Energetic','Optimistic','Overwhelmed'];

export default function MoodTagScreen({ navigation, route }) {
  const systemScheme = useColorScheme();
const { getCurrentTheme, accentColor } = useTheme();
const { showAlert } = useUIStore();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const { date, prompt, text, suggestedMood, initialMood } = route.params || {};

  // DEBUG LOGGING
  useEffect(() => {
    console.log('=== MOODTAGSCREEN DEBUG ===');
    console.log('Route params:', route.params);
    console.log('suggestedMood:', suggestedMood);
    console.log('date:', date);
    console.log('text exists:', !!text);
  }, [route.params]);

// Defined at the top so we can use it for initialization logic

// SIMPLE STATE - INTELLIGENT INITIALIZATION
const [selectedMood, setSelectedMood] = useState(() => {
    // 1. Priority: User selection from previous screen
    if (initialMood && moodOptions.includes(initialMood)) {
      return initialMood;
    }

    // 2. Fallback: AI Suggestion
    const normalizedSuggestion = suggestedMood ? suggestedMood.charAt(0).toUpperCase() + suggestedMood.slice(1).toLowerCase() : '';
    
    if (normalizedSuggestion && moodOptions.includes(normalizedSuggestion)) {
      return normalizedSuggestion;
    }
    return '';
  });

  const [customMood, setCustomMood] = useState(() => {
    // 1. Priority: User selection from previous screen (if custom)
    if (initialMood && !moodOptions.includes(initialMood)) {
      return initialMood;
    }

    const normalizedSuggestion = suggestedMood ? suggestedMood.charAt(0).toUpperCase() + suggestedMood.slice(1).toLowerCase() : '';
    
    // 2. Fallback: AI Suggestion (if custom)
    if (normalizedSuggestion && !moodOptions.includes(normalizedSuggestion)) {
      return normalizedSuggestion;
    }
    return '';
  });

  const fadeAnim = useRef(new Animated.Value(0.4)).current;

const [achievementQueue, setAchievementQueue] = useState([]);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [showAchievement, setShowAchievement] = useState(false);

const handlePopupClose = () => {
    setShowAchievement(false);
    // Small delay before next one or navigation
    setTimeout(() => {
      if (achievementQueue.length > 0) {
        const next = achievementQueue[0];
        setCurrentAchievement(next);
        setAchievementQueue(q => q.slice(1));
        setShowAchievement(true);
      } else {
        // FIX: Explicitly navigate to the correct tab hierarchy
        navigation.navigate('MainTabs', { screen: 'HomeTab', params: { savedFrom: 'mood' } });
      }
    }, 300);
  };

  const handleMoodPress = (mood) => {
    const wasSelected = selectedMood === mood;
    setSelectedMood(wasSelected ? '' : mood);
    setCustomMood('');
    
    if (!wasSelected && hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

const currentEntryMood = selectedMood || customMood;
  const recommendedPlaylist = getRecommendedPlaylist(currentEntryMood);

  const handleMusicPress = () => {
    if (recommendedPlaylist) {
      Linking.openURL(recommendedPlaylist.url).catch(err => console.error("Couldn't load page", err));
    }
  };

// Use entriesStore for personal entries (same as WriteScreen)
  const upsert = useEntriesStore((s) => s.upsert);

  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);

  const calculateXP = (mood, isCustom) => {
    let xp = 10; 
    if (mood) {
      if (isCustom) {
        xp += 5; 
      } else {
        xp += 2; 
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
    try {
      console.log('--- STARTING SAVE ---');
      
      // 1. Validation
      if (!text?.trim()) {
        showAlert('Missing Reflection', 'Please go back and write something before saving.', [
          { text: 'Go Back', onPress: () => navigation.goBack() },
          { text: 'Cancel', style: 'cancel' }
        ]);
        return;
      }

      const mood = selectedMood || customMood.trim();
      if (!mood) {
        showAlert('Select a Mood', 'Please choose how you are feeling before saving.', [{ text: 'OK' }]);
        return;
      }

      // 2. Save to Entries Store
      console.log('Saving to entriesStore...');
      if (upsert) {
        upsert({ 
          date,
          text: text,
          prompt: prompt,
          moodTag: { type: selectedMood ? 'chip' : 'custom', value: mood },
          isComplete: true,
          updatedAt: Date.now()
        });
      } else {
        throw new Error("upsert function missing");
      }

      // 3. Calculate Progress & Achievements
      console.log('Calculating progress...');
      const existingEntry = useEntriesStore.getState().entries[date];
      const isGratitude = existingEntry?.isGratitude || false;

      const result = applyDailySave({
        date,
        moodTagged: true,
        wordCount: text.trim().split(/\s+/).filter(word => word.length > 0).length,
        mood: mood,
        usedTimer: true,
        entryHour: new Date().getHours(),
        isGratitude
      });

      console.log('Save complete. Achievements:', result?.newAchievements?.length);

      // 4. Haptics
      if (hapticsEnabled) {
        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
      }

      // 5. Handle Navigation or Achievements
      if (result && result.newAchievements && result.newAchievements.length > 0) {
        // Show Achievement Popup
        if (hapticsEnabled) {
          try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        }
        
        // Ensure customization store exists before calling
        try {
          const currentMastery = useProgress.getState().getAchievements().mastery;
          useCustomization.getState().checkForUnlocks(
            { unlocked: result.newAchievements.map(a => a.id) },
            currentMastery
          );
        } catch (e) {
          console.log('Customization unlock check failed (non-critical):', e);
        }

        setCurrentAchievement(result.newAchievements[0]);
        setAchievementQueue(result.newAchievements.slice(1));
        setShowAchievement(true);
      } else {
        // Go Home Immediately
        console.log('Navigating to HomeTab...');
        navigation.navigate('MainTabs', { screen: 'HomeTab' });
      }

    } catch (error) {
      console.error('SAVE ERROR:', error);
      Alert.alert("Save Error", "Your entry was saved, but we hit a snag closing the screen. " + error.message, [
        { text: "Go Home", onPress: () => navigation.navigate('MainTabs', { screen: 'HomeTab' }) }
      ]);
    }
  }

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
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
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

            {suggestedMood && (
              <Text style={[styles.suggestionNote, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                Based on your writing, we suggested "{suggestedMood.charAt(0).toUpperCase() + suggestedMood.slice(1)}"
              </Text>
            )}

<View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:12 }}>
              {moodOptions.map((m) => {
                const active = selectedMood === m;
                const isSuggested = m.toLowerCase() === (suggestedMood || '').toLowerCase();
                
                return (
                  <Pressable
                    key={m}
                    onPress={() => handleMoodPress(m)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active || isSuggested ? accentColor : palette.border,
                        borderWidth: active || isSuggested ? 2 : 1,
                        // We remove backgroundColor here and use layers below for dynamic opacity
                        backgroundColor: 'transparent', 
                        overflow: 'hidden' // Keeps the background layers inside the border
                      },
                    ]}
                  >
                    {/* Layer 1: Active Background (Solid) */}
                    {active && (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: accentColor }]} />
                    )}

                    {/* Layer 2: Suggested Background (Transparent Tint) */}
                    {!active && isSuggested && (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: accentColor, opacity: 0.1 }]} />
                    )}

                    <Text style={{ 
                      color: active ? '#FFFFFF' : (isSuggested ? accentColor : palette.sub),
                      fontWeight: '600',
                      zIndex: 1 // Ensure text sits on top of background layers
                    }}>
                      {m} 
                    </Text>
                  </Pressable>
                );
              })}
            </View>
{/* Music Recommender */}
            {recommendedPlaylist && (
              <Animated.View style={{ marginTop: 16, opacity: fadeAnim }}>
                <Pressable 
                  onPress={handleMusicPress}
                  style={({pressed}) => [
                    styles.musicBtn, 
                    { 
                      backgroundColor: palette.card,
                      borderColor: accentColor, // Dynamic Border
                      borderWidth: 1,
                      opacity: pressed ? 0.9 : 1,
                      
                      // DYNAMIC GLOW EFFECT
                      shadowColor: accentColor, // Dynamic Shadow
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 10,
                      elevation: 8 
                    }
                  ]}
                >
                  {/* Icon Box with Dynamic Tint */}
                  <View style={styles.musicIconBox}>
                    {/* Background Layer (Opacity Trick) */}
                    <View style={{
                      ...StyleSheet.absoluteFillObject,
                      backgroundColor: accentColor,
                      opacity: isDark ? 0.2 : 0.1,
                      borderRadius: 10
                    }} />
                    {/* Icon */}
                    <Music size={20} color={accentColor} />
                  </View>

                  {/* Text Content */}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.musicTitle, { color: palette.text }]}>
                      {recommendedPlaylist.label}
                    </Text>
                    <Text style={[styles.musicSub, { color: palette.sub }]} numberOfLines={1}>
                      Recommended for {currentEntryMood}
                    </Text>
                  </View>

                  {/* Action Icon */}
                  <ExternalLink size={16} color={accentColor} style={{ opacity: 0.8 }} />
                </Pressable>
              </Animated.View>
            )}

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
                // Dynamically apply accent color if enabled, otherwise grey
                { 
                  backgroundColor: (!selectedMood && !customMood.trim()) 
                    ? (isDark ? '#374151' : '#CBD5E1') 
                    : accentColor 
                }
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
      <AchievementPopup 
        isVisible={showAchievement}
        achievement={currentAchievement}
        onClose={handlePopupClose}
      />
      </SafeAreaView>
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
  musicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    gap: 12, // Space between icon and text
  },
  musicIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  musicSub: {
    fontSize: 13,
    fontWeight: '500',
  },
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
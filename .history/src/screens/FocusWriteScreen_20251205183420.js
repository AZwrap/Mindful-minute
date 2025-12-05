import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Navigation & Stores
import { RootStackParamList } from '../navigation/RootStack';
import { useEntriesStore } from "../stores/entriesStore";
import { useProgress } from '../stores/progressStore';
import { useTheme } from '../stores/themeStore';
import { useSharedPalette } from '../hooks/useSharedPalette';

// Components
import PremiumPressable from '../components/PremiumPressable';
import { MOOD_CATEGORIES, MOOD_COLORS } from '../constants/moodCategories';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
// We extend the definition here to include optional params that might
// not be strictly defined in RootStack yet.
type Props = NativeStackScreenProps<RootStackParamList, 'MoodTag'> & {
  route: {
    params: RootStackParamList['MoodTag'] & {
      suggestedMood?: string;
      isGratitudeEntry?: boolean;
      xpBonus?: number;
      audioUri?: string;
    };
  };
};

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function MoodTagScreen({ navigation, route }: Props) {
  const { 
    date, 
    text, 
    prompt, 
    savedFrom, 
    suggestedMood, 
    isGratitudeEntry, 
    xpBonus, 
    audioUri 
  } = route.params;

  const { getCurrentTheme } = useTheme();
  const palette = useSharedPalette();
  const isDark = getCurrentTheme() === 'dark';

  const [selectedMood, setSelectedMood] = useState<string | null>(suggestedMood || null);
  const [customMood, setCustomMood] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store Actions
  const upsert = useEntriesStore((s) => s.upsert);
  const updateStreak = useProgress((s) => s.updateStreak);
  const incrementTotalEntries = useProgress((s) => s.incrementTotalEntries);

  // Auto-select suggested mood if available
  useEffect(() => {
    if (suggestedMood) {
      setSelectedMood(suggestedMood);
    }
  }, [suggestedMood]);

  const handleSave = async () => {
    if (!selectedMood && !customMood.trim()) {
      Alert.alert("Choose a Mood", "Please select or type a mood to continue.");
      return;
    }

    setIsSubmitting(true);
    
    // Determine final mood value
    const finalMood = customMood.trim() || selectedMood || 'Neutral';
    const isCustom = !!customMood.trim();

    // 1. Save to Store
    upsert({
      date,
      text,
      prompt: { text: prompt || '' },
      moodTag: { 
        value: finalMood, 
        type: isCustom ? 'custom' : 'default' 
      },
      isComplete: true,
      audioUri: audioUri, // Persist audio if present
      // If coming from WriteScreen, these might already be set, but we reinforce them
      isGratitude: isGratitudeEntry,
      xpBonus: xpBonus || 0,
    });

    // 2. Update Stats
    updateStreak(date);
    incrementTotalEntries();

    // 3. Feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // 4. Navigate
    // Small delay to ensure state updates
    setTimeout(() => {
      setIsSubmitting(false);
      // Navigate to Home with a success flag, or Weekly Recap if needed
      navigation.navigate('MainTabs'); 
    }, 100);
  };

  const MoodCategory = ({ label, moods }: { label: string, moods: string[] }) => (
    <View style={styles.categoryContainer}>
      <Text style={[styles.categoryLabel, { color: palette.subtleText }]}>{label}</Text>
      <View style={styles.moodGrid}>
        {moods.map((mood) => {
          const isSelected = selectedMood === mood;
          const color = MOOD_COLORS[mood as keyof typeof MOOD_COLORS] || palette.accent;
          
          return (
            <PremiumPressable
              key={mood}
              onPress={() => {
                setSelectedMood(mood);
                setCustomMood(''); // Clear custom if selecting preset
                Haptics.selectionAsync();
              }}
              style={[
                styles.moodBtn,
                {
                  backgroundColor: isSelected ? color : palette.card,
                  borderColor: isSelected ? color : palette.border,
                }
              ]}
            >
              <Text 
                style={[
                  styles.moodBtnText, 
                  { 
                    color: isSelected ? 'white' : palette.text,
                    fontWeight: isSelected ? '700' : '500'
                  }
                ]}
              >
                {mood}
              </Text>
            </PremiumPressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={[palette.bg, palette.bg]}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            <Text style={[styles.title, { color: palette.text }]}>
              How are you feeling?
            </Text>
            
            <Text style={[styles.subtitle, { color: palette.subtleText }]}>
              Select a mood or create your own to capture this moment.
            </Text>

            {/* Categories */}
            {Object.entries(MOOD_CATEGORIES).map(([category, moods]) => (
              <MoodCategory key={category} label={category} moods={moods} />
            ))}

            {/* Custom Mood Input */}
            <View style={styles.customContainer}>
              <Text style={[styles.categoryLabel, { color: palette.subtleText }]}>Custom Mood</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    backgroundColor: palette.card, 
                    color: palette.text,
                    borderColor: customMood ? palette.accent : palette.border 
                  }
                ]}
                placeholder="e.g. Accomplished, Dreary..."
                placeholderTextColor={palette.subtleText}
                value={customMood}
                onChangeText={(t) => {
                  setCustomMood(t);
                  if (t) setSelectedMood(null);
                }}
              />
            </View>

          </ScrollView>

          <View style={[styles.footer, { backgroundColor: palette.bg, borderTopColor: palette.border }]}>
            <PremiumPressable
              onPress={handleSave}
              disabled={isSubmitting}
              style={[
                styles.saveBtn,
                { backgroundColor: palette.accent, opacity: isSubmitting ? 0.7 : 1 }
              ]}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Saving...' : 'Finish Entry'}
              </Text>
            </PremiumPressable>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 32, lineHeight: 22 },
  categoryContainer: { marginBottom: 24 },
  categoryLabel: { fontSize: 13, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moodBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  moodBtnText: { fontSize: 14, textTransform: 'capitalize' },
  customContainer: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
});
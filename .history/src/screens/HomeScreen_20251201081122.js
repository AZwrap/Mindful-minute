import React, { useMemo, useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  useColorScheme, 
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics'; // ← ADD THIS
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { todayISO, promptOfDay } from '../lib/prompts';
import { useProgress } from '../stores/progressStore';
import { useJournalStore } from "../stores/journalStore";
import { useTheme } from '../stores/themeStore';
import { useSettings } from '../stores/settingsStore'; // ← ADD THIS
import PremiumPressable from '../components/PremiumPressable';
import { generateSmartPrompt, analyzeForSmartPrompts, getPromptExplanation } from '../utils/smartPrompts';
import { useSharedPalette } from "../hooks/useSharedPalette";



export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const systemScheme = useColorScheme();
const { getCurrentTheme } = useTheme();
const currentTheme = getCurrentTheme(systemScheme);
const isDark = currentTheme === "dark";
const palette = useSharedPalette();


  const date = todayISO();
  const [today, setToday] = useState({ id: 0, text: '', isCustom: false });
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
    // Smart prompts state
  const [todayPrompt, setTodayPrompt] = useState({ 
    text: '', 
    isSmart: false, 
    explanation: '' 
  });
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  // Get entries for smart prompt analysis
const sharedJournals = useJournalStore((s) => s.journals);
const drafts = useJournalStore((s) => s.drafts);
const map = useJournalStore((s) => s.entries);

const sharedJournalsList = useMemo(() => {
  return Object.values(sharedJournals || {});
}, [sharedJournals]);

  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

  // Generate smart prompt when entries are available
  useEffect(() => {
    const generateSmartPromptIfNeeded = async () => {
      // Only generate smart prompts if we have enough entries AND we're not using a custom prompt
if (entries.length >= 3 && !today.isCustom && today.text) {
        try {
          const userData = analyzeForSmartPrompts(entries);
          const newPrompt = generateSmartPrompt(userData);
          const explanation = getPromptExplanation(newPrompt, userData);
          
          setTodayPrompt({
            text: newPrompt,
            explanation: explanation,
            isSmart: true
          });
        } catch (error) {
          console.error('Error generating smart prompt:', error);
          // Fallback to regular prompt
          setTodayPrompt({
            text: today.text,
            isSmart: false,
            explanation: ''
          });
        }
      } else if (today.text) {
        // Use the regular prompt
        setTodayPrompt({
          text: today.text,
          isSmart: false,
          explanation: ''
        });
      }
    };

    generateSmartPromptIfNeeded();
  }, [entries.length, today.text, today.isCustom]);
  
  

  // Add this useEffect to preload common data
  useEffect(() => {
    const preloadData = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await promptOfDay(tomorrow.toISOString().split('T')[0]);
    };
    preloadData();
  }, []);

const contentFadeAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  // Fade in when today's prompt is loaded
  if (today.text) {
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }
}, [today.text]);

  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const enabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(enabled);
    };

    checkScreenReader();
    
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        setIsScreenReaderEnabled(enabled);
      }
    );

    return () => subscription.remove();
  }, []);

  // Load prompt
  useEffect(() => {
    const loadPrompt = async () => {
      const prompt = await promptOfDay(date);
      setToday(prompt);
    };
    loadPrompt();
  }, [date]);

  const entryToday = map?.[date] || null;
  const draftText = drafts?.[date]?.text || '';

  const hasFinal = !!(entryToday?.text && entryToday?.moodTag?.value);
  const hasInProgress = !hasFinal && (
    (draftText && draftText.trim().length > 0) ||
    (entryToday?.text && !entryToday?.moodTag)
  );

  // Primary CTA with accessibility labels
  let primaryLabel = 'Start Journaling';
  let primaryA11yLabel = `Start journaling with today's prompt: ${todayPrompt.text}`;
    let primaryVariant = 'default';
  let primaryPress = () => navigation.navigate('Write', { 
    date, 
    prompt: { 
      text: todayPrompt.text,
      isSmart: todayPrompt.isSmart
    } 
  });

  if (hasInProgress) {
    primaryLabel = 'Continue Writing';
    primaryA11yLabel = 'Continue your journal entry in progress';
    primaryVariant = 'continue';
    const seedText = draftText?.trim().length ? draftText : (entryToday?.text || '');
    primaryPress = () => navigation.navigate('Write', { 
      date, 
      prompt: { 
        text: todayPrompt.text,
        isSmart: todayPrompt.isSmart
      }, 
      text: seedText 
    });  } else if (hasFinal) {
    primaryLabel = "View Today's Entry";
    primaryA11yLabel = 'View your completed journal entry for today';
    primaryVariant = 'view';
    primaryPress = () => navigation.navigate('EntryDetail', { date });
  }

  // Gradients - use currentTheme instead of scheme
  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B', '#334155'],
      card: ['rgba(30, 41, 59, 0.4)', 'rgba(15, 23, 42, 0.6)'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
      card: ['rgba(241, 245, 249, 0.6)', 'rgba(248, 250, 252, 0.8)'],
    },
  };

  const currentGradient = gradients[currentTheme] || gradients.light;

  // Toast animation
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(8)).current;
  const toastScale = useRef(new Animated.Value(0.96)).current;

  const showToast = () => {
    toastOpacity.setValue(0);
    toastY.setValue(8);
    toastScale.setValue(0.96);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(toastY, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.spring(toastScale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      ]),
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(toastOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(toastY, { toValue: -2, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();

    // Announce to screen readers
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility('Entry saved successfully');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (route?.params?.savedFrom === 'mood') {
        showToast();
        setTimeout(() => {
          try { navigation.setParams({ savedFrom: undefined }); } catch {}
        }, 0);
      }
    }, [route?.params?.savedFrom, navigation])
  );

  // Use isDark instead of scheme
  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';
  const brand = '#6366F1';

  // Button variants
  const buttonVariants = {
    default: { bg: brand, text: 'white' },
    continue: { bg: '#14adb8ff', text: 'white' },
    view: { bg: '#10B981', text: 'white' },
  };

  const currentVariant = buttonVariants[primaryVariant] || buttonVariants.default;

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel="Mindful Minute Home Screen"
    >
      <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
      <LinearGradient
        colors={currentGradient.card}
        style={styles.contentCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        accessible={true}
        accessibilityRole="summary"
      >
        {/* Today's Prompt Section */}
        <View 
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`Today's journal prompt: ${todayPrompt.text}`}
        >
          <Text style={[styles.title, { color: textMain }]}>
            Today's Reflection{todayPrompt.isSmart }
          </Text>
          <Text 
            style={[styles.prompt, { color: textSub }]}
            accessibilityRole="text"
            accessibilityLabel={todayPrompt.text}
          >
            {todayPrompt.text}
          </Text>
          {todayPrompt.explanation && (
            <Text style={[styles.promptExplanation, { color: textSub, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }]}>
              {todayPrompt.explanation}
            </Text>
          )}
        </View>
        
        {/* Custom Prompt Button */}
        <PremiumPressable
          onPress={() => {
            navigation.navigate('CustomPrompt', { 
              date, 
              currentPrompt: today.text,
              isCustom: today.isCustom 
            });
          }}
          haptic="light"
          style={styles.customPromptBtn}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={today.isCustom ? 'Edit custom prompt' : 'Use custom prompt instead of today\'s prompt'}
          accessibilityHint="Opens screen to create or edit a custom journal prompt"
        >
          <Text style={[styles.customPromptText, { color: brand }]}>
            {today.isCustom ? 'Edit Custom Prompt' : 'Use Custom Prompt'}
          </Text>
        </PremiumPressable>

                {/* New Smart Prompt Button - Only show if user has enough entries */}
        {entries.length >= 3 && !today.isCustom && (
          <PremiumPressable
            onPress={async () => {
              setIsGeneratingPrompt(true);
              try {
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
              } catch (error) {
                console.error('Error generating smart prompt:', error);
              } finally {
                setIsGeneratingPrompt(false);
              }
            }}
            haptic="light"
            disabled={isGeneratingPrompt}
            style={[
              styles.customPromptBtn,
              { opacity: isGeneratingPrompt ? 0.6 : 1 }
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Generate new smart prompt based on your writing patterns"
            accessibilityHint="Creates a personalized prompt using AI analysis of your previous entries"
          >
            <Text style={[styles.customPromptText, { color: brand }]}>
              {isGeneratingPrompt ? 'Generating...' : 'Generate New Smart Prompt'}
            </Text>
          </PremiumPressable>
        )}

{/* Row: Start Journaling + History (side by side) */}
<View style={styles.row}>

  {/* Start Journaling */}
  <PremiumPressable 
    onPress={primaryPress}
    haptic="light"
style={[
  styles.btnPrimary,
  { 
    backgroundColor: currentVariant.bg,
    flex: 1,
    marginRight: 8,
    minWidth: 90,      // <<< added to keep text on one line
  }
]}

  >
    <Text style={[styles.btnPrimaryText, { color: currentVariant.text }]}>
      {primaryLabel}
    </Text>
  </PremiumPressable>

  {/* History */}
  <PremiumPressable 
    onPress={() => navigation.navigate('History')}
    haptic="light"
    style={[styles.btnGhost, { flex: 1, marginLeft: 8 }]}
  >
    <Text style={[styles.btnGhostText, { color: brand }]}>History</Text>
  </PremiumPressable>

</View>

{/* Shared Journals BELOW Start Journaling */}
<Pressable
  onPress={() => navigation.navigate("Invite")}
  style={[
    styles.sharedButton,
    { backgroundColor: palette.card, marginTop: 12 }
  ]}
>
  <Text style={{ color: palette.text, fontWeight: "600" }}>
    Shared Journals
  </Text>
</Pressable>


        {/* Inline toast */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastInline,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastY }, { scale: toastScale }],
              backgroundColor: 'rgba(16,185,129,0.12)',
              borderColor: 'rgba(16,185,129,0.25)',
            },
          ]}
          accessible={true}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Text style={{ color: isDark ? '#A7F3D0' : '#065F46', fontWeight: '700' }}>
            Saved ✓
          </Text>
        </Animated.View>

        <View style={styles.bottomButtons}>
          <PremiumPressable 
            onPress={() => navigation.navigate('Settings')}
            haptic="light"
            style={styles.bottomButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="App settings"
            accessibilityHint="Opens settings screen to customize your journaling experience"
          >
            <Text style={[styles.bottomButtonText, { color: brand }]}>Settings</Text>
          </PremiumPressable>
          
          <PremiumPressable 
            onPress={() => navigation.navigate('Achievements')}
            haptic="light"
            style={styles.bottomButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="View achievements"
            accessibilityHint="Opens achievements screen to see your progress and unlocked badges"
          >
            <Text style={[styles.bottomButtonText, { color: brand }]}>Achievements</Text>
          </PremiumPressable>
        </View>
        {/* Shared Journals */}
{sharedJournalsList.length > 0 && (
  <View
    style={[
      styles.card,
      { backgroundColor: palette.card, borderColor: palette.border },
    ]}
  >
    <Text style={[styles.title, { color: palette.text }]}>
      Shared Journals
    </Text>

{sharedJournalsList.map((j) => (
      <Pressable
        key={j.id}
        onPress={() =>
          navigation.navigate("SharedJournal", { journalId: j.id })
        }
        style={{
          paddingVertical: 12,
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
        }}
      >
        <Text
          style={{
            color: palette.text,
            fontSize: 15,
            fontWeight: "600",
          }}
        >
          {j.name}
        </Text>
        <Text style={{ color: palette.sub, fontSize: 12 }}>
          {j.members.length} members
        </Text>
      </Pressable>
    ))}
  </View>
)}

      </LinearGradient>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  contentCard: {
    flex: 1,
    margin: 20,
    marginTop: 10,
    padding: 24,
    borderRadius: 24,
    gap: 20,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  prompt: { 
    fontSize: 16, 
    lineHeight: 24,
    textAlign: 'center',
  },
  row: { 
    flexDirection: 'row', 
    gap: 12, 
    alignItems: 'center' 
  },
  btnPrimary: { 
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16, 
    borderRadius: 16,
  },
  btnPrimaryText: { 
    fontWeight: '700',
    fontSize: 16,
  },
  btnGhost: { 
    borderWidth: 1, 
    borderColor: 'rgba(99,102,241,0.3)', 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 16,
    alignItems: 'center',
  },
  btnGhostText: { 
    fontWeight: '700',
    fontSize: 14,
  },
  toastInline: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  customPromptBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  customPromptText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomButtons: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  bottomButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  bottomButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
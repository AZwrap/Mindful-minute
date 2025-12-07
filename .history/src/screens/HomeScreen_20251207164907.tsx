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
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users } from 'lucide-react-native';

// Logic & Config
import { todayISO, promptOfDay } from '../lib/prompts';
import { generateSmartPrompt, analyzeForSmartPrompts, getPromptExplanation } from '../utils/smartPrompts';
import { useSharedPalette } from "../hooks/useSharedPalette";

// Stores & Types
import { useJournalStore } from "../stores/journalStore";
import { useEntriesStore } from '../stores/entriesStore';
import { useTheme } from '../stores/themeStore';
import { useSettings } from '../stores/settingsStore';
import { useProgress } from '../stores/progressStore'; // Import Progress Store
import { RootStackParamList } from '../navigation/RootStack';
import { Flame } from 'lucide-react-native'; // Import Icon

// Components
import PremiumPressable from '../components/PremiumPressable';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface PromptState {
  id: number;
  text: string;
  isCustom: boolean;
}

interface SmartPromptState {
  text: string;
  isSmart: boolean;
  explanation: string;
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<any>(); // Type as 'any' to handle arbitrary params like 'savedFrom' safely
  const systemScheme = useColorScheme();
  
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === "dark";
  const palette = useSharedPalette();
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);

  const date = todayISO();
  const [today, setToday] = useState<PromptState>({ id: 0, text: '', isCustom: false });
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  
  // Smart prompts state
  const [todayPrompt, setTodayPrompt] = useState<SmartPromptState>({ 
    text: '', 
    isSmart: false, 
    explanation: '' 
  });
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

// STORE SELECTORS
  const sharedJournals = useJournalStore((s) => s.journals);
  const drafts = useEntriesStore((s) => s.drafts);
  const map = useEntriesStore((s) => s.entries);
  const streak = useProgress((s) => s.streak); // Get Streak

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const sharedJournalsList = useMemo(() => {
    return Object.values(sharedJournals || {});
  }, [sharedJournals]);

  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

  // 1. Generate smart prompt
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
          setTodayPrompt({
            text: today.text,
            isSmart: false,
            explanation: ''
          });
        }
      } else if (today.text) {
        setTodayPrompt({
          text: today.text,
          isSmart: false,
          explanation: ''
        });
      }
    };

    generateSmartPromptIfNeeded();
  }, [entries.length, today.text, today.isCustom]);

  // 2. Preload tomorrow
  useEffect(() => {
    const preloadData = async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await promptOfDay(tomorrow.toISOString().split('T')[0]);
    };
    preloadData();
  }, []);

  // 3. Animations
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (today.text) {
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [today.text]);

  // 4. Accessibility
  useEffect(() => {
    const checkScreenReader = async () => {
      const enabled = await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(enabled);
    };

    checkScreenReader();
    
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => setIsScreenReaderEnabled(enabled)
    );

    return () => subscription.remove();
  }, []);

  // 5. Load Prompt
  useEffect(() => {
    const loadPrompt = async () => {
      const prompt = await promptOfDay(date);
      setToday(prompt);
    };
    loadPrompt();
  }, [date]);

  // 6. Determine CTA State
  const entryToday = map?.[date] || null;
  const draftText = drafts?.[date]?.text || '';

  const hasFinal = !!(entryToday?.text && entryToday?.moodTag?.value);
  const hasInProgress = !hasFinal && (
    (draftText && draftText.trim().length > 0) ||
    (entryToday?.text && !entryToday?.moodTag)
  );

  let primaryLabel = 'Start Journaling';
  let primaryVariant: 'default' | 'continue' | 'view' = 'default';
  
  let primaryPress = () => navigation.navigate('Write', { 
    date, 
    prompt: { 
      text: todayPrompt.text,
      isSmart: todayPrompt.isSmart
    } 
  });

  if (hasInProgress) {
    primaryLabel = 'Continue Writing';
    primaryVariant = 'continue';
    const seedText = draftText?.trim().length ? draftText : (entryToday?.text || '');
    primaryPress = () => navigation.navigate('Write', { 
      date, 
      prompt: { 
        text: todayPrompt.text,
        isSmart: todayPrompt.isSmart
      }, 
      text: seedText 
    });  
  } else if (hasFinal) {
    primaryLabel = "View Today's Entry";
    primaryVariant = 'view';
    primaryPress = () => navigation.navigate('EntryDetail', { date });
  }

  // 7. Visuals
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

  const currentGradient = gradients[currentTheme as keyof typeof gradients] || gradients.light;

  // Toast Animation
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

    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility('Entry saved successfully');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.savedFrom === 'mood') {
        showToast();
        setTimeout(() => {
          try { navigation.setParams({ savedFrom: undefined }); } catch {}
        }, 0);
      }
    }, [route.params?.savedFrom, navigation])
  );

  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';
  const brand = '#6366F1';

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
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
      <LinearGradient
        colors={currentGradient.card}
        style={styles.contentCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        accessible={true}
        accessibilityRole="summary"
      >
{/* New Header: Greeting + Streak */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greetingSub, { color: textSub }]}>{getGreeting()},</Text>
            <Text style={[styles.greetingTitle, { color: textMain }]}>Ready to reflect?</Text>
          </View>
          
          <View style={[styles.streakBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFF7ED', borderColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Flame size={16} color="#F59E0B" fill="#F59E0B" />
            <Text style={[styles.streakText, { color: '#F59E0B' }]}>{streak || 0}</Text>
          </View>
        </View>

        {/* Prompt Card */}
        <View 
          style={[styles.promptCard, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)' }]}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel={`Today's journal prompt: ${todayPrompt.text}`}
        >
          <Text style={[styles.promptLabel, { color: brand }]}>TODAY'S PROMPT</Text>
          <Text 
            style={[styles.prompt, { color: textMain }]}
            accessibilityRole="text"
            accessibilityLabel={todayPrompt.text}
          >
            {todayPrompt.text}
          </Text>
          {todayPrompt.explanation ? (
            <Text style={[styles.promptExplanation, { color: textSub, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }]}>
              {todayPrompt.explanation}
            </Text>
          ) : null}
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
        >
          <Text style={[styles.customPromptText, { color: brand }]}>
            {today.isCustom ? 'Edit Custom Prompt' : 'Use Custom Prompt'}
          </Text>
        </PremiumPressable>

        {/* New Smart Prompt Button */}
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
          >
            <Text style={[styles.customPromptText, { color: brand }]}>
              {isGeneratingPrompt ? 'Generating...' : 'Generate New Smart Prompt'}
            </Text>
          </PremiumPressable>
        )}

        {/* Row: Start Journaling + History */}
        <View style={styles.row}>
          <PremiumPressable 
            onPress={primaryPress}
            haptic="light"
            style={[
              styles.btnPrimary,
              { 
                backgroundColor: currentVariant.bg,
                borderColor: currentVariant.bg, 
                flex: 1.2, 
              }
            ]}
          >
            <Text 
              style={[styles.btnPrimaryText, { color: currentVariant.text }]}
              numberOfLines={1} 
              adjustsFontSizeToFit={true}
            >
              {primaryLabel}
            </Text>
          </PremiumPressable>

          <PremiumPressable 
            onPress={() => navigation.navigate('MainTabs' as any)} // Actually History is in MainTabs, but we can navigate to the tab or screen depending on structure. For now, let's assume we just want to switch tabs or push if mapped.
            // FIX: RootStack has History removed, it's in MainTabs. We should navigate to the specific tab if possible, or relies on nested navigation.
            // Assuming we can navigate to the 'History' tab if we knew the tab name. 
            // Or simply use navigate('MainTabs', { screen: 'History' }) if typed.
            // For this snippet, let's just use navigation.navigate('History') if the types allow it (which they don't in RootStack).
            // Correct approach: navigate to the Tab.
            // Since TabNavigator isn't fully typed here, we'll cast or use a listener.
            // Actually, standard React Navigation behavior allows navigating to nested screens.
            // We'll cast to 'any' to bypass the strict Root check for this specific button until TabNavigator is fully typed.
            style={[styles.btnGhost, { flex: 0.8 }]}
          >
            {/* We actually need to navigate to the History Tab. Let's assume the listener in App.js or TabNavigator handles 'History' */}
             {/* Temporary fix: navigate to 'MainTabs' and let the user switch, OR cast to any to find the nested screen */}
            <Pressable onPress={() => (navigation as any).navigate('History')} style={{ width: '100%', alignItems: 'center' }}>
               <Text style={[styles.btnGhostText, { color: brand }]}>History</Text>
            </Pressable>
          </PremiumPressable>

        </View>

        {/* Shared Journals Link */}
        <PremiumPressable
          onPress={() => navigation.navigate("Invite")}
          haptic="light"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 16, 
            paddingHorizontal: 4,
            marginTop: 8,
            borderTopWidth: 1,
            borderTopColor: palette.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Users size={20} color={palette.subtleText} />
            <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>
              Shared Journals
            </Text>
          </View>
          <Text style={{ color: palette.subtleText, fontSize: 18, opacity: 0.5 }}>›</Text>
        </PremiumPressable>

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
        >
          <Text style={{ color: isDark ? '#A7F3D0' : '#065F46', fontWeight: '700' }}>
            Saved ✓
          </Text>
        </Animated.View>

        {/* Shared Journals List (Optional display) */}
        {sharedJournalsList.length > 0 && (
          <View
            style={[
              styles.card,
              { backgroundColor: palette.card, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.title, { color: palette.text }]}>
              Joined Journals
            </Text>
            {sharedJournalsList.map((j) => (
              <Pressable
                key={j.id}
                onPress={() => navigation.navigate("SharedJournal", { journalId: j.id })}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: palette.border,
                }}
              >
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: "600" }}>
                  {j.name}
                </Text>
                <Text style={{ color: palette.sub, fontSize: 12 }}>
                  {j.members?.length || 0} members
                </Text>
              </Pressable>
            ))}
          </View>
        )}

      </LinearGradient>
      </Animated.View>
      </SafeAreaView>
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
    marginTop: 10,
    padding: 16,
    borderRadius: 24,
    gap: 20,
  },
headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  streakText: {
    fontWeight: '800',
    fontSize: 14,
  },
  promptCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 10,
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.8,
  },
  // Kept for compatibility but unused in new layout
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  
  prompt: { 
    fontSize: 18, 
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '500',
  },
  promptExplanation: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  row: { 
    flexDirection: 'row', 
    gap: 8, 
    alignItems: 'center' 
  },
  btnPrimary: { 
    flex: 1.3, 
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  btnPrimaryText: { 
    fontWeight: '700',
    fontSize: 16,
  },
  btnGhost: { 
    flex: 0.7, 
    borderWidth: 1, 
    borderColor: 'rgba(99,102,241,0.3)', 
    paddingVertical: 14, 
    paddingHorizontal: 12,
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
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
});
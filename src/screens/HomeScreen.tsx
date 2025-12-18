import React, { useMemo, useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  useColorScheme, 
  Animated,
  AccessibilityInfo,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users } from 'lucide-react-native';
import { auth } from '../firebaseConfig';

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
import { Flame, Lock } from 'lucide-react-native'

// Components
import PremiumPressable from '../components/PremiumPressable';
import { registerForPushNotificationsAsync } from '../lib/notifications';

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
const { hapticsEnabled, isPremium } = useSettings(); // <--- Get isPremium

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

// Check Guest Status
  const isGuest = !auth.currentUser;

  const sharedJournalsList = useMemo(() => {
    if (isGuest) return []; // Hide journals for guests
    return Object.values(sharedJournals || {});
  }, [sharedJournals, isGuest]);

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
  // 6. Request Notifications (New)
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) console.log("Notification permissions granted");
    });
  }, []);

// 6. Determine CTA State
  const entryToday = map?.[date] || null;
  const draftText = drafts?.[date]?.text || '';

  // Use explicit isComplete flag if available, otherwise fallback to legacy check (text + mood)
  const hasFinal = entryToday?.isComplete ?? !!(entryToday?.text && entryToday?.moodTag?.value);

  const hasInProgress = !hasFinal && (
    (draftText && draftText.trim().length > 0) ||
    (entryToday?.text && entryToday.text.trim().length > 0)
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
      prompt: { text: todayPrompt.text, isSmart: todayPrompt.isSmart }, 
      text: seedText 
    });  
  } else if (hasFinal) {
    primaryLabel = "View Today's Entry";
    primaryVariant = 'view';
    primaryPress = () => navigation.navigate('EntryDetail', { date });
  } else {
    // Default: Start Journaling
    primaryLabel = 'Start Journaling';
    primaryVariant = 'default';
    primaryPress = () => navigation.navigate('Write', { 
      date, 
      prompt: { text: todayPrompt.text, isSmart: todayPrompt.isSmart }
    });
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
      accessibilityLabel="Micro Muse Home Screen"
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
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

{/* PROMPT SECTION: Card + Actions grouped to tighten spacing */}
        <View style={{ gap: 15 }}> 
          {/* Prompt Card */}
          <View 
            style={[
                styles.promptCard, 
                { 
                    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
                    marginBottom: 0 // <--- OVERRIDE: Remove default margin to let the wrapper control spacing
                }
            ]}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel={`Today's journal prompt: ${todayPrompt.text}`}
          >
            <Text style={[styles.promptLabel, { color: brand }]}>TODAY'S REFLECTION</Text>
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
          
{/* Prompt Actions Group */}
          <View style={{ gap: 2, alignItems: 'center' }}>
            
            {/* Custom Prompt Button - Only visible if entry is NOT finalized */}
            {!hasFinal && (
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
accessibilityLabel={today.isCustom ? 'Edit custom reflection' : 'Use custom reflection instead of today\'s reflection'}
              >
                <Text style={[styles.customPromptText, { color: brand }]}>
                  {today.isCustom ? 'Edit Custom Reflection' : 'Use Custom Reflection'}
                </Text>
              </PremiumPressable>
            )}

            {/* New Smart Prompt Button */}
{entries.length >= 3 && !today.isCustom && !hasFinal && (
              <PremiumPressable
                onPress={async () => {
                  // PREMIUM LOCK: Smart Prompt Regeneration
                  if (!isPremium) {
                    navigation.navigate('Premium');
                    return;
                  }

                  setIsGeneratingPrompt(true);
                  try {
                    const userData = analyzeForSmartPrompts(entries);
                    
                    // FORCE NEW: Try up to 5 times to ensure we get a DIFFERENT prompt
                    let newPrompt = '';
                    let attempts = 0;
                    do {
                        newPrompt = generateSmartPrompt(userData);
                        attempts++;
                    } while (newPrompt === todayPrompt.text && attempts < 5);

                    const explanation = getPromptExplanation(newPrompt, userData);
                    
                    // 1. Update UI with new prompt
                    setTodayPrompt({
                      text: newPrompt,
                      explanation: explanation,
                      isSmart: true
                    });

                    // 2. RESET DAY: Clear everything to give a fresh start
                    // A. Clear the temporary draft
                    useEntriesStore.getState().setDraft(date, ''); 
                    
                    // B. Clear the saved entry (Text, Mood, Image)
                    useEntriesStore.getState().upsert({
                        date,
                        text: '',
                        moodTag: null as any, 
                        imageUri: null as any
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
                  { opacity: isGeneratingPrompt ? 0.6 : 1, flexDirection: 'row', gap: 6, alignItems: 'center' }
                ]}
                accessible={true}
                accessibilityRole="button"
              >
                {!isPremium && <Lock size={12} color={brand} />}
<Text style={[styles.customPromptText, { color: brand }]}>
                  {isGeneratingPrompt ? 'Generating...' : 'Generate New Reflection'}
                </Text>
              </PremiumPressable>
            )}
          </View>
        </View>

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

{/* GROUPED SECTION: Integrated Shared Journals Card */}
        <View style={[styles.card, { 
          backgroundColor: palette.card, 
          borderColor: palette.border, 
          padding: 0, 
          marginTop: 16, 
          overflow: 'hidden' 
        }]}>
{/* Header / Main Action (Always visible) */}
          <PremiumPressable
            onPress={() => isGuest ? navigation.navigate("Auth" as any) : navigation.navigate("Invite")}
            haptic="light"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Users size={20} color={palette.text} />
              <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600' }}>
                Shared Journals
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {sharedJournalsList.length === 0 && (
                <Text style={{ color: palette.sub, fontSize: 13 }}>
                  {isGuest ? "Login to Join" : "Create or Join"}
                </Text>
              )}
              <Text style={{ color: palette.subtleText, fontSize: 18, opacity: 0.5 }}>›</Text>
            </View>
          </PremiumPressable>

          {/* List of Joined Journals (Rendered inside the same card) */}
          {sharedJournalsList.length > 0 && (
            <View>
              <View style={{ height: 1, backgroundColor: palette.border, marginLeft: 52 }} />
              {sharedJournalsList.map((j) => (
                <Pressable
                  key={j.id}
                  onPress={() => navigation.navigate('JournalList')}
                  style={({ pressed }) => ({
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    paddingLeft: 52, // Indent to align with text above
                    backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : 'transparent',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  })}
                >
                  <View>
<Text style={{ color: palette.text, fontSize: 15, fontWeight: "500" }}>
                      {j.name}
                    </Text>
                    <Text style={{ color: palette.sub, fontSize: 12, marginTop: 2 }}>
                      {j.memberIds?.length || j.members?.length || 0} member{(j.memberIds?.length || j.members?.length) !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* 3. Toast (Moved outside the flow) */}
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

        </ScrollView>
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
    borderRadius: 24,
    overflow: 'hidden',
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
  scrollContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 60, // <--- THIS is the safe spacing you asked for!
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
    position: 'absolute', // Float over content
    bottom: 20,           // Stick to bottom
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    zIndex: 100,          // Ensure it's on top
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
    marginTop: 0,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
});
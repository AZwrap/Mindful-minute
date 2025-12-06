import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useColorScheme,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Mic, Square, Play, Trash2, RotateCcw } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

// Navigation & Types
import { RootStackParamList } from '../navigation/RootStack';

// Components
import Timer from '../components/Timer';
import BreathingCircle from '../components/BreathingCircle';
import PremiumPressable from '../components/PremiumPressable';

// Stores & Logic
import { useEntriesStore } from "../stores/entriesStore";
import { useSettings } from '../stores/settingsStore';
import { useTheme } from '../stores/themeStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { useProgress } from '../stores/progressStore';
import { useWritingSettings } from "../stores/writingSettingsStore";

import { getMoodSuggestions } from '../utils/autoTagger';
import {
  generateSmartPrompt,
  analyzeForSmartPrompts,
  getPromptExplanation,
} from '../utils/smartPrompts';
import { getCoachingTip } from '../utils/coachingEngine';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type Props = NativeStackScreenProps<RootStackParamList, 'Write'>;

interface SmartPrompt {
  text: string;
  isSmart: boolean;
  explanation?: string;
}

interface Suggestion {
  mood: string;
  confidence?: number;
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function WriteScreen({ navigation, route }: Props) {
  // 1. MOUNT REF
  const mounted = useRef(false);
  const isScreenActive = useRef(true);

  // --- THEME & PALETTE ---
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const palette = useSharedPalette(); 

  // Extract params safely
  const { date, prompt, text: initialText } = route.params;

  // --- VOICE MEMO STATE ---
  const [recording, setRecording] = useState<Audio.Recording | undefined | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- VOICE LOGIC ---
  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission Denied", "Allow microphone access.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);
    } catch (err) { console.error("Failed to start recording", err); }
  }

  async function stopRecording() {
    if (!recording) return;
    try {
        setRecording(undefined); // Clear state immediately
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setAudioUri(uri);
    } catch(err) { console.error(err); }
  }

  async function playSound() {
    if (sound) { 
      await sound.stopAsync(); 
      setIsPlaying(false); 
      return; 
    }
    
    if (!audioUri) return;

    try {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(newSound);
      setIsPlaying(true);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) { 
          setIsPlaying(false); 
          setSound(null); 
        }
      });
    } catch (e) { console.log("Play error", e); }
  }

  const deleteRecording = async () => {
    if (sound) { await sound.unloadAsync(); }
    setAudioUri(null);
    setSound(null);
    setIsPlaying(false);
  };

  useEffect(() => { return () => { if (sound) sound.unloadAsync(); }; }, [sound]);

  // ===== SMART PROMPT =====
  const map = useEntriesStore((s) => s.entries);
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([d, entry]) => ({ date: d, ...entry }));
  }, [map]);

  const [smartPrompt, setSmartPrompt] = useState<SmartPrompt | null>(null);

  useEffect(() => {
    if (entries.length >= 3) {
      const userData = analyzeForSmartPrompts(entries);
      const newSmartPrompt = generateSmartPrompt(userData);
      if (smartPrompt?.text !== newSmartPrompt) {
        const explanation = getPromptExplanation(newSmartPrompt, userData);
        setSmartPrompt({ text: newSmartPrompt, explanation, isSmart: true });
      }
    }
  }, [entries.length]); 

  const currentPrompt = smartPrompt || prompt;

  // ===== STATE =====
  const [text, setText] = useState(initialText || '');
  const [gratitudeEntries, setGratitudeEntries] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState('');
  const gratitudeModeEnabled = useSettings((s) => s.gratitudeModeEnabled);
  const [isGratitudeExpanded, setIsGratitudeExpanded] = useState(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [running, setRunning] = useState(true);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [wordCount, setWordCount] = useState(
    () => (initialText || '').trim().split(/\s+/).filter((w) => w.length > 0).length
  );
  const [suggestedMoods, setSuggestedMoods] = useState<Suggestion[]>([]);
  const [selectedSuggestedMood, setSelectedSuggestedMood] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  // COACHING STATE
  const [coachMessage, setCoachMessage] = useState('');
  const [showCoach, setShowCoach] = useState(false);
  const coachFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!text) return;
    const timeout = setTimeout(() => {
      const tip = getCoachingTip(text, coachMessage);
      if (tip && tip !== coachMessage) {
        setCoachMessage(tip);
        setShowCoach(true);
        Animated.timing(coachFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        
        // Show for 12 seconds
        setTimeout(() => {
          Animated.timing(coachFade, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setShowCoach(false));
        }, 12000);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [text]);

  // ===== ANIMATIONS =====
  const scrollRef = useRef<ScrollView>(null);
  const [sectionPositions, setSectionPositions] = useState({ editor: 0, gratitude: 0 });
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  const handleInputFocusAnim = (to: number) => {
    Animated.timing(inputFocusAnim, { toValue: to, duration: 200, useNativeDriver: true }).start();
  };

  const animatedInputStyle = {
    borderColor: inputFocusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [palette.border, palette.accent],
    }),
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  };

  // ===== POMODORO & TIMER STATE =====
  const [phase, setPhase] = useState<'writing' | 'break'>('writing');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [skipBreakAvailable, setSkipBreakAvailable] = useState(false);

  const setDraft = useEntriesStore((s) => s.setDraft);
  const getDraftTimer = useEntriesStore((s) => s.getDraftTimer);
  const setDraftTimer = useEntriesStore((s) => s.setDraftTimer);
  const upsert = useEntriesStore((s) => s.upsert);
  const getPomodoroState = useEntriesStore((s) => s.getPomodoroState);

  const { writeDuration, breakDuration, totalCycles, showTimer, setShowTimer } = useWritingSettings();
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const preserveTimerProgress = useSettings((s) => s.preserveTimerProgress);

  const [remaining, setRemaining] = useState(writeDuration);

  const playCompletionFeedback = () => {
    if (!isScreenActive.current) return;
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const fade = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // ===== TIMER INIT =====
  useEffect(() => {
    const initializeTimer = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const storedTimer = preserveTimerProgress ? getDraftTimer(date) : null;
      const storedPomodoroState = preserveTimerProgress ? getPomodoroState(date) : null;

      if (preserveTimerProgress && storedTimer !== null && storedTimer > 0) {
        setRemaining(storedTimer);
        if (storedPomodoroState) {
          setPhase(storedPomodoroState.mode || 'writing');
          setCurrentCycle(storedPomodoroState.cyclesCompleted || 1);
          setSkipBreakAvailable(storedPomodoroState.mode === 'break');
        }
      } else {
        setRemaining(writeDuration);
      }
      setRunning(true);
      setIsInitialLoad(false);
    };
    if (isInitialLoad) initializeTimer();
  }, [isInitialLoad, date, preserveTimerProgress]);

  useEffect(() => {
    if (!isInitialLoad) {
      setRunning(false);
      setRemaining(writeDuration);
      setPhase('writing');
      setCurrentCycle(1);
      setTimeout(() => setRunning(true), 50);
    }
  }, [writeDuration]);

  // Pulse Animation
  useEffect(() => {
    if (!running) { pulse.setValue(1); return; }
    const boxBreathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 4000, useNativeDriver: true }),
      ])
    );
    boxBreathing.start();
    return () => boxBreathing.stop();
  }, [running]);

  // ===== MOUNT / FOCUS =====
  useEffect(() => {
    mounted.current = true;
    isScreenActive.current = true;
    return () => {
      mounted.current = false;
      isScreenActive.current = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setRunning(true);
      isScreenActive.current = true;
      return () => { setRunning(false); isScreenActive.current = false; };
    }, [])
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height || 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ===== SAFE TIMER TICK =====
  const handleTick = (t: number) => {
    if (!mounted.current) return;
    
    requestAnimationFrame(() => {
        if (!isScreenActive.current) return;
        
        setRemaining(t);

        if (preserveTimerProgress) {
           setDraftTimer(date, t, { 
               mode: phase, 
               cyclesCompleted: currentCycle, 
               timeLeft: t,
               isActive: running
           });
        } else {
           setDraftTimer(date, t);
        }

        if (t <= 0) {
          if (phase === 'writing') {
            setPhase('break');
            setRemaining(breakDuration);
            setSkipBreakAvailable(true);
            if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Medium);
          } else {
            setCurrentCycle((prev) => prev + 1);
            if (currentCycle >= totalCycles) {
              setRunning(false);
              setTimerCompleted(true);
              playCompletionFeedback();
              Animated.timing(fade, { toValue: 0, duration: 600, useNativeDriver: true }).start();
            } else {
              setPhase('writing');
              setRemaining(writeDuration);
              setSkipBreakAvailable(false);
              if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
            }
          }
        }
    });
  };

  const skipBreak = () => {
    if (phase === 'break' && skipBreakAvailable) {
      const nextCycle = currentCycle + 1;
      if (nextCycle > totalCycles) {
        setRunning(false);
        setTimerCompleted(true);
        playCompletionFeedback();
      } else {
        setPhase('writing');
        setRemaining(writeDuration);
        setCurrentCycle(nextCycle);
        setSkipBreakAvailable(false);
      }
    }
  };

  useEffect(() => {
    const id = setTimeout(() => setDraft(date, text), 2000);
    return () => clearTimeout(id);
  }, [date, text]);

  const handleReset = () => {
    setRunning(false);
    setRemaining(writeDuration);
    setPhase('writing');
    setCurrentCycle(1);
    setSkipBreakAvailable(false);
    setDraftTimer(date, writeDuration);
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    setTimeout(() => setRunning(true), 100);
  };

  // --- SAVE & EXIT HANDLERS ---
const saveAndExit = () => {
    if (!text.trim() && !audioUri) return;
    
    // FIX: Save 'currentPrompt' (which contains the Smart Prompt)
    upsert({ 
        date, 
        text: text.trim(), 
        prompt: { text: currentPrompt?.text || '' }, 
        createdAt: Date.now() as any, 
        isComplete: false, 
        audioUri 
    });
    
    if (!preserveTimerProgress) setDraftTimer(date, writeDuration);
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  };

  const continueToMood = async () => {
    if (!text.trim() && !audioUri) {
      Alert.alert("Empty", "Please write something or record audio first.");
      return;
    }
    const completedGratitudeItems = gratitudeEntries.filter((entry) => entry?.trim()).length;
    const isGratitudeEntry = completedGratitudeItems >= 2;
    const xpBonus = isGratitudeEntry ? 10 : 0;

    if (isGratitudeEntry) useProgress.getState().incrementTotalEntries(); 

    // Save locally
upsert({
      date, 
      text: text.trim(), 
      prompt: { text: currentPrompt?.text || '' }, 
      createdAt: Date.now() as any,
      isComplete: false,
      isGratitude: isGratitudeEntry, 
      gratitudeItems: gratitudeEntries.filter(e => e?.trim()), 
      xpBonus, 
      audioUri
    });

    if (xpBonus > 0) showToast('+10 XP Gratitude Bonus!');
    
    // Pass selected mood and prompt text to next screen
setTimeout(() => {
      navigation.navigate('MoodTag', { 
          date, 
          text, 
          prompt: currentPrompt?.text || '', // Pass the string directly
          savedFrom: 'Write',
          initialMood: selectedSuggestedMood || undefined,
      });
    }, 50);
  };

  const handleTextChange = (newText: string) => {    
    setText(newText);
    setWordCount(newText.trim().split(/\s+/).filter(w => w.length > 0).length);
    
    // Trigger suggestion logic after 2 chars
    if (newText.length > 2) {
      setSuggestedMoods(getMoodSuggestions(newText));
    } else {
      setSuggestedMoods([]);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const gradients = {
    dark: { primary: ['#0F172A', '#1E293B', '#334155'], card: ['rgba(30, 41, 59, 0.6)', 'rgba(15, 23, 42, 0.8)'] },
    light: { primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'], card: ['rgba(241, 245, 249, 0.8)', 'rgba(248, 250, 252, 0.9)'] },
  };
  const currentGradient = gradients[currentTheme as keyof typeof gradients] || gradients.light;
  const promptColor = palette.text; 

  const content = (
    <LinearGradient colors={currentGradient.primary} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 + keyboardHeight }]} keyboardShouldPersistTaps="handled">
          <View style={styles.contentCard}>
            {/* PROMPT */}
            <Text style={[styles.prompt, { color: promptColor }]}>
              {currentPrompt?.text}
              {currentPrompt?.explanation && (
                <Text style={{ fontSize: 12, color: palette.subtleText, fontStyle: 'italic' }}>
                  {'\n'}💡 {currentPrompt.explanation}
                </Text>
              )}
            </Text>

            <Animated.View style={[{ opacity: fade }, styles.timerContainer]}>
              {showTimer && (
                <View style={styles.timerRow}>
                  <View style={{ marginRight: 20 }}>
                  <PremiumPressable onPress={handleReset} style={[styles.resetBtn, { backgroundColor: palette.card }]}>
                    <RotateCcw size={18} color={palette.accent} />
                  </PremiumPressable>
                  </View>
                  <View style={[styles.timerPill, { backgroundColor: phase === 'writing' ? palette.card : 'rgba(34,197,94,0.1)', height: phase === 'break' && skipBreakAvailable ? 115 : 90 }]}>
                    <View style={styles.phaseIndicator}>
                      <Text style={[styles.phaseText, { color: phase === 'writing' ? palette.accent : '#16A34A' }]}>{phase === 'writing' ? '🖊️ Writing' : '⏸️ Break'}</Text>
                      <Text style={[styles.cycleText, { color: palette.subtleText }]}>Cycle {currentCycle}/{totalCycles}</Text>
                    </View>
                    <Timer seconds={remaining} running={running} onTick={handleTick} />
                    <Text style={[styles.timerStatus, { color: running ? palette.accent : palette.subtleText }]}>{running ? (phase === 'writing' ? 'Writing' : 'Break') : 'Paused'}</Text>
                    {phase === 'break' && skipBreakAvailable && (
                      <PremiumPressable onPress={skipBreak} style={[styles.skipButton, { backgroundColor: palette.card }]}>
                        <Text style={[styles.skipText, { color: palette.accent }]}>Skip Break</Text>
                      </PremiumPressable>
                    )}
                  </View>
                  <View style={{ transform: [{ translateX: 24 }, { translateY: 8 }] }}>
                    <BreathingCircle running={running} isDark={isDark} />
                  </View>
                </View>
              )}
            </Animated.View>

            {!timerCompleted && (
              <PremiumPressable onPress={() => setShowTimer(!showTimer)} style={styles.toggle}>
                <Text style={{ color: palette.accent, fontWeight: '500' }}>{showTimer ? 'Hide Timer' : 'Show Timer'}</Text>
              </PremiumPressable>
            )}

            {showCoach && (
              <Animated.View style={[styles.coachContainer, { opacity: coachFade }]}>
                <View style={[styles.coachBubble, { backgroundColor: palette.card }]}>
                  <Text style={[styles.coachText, { color: palette.accent }]}>{coachMessage}</Text>
                </View>
              </Animated.View>
            )}

            <Animated.View style={[animatedInputStyle, { marginTop: timerCompleted ? -120 : 2, borderRadius: 14 }]}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setSectionPositions((prev) => ({ ...prev, editor: y }));
              }}
            >
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={handleTextChange}
                onFocus={() => {
                  handleInputFocusAnim(1);
                  if (scrollRef.current) scrollRef.current.scrollTo({ y: Math.max(0, sectionPositions.editor - 40), animated: true });
                }}
                onBlur={() => handleInputFocusAnim(0)}
                placeholder="Take a minute to breathe and write…"
                placeholderTextColor={palette.subtleText}
                multiline
                style={[styles.input, { color: palette.text, backgroundColor: palette.card, borderWidth: 0 }]}
              />
              {/* VOICE CONTROLS */}
              <View style={{ marginTop: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 }}>
                {!audioUri ? (
                  <PremiumPressable onPress={recording ? stopRecording : startRecording} style={{ backgroundColor: recording ? '#EF4444' : palette.card, borderColor: recording ? '#EF4444' : palette.border, borderWidth: 1, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {recording ? <Square size={20} color="white" /> : <Mic size={20} color={palette.text} />}
                    <Text style={{ color: recording ? 'white' : palette.text, fontWeight: '600' }}>{recording ? "Stop Recording" : "Record Voice Note"}</Text>
                  </PremiumPressable>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                    
                    <PremiumPressable onPress={playSound} style={{ flex: 1, backgroundColor: palette.accent, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Play size={20} fill={isPlaying ? "white" : "transparent"} color="white" />
                      <Text style={{ color: 'white', fontWeight: '700' }}>{isPlaying ? "Stop" : "Play Recording"}</Text>
                    </PremiumPressable>
                    <PremiumPressable onPress={deleteRecording} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card }}>
                      <Trash2 size={20} color="#EF4444" />
                    </PremiumPressable>
                  </View>
                )}
              </View>

              {/* MOOD SUGGESTIONS INSIDE */}
              <View style={styles.bottomRowContainer}>
                {suggestedMoods.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <Text style={[styles.suggestionsLabel, { color: palette.subtleText }]}>Suggested moods:</Text>
                    <View style={styles.suggestionsRow}>
                      {suggestedMoods.map((suggestion) => (
                        <Pressable
                          key={suggestion.mood}
                          onPress={() => setSelectedSuggestedMood(selectedSuggestedMood === suggestion.mood ? null : suggestion.mood)}
                          style={[
                            styles.suggestionChip, 
                            { 
                              backgroundColor: selectedSuggestedMood === suggestion.mood ? palette.accent + '40' : palette.card, 
                              borderColor: selectedSuggestedMood === suggestion.mood ? palette.accent : palette.border, 
                              borderWidth: selectedSuggestedMood === suggestion.mood ? 2 : 1 
                            }
                          ]}
                        >
                          <Text style={[styles.suggestionText, { color: palette.accent, fontWeight: '700' }]}>
                            {suggestion.mood}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.wordCountContainer}>
                  <Text style={[styles.wordCount, { color: palette.subtleText }]}>{wordCount} word{wordCount !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </Animated.View>

          {/* FOCUS MODE */}
          <PremiumPressable
            onPress={() => navigation.navigate('FocusWrite', { date, prompt: currentPrompt, text })}
            haptic="light"
            style={[styles.focusButton, { backgroundColor: palette.accent + '10', borderColor: palette.accent + '30', marginTop: 12 }]}
          >
            <Text style={[styles.focusButtonText, { color: palette.accent }]}>Enter Focus Mode</Text>
          </PremiumPressable>

          {/* GRATITUDE SECTION */}
          {(gratitudeModeEnabled || currentPrompt?.text?.toLowerCase().includes('grateful') || currentPrompt?.text?.toLowerCase().includes('thankful')) && (
            <View
              style={[
                styles.gratitudeContainer,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
              onLayout={(e) => {
                const layoutY = e.nativeEvent.layout.y;
                setSectionPositions((prev) => ({ ...prev, gratitude: layoutY }));
              }}
            >
              <Pressable
                onPress={() => {
                  setIsGratitudeExpanded((prev) => !prev);
                  if (!isGratitudeExpanded && scrollRef.current) {
                    scrollRef.current.scrollTo({ y: Math.max(0, sectionPositions.gratitude - 40), animated: true });
                  }
                }}
                style={styles.gratitudeHeader}
              >
                <Text style={[styles.gratitudeTitle, { color: palette.accent }]}>
                  Gratitude Practice {isGratitudeExpanded ? '▲' : '▼'}
                </Text>
                <Text style={[styles.gratitudeSubtitle, { color: palette.subtleText }]}>+10 XP bonus available</Text>
              </Pressable>

              {isGratitudeExpanded && (
                <>
                  <Text style={[styles.gratitudeDescription, { color: palette.subtleText }]}>List 3 specific things you're grateful for today:</Text>
                  {[1, 2, 3].map((num, index) => (
                    <View key={num} style={styles.gratitudeInputRow}>
                      <Text style={[styles.gratitudeNumber, { color: palette.accent }]}>{num}.</Text>
                      <TextInput
                        style={[styles.gratitudeInput, { color: palette.text, backgroundColor: palette.bg, borderColor: palette.border }]}
                        placeholder={`Gratitude #${num}...`}
                        placeholderTextColor={palette.subtleText}
                        value={gratitudeEntries[index] || ''}
                        onChangeText={(txt) => {
                          const next = [...gratitudeEntries];
                          next[index] = txt;
                          setGratitudeEntries(next);
                        }}
                      />
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* ACTIONS */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <PremiumPressable onPress={() => setRunning((r) => !r)} style={[styles.btnGhost, { borderColor: palette.subtleText }]}>
              <Text style={[styles.btnGhostText, { color: palette.text }]}>{running ? 'Pause' : 'Resume'}</Text>
            </PremiumPressable>

            <PremiumPressable onPress={saveAndExit} style={[styles.btnGhost, { borderColor: palette.accent }]}><Text style={[styles.btnGhostText, { color: palette.accent }]}>Save & Exit</Text></PremiumPressable>
            <PremiumPressable onPress={continueToMood} style={[styles.btnPrimary, { backgroundColor: palette.accent }]}><Text style={styles.btnPrimaryText}>Continue</Text></PremiumPressable>
          </View>
        </View>

        {toastMessage ? (
          <View style={[styles.toast, { backgroundColor: palette.accent }]}>
            <Text style={[styles.toastText, { color: 'white' }]}>{toastMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );

  if (Platform.OS === 'ios') return <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={90}>{content}</KeyboardAvoidingView>;
  return content;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentCard: { flex: 1, margin: 1, padding: 20, borderRadius: 24, minHeight: '100%' },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  prompt: { fontSize: 16, lineHeight: 22, marginBottom: 6, textAlign: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 0, justifyContent: 'center', paddingHorizontal: 0 },
  timerPill: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, borderWidth: 0, alignItems: 'center', justifyContent: 'center', minWidth: 140 },
  timerStatus: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  resetBtn: { padding: 6, borderRadius: 12 },
  toggle: { alignSelf: 'center', marginBottom: 10 },
  input: { minHeight: 180, padding: 14, borderRadius: 14, borderWidth: 0, textAlignVertical: 'top' },
  btnPrimary: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  btnPrimaryText: { color: 'white', fontWeight: '700' },
  btnGhost: { borderWidth: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  btnGhostText: { fontWeight: '700', textAlign: 'center' },
  wordCountContainer: { alignItems: 'flex-end', justifyContent: 'flex-start', minWidth: 60 },
  wordCount: { fontSize: 12, fontWeight: '600' },
  phaseIndicator: { alignItems: 'center', marginBottom: 2, minHeight: 24 },
  phaseText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, height: 16 },
  cycleText: { fontSize: 10, fontWeight: '600' },
  skipButton: { marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  skipText: { fontSize: 10, fontWeight: '600' },
  timerContainer: { height: 140, justifyContent: 'center' },
  suggestionsContainer: { flex: 1, marginRight: 12 },
  suggestionsLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
  suggestionText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  confidenceText: { fontSize: 10, fontWeight: '500', opacity: 0.7 },
  bottomRowContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, marginBottom: 8, minHeight: 40 },
  focusButton: { borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  focusButtonText: { fontSize: 14, fontWeight: '600' },
  gratitudeContainer: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12, marginTop: 8 },
  gratitudeHeader: { padding: 4 },
  gratitudeTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  gratitudeSubtitle: { fontSize: 12, textAlign: 'center', marginTop: 2, opacity: 0.8 },
  gratitudeDescription: { fontSize: 14, marginBottom: 12, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  gratitudeInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  gratitudeNumber: { fontSize: 14, fontWeight: '600', width: 24, marginRight: 8 },
  gratitudeInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  gratitudeBenefits: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(99, 102, 241, 0.2)' },
  gratitudeBenefit: { fontSize: 12, marginBottom: 4 },
  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, zIndex: 1000 },
  toastText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  coachContainer: { alignItems: 'center', marginBottom: 12, zIndex: 10 },
  coachBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, gap: 8 },
  coachText: { fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
});
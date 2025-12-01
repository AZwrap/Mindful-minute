// src/screens/WriteScreen.js
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { RotateCcw } from 'lucide-react-native';
import Timer from '../components/Timer';
import { useEntriesStore } from "../stores/entriesStore";
import { useSettings } from '../stores/settingsStore';
import { useTheme } from '../stores/themeStore';
import BreathingCircle from '../components/BreathingCircle';
import PremiumPressable from '../components/PremiumPressable';
import { getMoodSuggestions } from '../utils/autoTagger';
import {
  generateSmartPrompt,
  analyzeForSmartPrompts,
  getPromptExplanation,
} from '../utils/smartPrompts';
import { useProgress } from '../stores/progressStore';
import { useWritingSettings } from "../stores/writingSettingsStore";
import { getCoachingTip } from '../utils/coachingEngine';

export default function WriteScreen({ navigation, route }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const { date, prompt } = route.params || {};

  // ===== SMART PROMPT =====
  const map = useEntriesStore((s) => s.map);
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([d, entry]) => ({ date: d, ...entry }));
  }, [map]);

  const [smartPrompt, setSmartPrompt] = useState(null);

  useEffect(() => {
    if (entries.length >= 3) {
      const userData = analyzeForSmartPrompts(entries);
      const newSmartPrompt = generateSmartPrompt(userData);
      
      // Prevent infinite loop by checking if prompt actually changed
      if (smartPrompt?.text !== newSmartPrompt) {
        const explanation = getPromptExplanation(newSmartPrompt, userData);
        setSmartPrompt({
          text: newSmartPrompt,
          explanation,
          isSmart: true,
        });
      }
    }
  }, [entries]);

  const currentPrompt = smartPrompt || prompt;

  // ===== STATE =====
  const [text, setText] = useState(route.params?.text || '');
  const [gratitudeEntries, setGratitudeEntries] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const gratitudeModeEnabled = useSettings((s) => s.gratitudeModeEnabled);
  const [isGratitudeExpanded, setIsGratitudeExpanded] = useState(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [running, setRunning] = useState(true);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [wordCount, setWordCount] = useState(
    () =>
      (route.params?.text || '')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length
  );
  const [suggestedMoods, setSuggestedMoods] = useState([]);
  const [selectedSuggestedMood, setSelectedSuggestedMood] = useState(null);

  const inputRef = useRef(null);

  // COACHING STATE
  const [coachMessage, setCoachMessage] = useState('');
  const [showCoach, setShowCoach] = useState(false);
  const coachFade = useRef(new Animated.Value(0)).current;

  // Trigger coaching logic
  useEffect(() => {
    if (!text) return;
    
    // Debounce the coach so it doesn't flicker while typing fast
    const timeout = setTimeout(() => {
      const tip = getCoachingTip(text, coachMessage);
      
      if (tip && tip !== coachMessage) {
        setCoachMessage(tip);
        setShowCoach(true);
        
        // Fade in
        Animated.timing(coachFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();

        // Auto-hide after 5 seconds
        setTimeout(() => {
          Animated.timing(coachFade, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true
          }).start(() => setShowCoach(false));
        }, 5000);
      }
    }, 1500); // Wait 1.5s after typing stops

    return () => clearTimeout(timeout);
  }, [text]);

  // ===== SCROLL & SECTION POSITIONS =====
  const scrollRef = useRef(null);
  const [sectionPositions, setSectionPositions] = useState({
    editor: 0,
    gratitude: 0,
  });

  // ===== INPUT FOCUS ANIMATION =====
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  const handleInputFocusAnim = (to) => {
    Animated.timing(inputFocusAnim, {
      toValue: to,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const animatedInputStyle = {
    borderColor: inputFocusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [isDark ? '#1F2937' : '#E2E8F0', '#6366F1'],
    }),
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: inputFocusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.1],
    }),
    shadowRadius: inputFocusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 8],
    }),
    transform: [
      {
        scale: inputFocusAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.002],
        }),
      },
    ],
    elevation: inputFocusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    }),
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  };

  // ===== POMODORO STATE =====
  const [phase, setPhase] = useState('writing'); // 'writing' | 'break'
  const [currentCycle, setCurrentCycle] = useState(1);
  const [skipBreakAvailable, setSkipBreakAvailable] = useState(false);
  const isScreenActive = useRef(true);

  // ===== STORES =====
  const setDraft = useEntriesStore((s) => s.setDraft);
  const getDraftTimer = useEntriesStore((s) => s.getDraftTimer);
  const setDraftTimer = useEntriesStore((s) => s.setDraftTimer);
  const upsert = useEntriesStore((s) => s.upsert);
  const getDraft = useEntriesStore((s) => s.getDraft);
  const getPomodoroState = useEntriesStore((s) => s.getPomodoroState);

  const {
    writeDuration,
    breakDuration,
    totalCycles,
    showTimer,
    setShowTimer
  } = useWritingSettings();

  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const soundEnabled = useSettings((s) => s.soundEnabled);
  const preserveTimerProgress = useSettings((s) => s.preserveTimerProgress);

  const [remaining, setRemaining] = useState(writeDuration);

  const playCompletionFeedback = () => {
    if (!isScreenActive.current) return;
    if (soundEnabled && hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  // ===== ANIMATIONS =====
  const fade = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const resetAnim = useRef(new Animated.Value(1)).current;

  // ===== INITIAL TIMER LOAD =====
  useEffect(() => {
    const initializeTimer = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const storedTimer = preserveTimerProgress ? getDraftTimer(date) : null;
      const draftText = getDraft(date);
      const storedPomodoroState = preserveTimerProgress
        ? getPomodoroState(date)
        : null;

      let initialTime;
      const hasDraftText = draftText && draftText.length > 0;

      if (preserveTimerProgress && storedTimer !== null && storedTimer > 0) {
        initialTime = storedTimer;

        if (storedPomodoroState) {
          setPhase(storedPomodoroState.phase || 'writing');
          setCurrentCycle(storedPomodoroState.currentCycle || 1);
          setSkipBreakAvailable(
            storedPomodoroState.skipBreakAvailable || false
          );
        }
      } else if (!hasDraftText) {
        initialTime = writeDuration;
      } else {
        initialTime = writeDuration;
      }

      setRemaining(initialTime);
      setRunning(true);

      if (!preserveTimerProgress || !hasDraftText) {
        setPhase('writing');
        setCurrentCycle(1);
        setSkipBreakAvailable(false);
      }

      setIsInitialLoad(false);
    };

    if (isInitialLoad) {
      initializeTimer();
    }
  }, [isInitialLoad, date, preserveTimerProgress]);

  // ===== HANDLE WRITE DURATION CHANGES =====
  useEffect(() => {
    if (!isInitialLoad) {
      setRunning(false);
      setRemaining(writeDuration);

      const pomodoroState = {
        phase,
        currentCycle,
        skipBreakAvailable,
        totalCycles,
      };
      setDraftTimer(date, writeDuration, pomodoroState);

      if (!preserveTimerProgress) {
        setPhase('writing');
        setCurrentCycle(1);
        setSkipBreakAvailable(false);
      }

      setTimeout(() => setRunning(true), 50);
    }
  }, [writeDuration]);

  // ===== BOX BREATHING / PULSE =====
  useEffect(() => {
    if (!running) {
      pulse.setValue(1);
      return;
    }

    const boxBreathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    boxBreathing.start();

    return () => {
      boxBreathing.stop();
    };
  }, [running, pulse]);

  // ===== MOUNT / UNMOUNT =====
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    isScreenActive.current = true;
    return () => {
      mounted.current = false;
      isScreenActive.current = false;
    };
  }, []);

  // ===== FOCUS EFFECT =====
  useFocusEffect(
    React.useCallback(() => {
      isScreenActive.current = true;
      return () => {
        isScreenActive.current = false;
      };
    }, [])
  );

  // ===== HANDLE TEXT FROM ROUTE (FOCUS MODE RETURN) =====
  useEffect(() => {
    // Only update if we have new text and it is different from current text
    if (route.params?.text !== undefined && route.params.text !== text) {
      setText(route.params.text);

      if (route.params?.fromFocusMode || route.params?.text?.trim().length > 0) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [route.params?.text, route.params?.fromFocusMode]);

  // ===== KEYBOARD LISTENERS (ANDROID-FRIENDLY) =====
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height || 0);
    });

    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // ===== TIMER TICK =====
  const handleTick = (t) => {
    if (!mounted.current) return;

    requestAnimationFrame(() => {
      setRemaining(t);

      if (preserveTimerProgress) {
        const pomodoroState = {
          phase,
          currentCycle,
          skipBreakAvailable,
          totalCycles,
        };
        setDraftTimer(date, t, pomodoroState);
      } else {
        setDraftTimer(date, t);
      }

      if (t <= 0) {
        if (phase === 'writing') {
          const nextBreakDuration = breakDuration;

          setPhase('break');
          setRemaining(nextBreakDuration);
          setSkipBreakAvailable(true);

          if (preserveTimerProgress) {
            const pomodoroState = {
              phase: 'break',
              currentCycle,
              skipBreakAvailable: true,
              totalCycles,
            };
            setDraftTimer(date, nextBreakDuration, pomodoroState);
          }

          if (hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Medium);
          }
        } else {
          setCurrentCycle((prev) => prev + 1);

          if (currentCycle >= totalCycles) {
            setRunning(false);
            setTimerCompleted(true);
            if (soundEnabled || hapticsEnabled) {
              playCompletionFeedback();
            }
            Animated.timing(fade, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }).start();
          } else {
            setPhase('writing');
            setRemaining(writeDuration);
            setSkipBreakAvailable(false);

            if (preserveTimerProgress) {
              const pomodoroState = {
                phase: 'writing',
                currentCycle: currentCycle + 1,
                skipBreakAvailable: false,
                totalCycles,
              };
              setDraftTimer(date, writeDuration, pomodoroState);
            }

            if (hapticsEnabled) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
            }
          }
        }
      }
    });
  };

  // ===== SKIP BREAK =====
  const skipBreak = () => {
    if (phase === 'break' && skipBreakAvailable) {
      const nextCycle = currentCycle + 1;

      if (nextCycle > totalCycles) {
        setRunning(false);
        setTimerCompleted(true);
        if (soundEnabled) {
          playCompletionFeedback();
        }
        Animated.timing(fade, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start();
      } else {
        setPhase('writing');
        setRemaining(writeDuration);
        setCurrentCycle(nextCycle);
        setSkipBreakAvailable(false);

        if (preserveTimerProgress) {
          const pomodoroState = {
            phase: 'writing',
            currentCycle: nextCycle,
            skipBreakAvailable: false,
            totalCycles,
          };
          setDraftTimer(date, writeDuration, pomodoroState);
        }

        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }
  };

  // ===== PERSIST DRAFT TEXT =====
  useEffect(() => {
    const id = setTimeout(() => setDraft(date, text), 2000);
    return () => clearTimeout(id);
  }, [date, text, setDraft]);

  // ===== RESET TIMER =====
  const handleReset = async () => {
    if (hapticsEnabled) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
    setRunning(false);
    setRemaining(writeDuration);

    setPhase('writing');
    setCurrentCycle(1);
    setSkipBreakAvailable(false);

    setDraftTimer(date, writeDuration, null);

    Animated.sequence([
      Animated.timing(resetAnim, {
        toValue: 1.15,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(resetAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
    Animated.timing(fade, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    requestAnimationFrame(() => setRunning(true));
  };

  // ===== SAVE & EXIT (DRAFT) =====
  const saveAndExit = () => {
    const body = text.trim();
    if (!body) return;

    upsert({
      date,
      text: body,
      prompt: { text: prompt?.text },
      createdAt: new Date().toISOString(),
      isComplete: false,
    });

    if (!preserveTimerProgress) {
      setDraftTimer(date, writeDuration, null);
    }

    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  // ===== CONTINUE TO MOOD (WITH GRATITUDE LOGIC) =====
  const continueToMood = async () => {
    if (!text.trim()) return;
    if (hapticsEnabled) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }

    // Any words allowed; require at least 2 filled boxes
    const completedGratitudeItems = gratitudeEntries.filter(
      (entry) => entry?.trim()
    ).length;
    const isGratitudeEntry = completedGratitudeItems >= 2;
    const xpBonus = isGratitudeEntry ? 10 : 0;

    // Track gratitude streak only when valid
    if (isGratitudeEntry) {
      const { incrementGratitudeStreak } = useProgress.getState();
      incrementGratitudeStreak();
    }

    upsert({
      date,
      text: text.trim(),
      prompt: { text: prompt?.text },
      createdAt: new Date().toISOString(),
      isComplete: false,
      isGratitude: isGratitudeEntry,
      gratitudeItems: gratitudeEntries.filter((entry) => entry?.trim()),
      xpAwarded: 5 + xpBonus,
    });

    if (xpBonus > 0) {
      showToast('+10 XP Gratitude Bonus!');
    }

    setTimeout(() => {
      navigation.navigate('MoodTag', {
        date,
        prompt,
        text,
        suggestedMood: selectedSuggestedMood,
        isGratitudeEntry,
        xpBonus,
      });
    }, 50);
  };

  // ===== TEXT CHANGE =====
  const handleTextChange = (newText) => {    
    setText(newText);

    const words = newText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    setWordCount(words);

    if (newText.length > 15) {
      const suggestions = getMoodSuggestions(newText);
      setSuggestedMoods(suggestions);
    } else {
      setSuggestedMoods([]);
    }
  };

  // ===== TOAST =====
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000);
  };

  // ===== THEMING =====
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
  const promptColor = isDark ? '#CBD5E1' : '#334155';

  // ===== MAIN CONTENT (shared for iOS / Android) =====
  const content = (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 20 + keyboardHeight },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentCard}>
          {/* PROMPT */}
          <Text style={[styles.prompt, { color: promptColor }]}>
            {currentPrompt?.text}
            {currentPrompt?.explanation && (
              <Text
                style={{
                  fontSize: 12,
                  color: isDark ? '#94A3B8' : '#64748B',
                  fontStyle: 'italic',
                }}
              >
                {'\n'}💡 {currentPrompt.explanation}
              </Text>
            )}
          </Text>

          {/* TIMER SECTION */}
          <Animated.View style={[{ opacity: fade }, styles.timerContainer]}>
            {showTimer && (
              <View style={styles.timerRow}>
                <Animated.View
                  style={{
                    transform: [{ scale: resetAnim }],
                    marginRight: 20,
                  }}
                >
                  <PremiumPressable
                    onPress={handleReset}
                    haptic="light"
                    style={[
                      styles.resetBtn,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.03)',
                      },
                    ]}
                  >
                    <RotateCcw
                      size={18}
                      color={isDark ? '#A5B4FC' : '#4F46E5'}
                    />
                  </PremiumPressable>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.timerPill,
                    {
                      transform: [{ scale: pulse }],
                      backgroundColor:
                        phase === 'writing'
                          ? isDark
                            ? 'rgba(255,255,255,0.07)'
                            : 'rgba(99,102,241,0.07)'
                          : isDark
                          ? 'rgba(34,197,94,0.1)'
                          : 'rgba(34,197,94,0.07)',
                      borderWidth: 0,
                      height:
                        phase === 'break' && skipBreakAvailable ? 115 : 90,
                    },
                  ]}
                >
                  <View style={styles.phaseIndicator}>
                    <Text
                      style={[
                        styles.phaseText,
                        {
                          color:
                            phase === 'writing'
                              ? isDark
                                ? '#A5B4FC'
                                : '#4F46E5'
                              : isDark
                              ? '#4ADE80'
                              : '#16A34A',
                        },
                      ]}
                    >
                      {phase === 'writing' ? '🖊️ Writing' : '⏸️ Break'}
                    </Text>
                    <Text
                      style={[
                        styles.cycleText,
                        { color: isDark ? '#9CA3AF' : '#6B7280' },
                      ]}
                    >
                      Cycle {currentCycle}/{totalCycles}
                    </Text>
                  </View>

                  <Timer
                    seconds={remaining}
                    running={running && (phase === 'writing' || phase === 'break')}
                    onTick={handleTick}
                    onDone={undefined}
                  />

                  <Text
                    style={[
                      styles.timerStatus,
                      {
                        color: isDark
                          ? running
                            ? '#A5B4FC'
                            : '#9CA3AF'
                          : running
                          ? '#4F46E5'
                          : '#6B7280',
                      },
                    ]}
                  >
                    {running
                      ? phase === 'writing'
                        ? 'Writing'
                        : 'Break'
                      : 'Paused'}
                  </Text>

                  {phase === 'break' && skipBreakAvailable && (
                    <PremiumPressable
                      onPress={skipBreak}
                      haptic="light"
                      style={[
                        styles.skipButton,
                        {
                          backgroundColor: isDark
                            ? 'rgba(99,102,241,0.08)'
                            : 'rgba(99,102,241,0.06)',
                        },
                      ]}
                    >
                      <Text style={[styles.skipText, { color: '#6366F1' }]}>
                        Skip Break
                      </Text>
                    </PremiumPressable>
                  )}
                </Animated.View>

                <View
                  style={{
                    transform: [{ translateX: 24 }, { translateY: 8 }],
                  }}
                >
                  <BreathingCircle running={running} isDark={isDark} />
                </View>
              </View>
            )}
          </Animated.View>

          {!timerCompleted && (
            <PremiumPressable
              onPress={() => setShowTimer((s) => !s)}
              haptic="light"
              style={styles.toggle}
            >
              <Text
                style={{
                  color: isDark ? '#A5B4FC' : '#4F46E5',
                  fontWeight: '500',
                }}
              >
                {showTimer ? 'Hide Timer' : 'Show Timer'}
              </Text>
            </PremiumPressable>
          )}
{/* AI WRITING COACH */}
          {showCoach && (
            <Animated.View 
              style={[
                styles.coachContainer, 
                { opacity: coachFade }
              ]}
            >
              <View style={[styles.coachBubble, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' }]}>
                <Text style={[styles.coachText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                  {coachMessage}
                </Text>
              </View>
            </Animated.View>
          )}
          {/* MAIN EDITOR */}
          <Animated.View
            style={[
              animatedInputStyle,
              {
                marginTop: timerCompleted ? -120 : 2,
                borderRadius: 14,
              },
            ]}
            onLayout={(e) => {
              const y = e.nativeEvent.layout.y;
              setSectionPositions((prev) => ({ ...prev, editor: y }));
            }}
          >
            <TextInput
              ref={inputRef}
              value={route.params?.text || text}
              onChangeText={handleTextChange}
              onFocus={() => {
                handleInputFocusAnim(1);
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({
                    y: Math.max(0, sectionPositions.editor - 40),
                    animated: true,
                  });
                }
              }}
              onBlur={() => handleInputFocusAnim(0)}
              placeholder="Take a minute to breathe and write…"
              placeholderTextColor={isDark ? '#9CA3AF' : '#64748B'}

              multiline
              style={[
                styles.input,
                {
                  color: isDark ? '#E5E7EB' : '#0F172A',
                  backgroundColor: isDark ? '#111827' : '#FFFFFF',
                  borderWidth: 0,
                },
              ]}
              autoFocus={false}
            />
          </Animated.View>

          {/* MOOD SUGGESTIONS + WORD COUNT */}
          <View style={styles.bottomRowContainer}>
            {suggestedMoods.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text
                  style={[
                    styles.suggestionsLabel,
                    { color: isDark ? '#CBD5E1' : '#334155' },
                  ]}
                >
                  Suggested moods:
                </Text>
                <View style={styles.suggestionsRow}>
                  {suggestedMoods.map((suggestion) => (
                    <Pressable
                      key={suggestion.mood}
                      onPress={async () => {
                        const newSelection =
                          selectedSuggestedMood === suggestion.mood
                            ? null
                            : suggestion.mood;
                        setSelectedSuggestedMood(newSelection);
                        if (hapticsEnabled) {
                          try {
                            await Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                          } catch {}
                        }
                      }}
                      style={[
                        styles.suggestionChip,
                        {
                          backgroundColor:
                            selectedSuggestedMood === suggestion.mood
                              ? isDark
                                ? 'rgba(99, 102, 241, 0.4)'
                                : 'rgba(99, 102, 241, 0.3)'
                              : isDark
                              ? 'rgba(99, 102, 241, 0.2)'
                              : 'rgba(99, 102, 241, 0.1)',
                          borderColor:
                            selectedSuggestedMood === suggestion.mood
                              ? isDark
                                ? 'rgba(99, 102, 241, 0.8)'
                                : 'rgba(99, 102, 241, 0.6)'
                              : isDark
                              ? 'rgba(99, 102, 241, 0.4)'
                              : 'rgba(99, 102, 241, 0.3)',
                          borderWidth:
                            selectedSuggestedMood === suggestion.mood ? 2 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.suggestionText,
                          {
                            color: '#6366F1',
                            fontWeight:
                              selectedSuggestedMood === suggestion.mood
                                ? '800'
                                : '700',
                          },
                        ]}
                      >
                        {suggestion.mood}
                      </Text>
                      {suggestion.confidence > 60 && (
                        <Text
                          style={[
                            styles.confidenceText,
                            { color: '#6366F1' },
                          ]}
                        >
                          {suggestion.confidence}%
                        </Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.wordCountContainer}>
              <Text
                style={[
                  styles.wordCount,
                  { color: isDark ? '#9CA3AF' : '#6B7280' },
                ]}
              >
                {wordCount} word{wordCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* FOCUS MODE BUTTON */}
          <PremiumPressable
            onPress={() =>
              navigation.navigate('FocusWrite', {
                date,
                prompt: currentPrompt,
                text,
              })
            }
            haptic="light"
            style={[
              styles.focusButton,
              {
                backgroundColor: isDark
                  ? 'rgba(99, 102, 241, 0.1)'
                  : 'rgba(99, 102, 241, 0.05)',
                borderColor: isDark
                  ? 'rgba(99, 102, 241, 0.3)'
                  : 'rgba(99, 102, 241, 0.2)',
              },
            ]}
          >
            <Text style={[styles.focusButtonText, { color: '#6366F1' }]}>
              Enter Focus Mode
            </Text>
          </PremiumPressable>

          {/* GRATITUDE SECTION */}
          {(gratitudeModeEnabled ||
            currentPrompt?.text?.toLowerCase().includes('grateful') ||
            currentPrompt?.text?.toLowerCase().includes('thankful') ||
            currentPrompt?.text?.toLowerCase().includes('appreciate')) && (
            <View
              style={[
                styles.gratitudeContainer,
                {
                  backgroundColor: isDark
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'rgba(99, 102, 241, 0.04)',
                  borderColor: isDark
                    ? 'rgba(99, 102, 241, 0.3)'
                    : 'rgba(99, 102, 241, 0.2)',
                },
              ]}
              onLayout={(e) => {
                const y = e.nativeEvent.layout.y;
                setSectionPositions((prev) => ({ ...prev, gratitude: y }));
              }}
            >
              <Pressable
                onPress={() => {
                  setIsGratitudeExpanded((prev) => !prev);
                  if (!isGratitudeExpanded && scrollRef.current) {
                    scrollRef.current.scrollTo({
                      y: Math.max(0, sectionPositions.gratitude - 40),
                      animated: true,
                    });
                  }
                }}
                style={styles.gratitudeHeader}
              >
                <Text
                  style={[
                    styles.gratitudeTitle,
                    { color: isDark ? '#A5B4FC' : '#4F46E5' },
                  ]}
                >
                  Gratitude Practice {isGratitudeExpanded ? '▲' : '▼'}
                </Text>
                <Text
                  style={[
                    styles.gratitudeSubtitle,
                    { color: isDark ? '#CBD5E1' : '#334155' },
                  ]}
                >
                  +10 XP bonus available
                </Text>
              </Pressable>

              {isGratitudeExpanded && (
                <>
                  <Text
                    style={[
                      styles.gratitudeDescription,
                      { color: isDark ? '#CBD5E1' : '#334155' },
                    ]}
                  >
                    List 3 specific things you're grateful for today:
                  </Text>

                  {[1, 2, 3].map((num, index) => (
                    <View key={num} style={styles.gratitudeInputRow}>
                      <Text
                        style={[
                          styles.gratitudeNumber,
                          { color: isDark ? '#A5B4FC' : '#4F46E5' },
                        ]}
                      >
                        {num}.
                      </Text>
                      <TextInput
                        style={[
                          styles.gratitudeInput,
                          {
                            color: isDark ? '#E5E7EB' : '#0F172A',
                            backgroundColor: isDark
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(255,255,255,0.8)',
                            borderColor: isDark
                              ? 'rgba(99, 102, 241, 0.4)'
                              : 'rgba(99, 102, 241, 0.3)',
                          },
                        ]}
                        placeholder={`Gratitude #${num}...`}
                        placeholderTextColor={
                          isDark ? '#6B7280' : '#9CA3AF'
                        }
                        value={gratitudeEntries[index] || ''}
                        onChangeText={(txt) => {
                          const next = [...gratitudeEntries];
                          next[index] = txt;
                          setGratitudeEntries(next);
                        }}
                        onFocus={() => {
                          if (scrollRef.current) {
                            scrollRef.current.scrollTo({
                              y: Math.max(
                                0,
                                sectionPositions.gratitude +
                                  index * 32 -
                                  140
                              ),
                              animated: true,
                            });
                          }
                        }}
                      />
                    </View>
                  ))}

                  <View style={styles.gratitudeBenefits}>
                    <Text
                      style={[
                        styles.gratitudeBenefit,
                        { color: isDark ? '#CBD5E1' : '#334155' },
                      ]}
                    >
                      ✓ Proven to increase happiness
                    </Text>
                    <Text
                      style={[
                        styles.gratitudeBenefit,
                        { color: isDark ? '#CBD5E1' : '#334155' },
                      ]}
                    >
                      ✓ Rewires your brain for positivity
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ACTIONS */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <PremiumPressable
              onPress={() => setRunning((r) => !r)}
              haptic="light"
              style={[
                styles.btnGhost,
                {
                  borderColor: isDark
                    ? 'rgba(99,102,241,0.3)'
                    : 'rgba(99,102,241,0.3)',
                },
              ]}
            >
              <Text
                style={[
                  styles.btnGhostText,
                  { color: isDark ? '#E5E7EB' : '#0F172A' },
                ]}
              >
                {running ? 'Pause' : 'Resume'}
              </Text>
            </PremiumPressable>

            <PremiumPressable
              onPress={saveAndExit}
              disabled={!text.trim() || !text}
              haptic="light"
              style={[
                styles.btnGhost,
                {
                  borderColor: '#6366F1',
                  opacity: !text.trim() ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.btnGhostText, { color: '#6366F1' }]}>
                Save & Exit
              </Text>
            </PremiumPressable>

            <PremiumPressable
              onPress={continueToMood}
              disabled={!text.trim()}
              haptic="light"
              style={[
                styles.btnPrimary,
                { opacity: !text.trim() ? 0.5 : 1 },
              ]}
            >
              <Text style={styles.btnPrimaryText}>Continue</Text>
            </PremiumPressable>
          </View>
        </View>

        {toastMessage && (
          <View
            style={[
              styles.toast,
              {
                backgroundColor: isDark
                  ? 'rgba(99, 102, 241, 0.9)'
                  : 'rgba(99, 102, 241, 0.8)',
              },
            ]}
          >
            <Text style={[styles.toastText, { color: 'white' }]}>
              {toastMessage}
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );

  const isIOS = Platform.OS === 'ios';

  // ===== RETURN (Android: no KeyboardAvoidingView) =====
  if (isIOS) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={90}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  // Android path: just render content, rely on ScrollView + keyboard padding
  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentCard: {
    flex: 1,
    margin: 1,
    padding: 20,
    borderRadius: 24,
    minHeight: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  prompt: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
    textAlign: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  timerPill: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  timerStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetBtn: {
    padding: 6,
    borderRadius: 12,
  },
  toggle: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  input: {
    minHeight: 180,
    padding: 14,
    borderRadius: 14,
    borderWidth: 0,
    textAlignVertical: 'top',
  },
  btnPrimary: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  btnPrimaryText: {
    color: 'white',
    fontWeight: '700',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  btnGhostText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  wordCountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    minWidth: 60,
  },
  wordCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  phaseIndicator: {
    alignItems: 'center',
    marginBottom: 2,
    minHeight: 24,
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    height: 16,
  },
  cycleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  skipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timerContainer: {
    height: 140,
    justifyContent: 'center',
  },
  suggestionsContainer: {
    flex: 1,
    marginRight: 12,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.7,
  },
  bottomRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
    minHeight: 40,
  },
  focusButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  focusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  gratitudeContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  gratitudeHeader: {
    padding: 4,
  },
  gratitudeTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  gratitudeSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
  },
  gratitudeDescription: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  gratitudeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gratitudeNumber: {
    fontSize: 14,
    fontWeight: '600',
    width: 24,
    marginRight: 8,
  },
  gratitudeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  gratitudeBenefits: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99, 102, 241, 0.2)',
  },
  gratitudeBenefit: {
    fontSize: 12,
    marginBottom: 4,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  coachContainer: {
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 10,
  },
  coachBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  coachText: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
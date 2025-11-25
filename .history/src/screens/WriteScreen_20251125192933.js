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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
//import { useAudioPlayer } from 'expo-audio';
import { useFocusEffect } from '@react-navigation/native';
import { RotateCcw } from 'lucide-react-native';
import Timer from '../components/Timer';
import { useEntries } from '../stores/entriesStore';
import { useSettings } from '../stores/settingsStore';
import { useTheme } from '../stores/themeStore';
import BreathingCircle from '../components/BreathingCircle';
import PremiumPressable from '../components/PremiumPressable';
import { getMoodSuggestions, suggestMoodFromText } from '../utils/autoTagger';
import { generateSmartPrompt, analyzeForSmartPrompts, getPromptExplanation } from '../utils/smartPrompts';
import { useProgress } from '../stores/progressStore';
import { KeyboardAvoidingView, Platform } from "react-native";



export default function WriteScreen({ navigation, route }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const { date, prompt } = route.params || {};

  // Get entries for smart prompt analysis
  const map = useEntries((s) => s.map);
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

  // State for smart prompt
  const [smartPrompt, setSmartPrompt] = useState(null);

  // Generate smart prompt when component mounts or entries change
  useEffect(() => {
    if (entries.length >= 3) { // Only use smart prompts if we have enough data
      const userData = analyzeForSmartPrompts(entries);
      const newSmartPrompt = generateSmartPrompt(userData);
      const explanation = getPromptExplanation(newSmartPrompt, userData);
      
      setSmartPrompt({
        text: newSmartPrompt,
        explanation: explanation,
        isSmart: true
      });
    }
  }, [entries]);

  // Use smart prompt if available, otherwise use the passed prompt
  const currentPrompt = smartPrompt || prompt;

  const [text, setText] = useState(route.params?.text || '');
    const [gratitudeEntries, setGratitudeEntries] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  // Add this with your other settings hooks
const gratitudeModeEnabled = useSettings((s) => s.gratitudeModeEnabled);
const [isGratitudeExpanded, setIsGratitudeExpanded] = useState(false);
  
  // Handle text updates from navigation params (including Focus Mode)
  useEffect(() => {
    if (route.params?.text !== undefined) {
      console.log('Updating text from navigation params:', route.params.text);
      setText(route.params.text);
    }
  }, [route.params?.text]);
  const [running, setRunning] = useState(true);
  const [showTimer, setShowTimer] = useState(true);
  const [wordCount, setWordCount] = useState(
    () => (route.params?.text || '').trim().split(/\s+/).filter(word => word.length > 0).length
  );
  const [suggestedMoods, setSuggestedMoods] = useState([]);
  const [selectedSuggestedMood, setSelectedSuggestedMood] = useState(null);
  const inputRef = useRef(null);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

    // TextInput focus animation
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  const handleInputFocus = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleInputBlur = () => {
    Animated.timing(inputFocusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Enhanced input style
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
    overflow: 'hidden', // This ensures shadow follows rounded corners
  };

  // ADD: Pomodoro state
  const [phase, setPhase] = useState('writing'); // 'writing' or 'break'
  const [currentCycle, setCurrentCycle] = useState(1);
  const [skipBreakAvailable, setSkipBreakAvailable] = useState(false);

  // Fix: Track if user has left the screen
  const isScreenActive = useRef(true);

  // store hooks
  const setDraft = useEntries((s) => s.setDraft);
  const getDraftTimer = useEntries((s) => s.getDraftTimer);
  const setDraftTimer = useEntries((s) => s.setDraftTimer);
  const upsert = useEntries((s) => s.upsert);
  const getDraft = useEntries((s) => s.getDraft);
  const getPomodoroState = useEntries((s) => s.getPomodoroState);

  // ADD: Pomodoro settings (use settings if available, otherwise defaults)
  const writeDuration = useSettings((s) => s.writeDuration) || 300;
  const breakDuration = useSettings((s) => s.breakDuration) || 60;
  const longBreakDuration = useSettings((s) => s.longBreakDuration) || 300;
  const totalCycles = useSettings((s) => s.totalCycles) || 4;

  // duration & remaining - SIMPLIFIED
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);
  const soundEnabled = useSettings((s) => s.soundEnabled);
  const [remaining, setRemaining] = useState(writeDuration);
  const preserveTimerProgress = useSettings((s) => s.preserveTimerProgress);

  // Haptic feedback only - won't interrupt other audio apps
  const playCompletionFeedback = () => {
    if (!isScreenActive.current) return;
    
    if (soundEnabled && hapticsEnabled) {
      // Use a more distinct haptic pattern for completion
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // If sound is enabled but haptics disabled, do nothing (no audio interruption)
  };

  // animations
  const fade = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const resetAnim = useRef(new Animated.Value(1)).current;

  // Initial timer load - only runs once when screen opens
  useEffect(() => {
    const initializeTimer = async () => {
      // Wait for draft to load from storage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('=== INITIAL TIMER LOAD ===');
      const storedTimer = preserveTimerProgress ? getDraftTimer(date) : null;
      const draftText = getDraft(date);
      const storedPomodoroState = preserveTimerProgress ? getPomodoroState(date) : null;
      
      console.log('Stored timer:', storedTimer, 'Draft text exists:', !!draftText, 'Pomodoro state:', storedPomodoroState);
      
      let initialTime;
      const hasDraftText = draftText && draftText.length > 0;
      
      if (preserveTimerProgress && storedTimer !== null && storedTimer > 0) {
        initialTime = storedTimer;
        
        // RESTORE POMODORO STATE if available
        if (storedPomodoroState) {
          console.log('🔄 Restoring Pomodoro state:', storedPomodoroState);
          setPhase(storedPomodoroState.phase || 'writing');
          setCurrentCycle(storedPomodoroState.currentCycle || 1);
          setSkipBreakAvailable(storedPomodoroState.skipBreakAvailable || false);
        }
      } else if (!hasDraftText) {
        // New session - use settings duration
        initialTime = writeDuration;
      } else {
        // Existing draft but no stored timer or preserve disabled - use settings
        initialTime = writeDuration;
      }
      
      console.log('Initial time:', initialTime, 'Phase:', phase, 'Cycle:', currentCycle);
      
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

  // Update timer immediately when writeDuration changes
  useEffect(() => {
    if (!isInitialLoad) {
      console.log('=== WRITE DURATION CHANGED ===');
      console.log('New writeDuration:', writeDuration, 'preserveTimerProgress:', preserveTimerProgress);
      
      // Always update to new duration, regardless of preserveTimerProgress setting
      setRunning(false);
      setRemaining(writeDuration);
      
      // Save with current Pomodoro state
      const pomodoroState = {
        phase,
        currentCycle, 
        skipBreakAvailable,
        totalCycles
      };
      setDraftTimer(date, writeDuration, pomodoroState);
      
      // Only reset Pomodoro state if we're not preserving progress
      if (!preserveTimerProgress) {
        setPhase('writing');
        setCurrentCycle(1);
        setSkipBreakAvailable(false);
      }
      
      setTimeout(() => setRunning(true), 50);
    }
  }, [writeDuration]); // Only watch writeDuration

  // Box breathing pulse animation - 4 second phases
  useEffect(() => {
    if (!running) {
      pulse.setValue(1); // Reset when paused
      return;
    }

    const boxBreathing = Animated.loop(
      Animated.sequence([
        // Expand for 4 seconds
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 4000,
          useNativeDriver: true,
        }),
        // Pause expanded for 4 seconds
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 4000,
          useNativeDriver: true,
        }),
        // Contract for 4 seconds
        Animated.timing(pulse, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        // Pause contracted for 4 seconds
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

  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    isScreenActive.current = true;
    return () => { 
      mounted.current = false;
      isScreenActive.current = false;
    };
  }, []);

  // Track screen focus to prevent sound/haptics when not on screen
  useFocusEffect(
    React.useCallback(() => {
      isScreenActive.current = true;
      return () => {
        isScreenActive.current = false;
      };
    }, [])
  );

  useEffect(() => {
    // Handle text updates from both initial load and Focus Mode
    if (route.params?.text !== undefined) {
      setText(route.params.text);
      
      // Auto-focus if coming from Focus Mode or if there's existing text
      if (route.params?.fromFocusMode || route.params?.text?.trim().length > 0) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [route.params?.text, route.params?.fromFocusMode]);

  const handleTick = (t) => {
    if (!mounted.current) return;
    
    requestAnimationFrame(() => {
      setRemaining(t);
      
      // Save timer AND Pomodoro state together
      if (preserveTimerProgress) {
        const pomodoroState = {
          phase,
          currentCycle, 
          skipBreakAvailable,
          totalCycles
        };
        setDraftTimer(date, t, pomodoroState);
      } else {
        setDraftTimer(date, t);
      }
      
      // Switch phases when timer reaches 0
      if (t <= 0) {
        if (phase === 'writing') {
          // Writing phase ended, start break
          const nextBreakDuration = breakDuration; // Use regular break duration for all breaks
          
          setPhase('break');
          setRemaining(nextBreakDuration);
          setSkipBreakAvailable(true);
          
          // Save state change
          if (preserveTimerProgress) {
            const pomodoroState = {
              phase: 'break',
              currentCycle, 
              skipBreakAvailable: true,
              totalCycles
            };
            setDraftTimer(date, nextBreakDuration, pomodoroState);
          }
          
          // Haptic feedback for phase change
          if (hapticsEnabled) {
            Haptics.notificationAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        } else {
          // Break ended, start next writing session or complete
          setCurrentCycle(prev => prev + 1);
          
          // Check if this was the final cycle
          if (currentCycle >= totalCycles) {
            // Final cycle completed - play sound, fade out, and STOP the timer
            setRunning(false);
            setTimerCompleted(true);
            if (soundEnabled || hapticsEnabled) {
              playCompletionFeedback();
            }
            Animated.timing(fade, { toValue: 0, duration: 600, useNativeDriver: true }).start();
          } else {
            // Not the final cycle, continue to next writing session
            setPhase('writing');
            setRemaining(writeDuration);
            setSkipBreakAvailable(false);
            
            // Save state change
            if (preserveTimerProgress) {
              const pomodoroState = {
                phase: 'writing',
                currentCycle: currentCycle + 1, 
                skipBreakAvailable: false,
                totalCycles
              };
              setDraftTimer(date, writeDuration, pomodoroState);
            }
            
            // Haptic feedback for phase change
            if (hapticsEnabled) {
              Haptics.notificationAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }
        }
      }
    });
  };

  // Skip break and start next writing session or complete
  const skipBreak = () => {
    if (phase === 'break' && skipBreakAvailable) {
      const nextCycle = currentCycle + 1;
      
      // Check if this was the final cycle
      if (nextCycle > totalCycles) {
        // Final cycle completed - stop the timer and fade out
        setRunning(false);
        setTimerCompleted(true);
        if (soundEnabled) {
          playCompletionFeedback();
        }
        Animated.timing(fade, { toValue: 0, duration: 600, useNativeDriver: true }).start();
      } else {
        // Not the final cycle, continue to next writing session
        setPhase('writing');
        setRemaining(writeDuration);
        setCurrentCycle(nextCycle);
        setSkipBreakAvailable(false);
        
        // Save state change
        if (preserveTimerProgress) {
          const pomodoroState = {
            phase: 'writing',
            currentCycle: nextCycle, 
            skipBreakAvailable: false,
            totalCycles
          };
          setDraftTimer(date, writeDuration, pomodoroState);
        }
        
        if (hapticsEnabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    }
  };

  // persist draft text every 2s
  useEffect(() => {
    const id = setTimeout(() => setDraft(date, text), 2000);
    return () => clearTimeout(id);
  }, [date, text, setDraft]);

  // Reset button press feedback
  const pressIn = (a) => Animated.spring(a, { toValue: 0.92, useNativeDriver: true, friction: 5 }).start();
  const pressOut = (a) => Animated.spring(a, { toValue: 1.0, useNativeDriver: true, friction: 5 }).start();

  const handleReset = async () => {
    if (hapticsEnabled) {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    }
    setRunning(false);
    setRemaining(writeDuration);
    
    // Reset Pomodoro state
    setPhase('writing');
    setCurrentCycle(1);
    setSkipBreakAvailable(false);
    
    // Clear saved Pomodoro state
    setDraftTimer(date, writeDuration, null);
    
    Animated.sequence([
      Animated.timing(resetAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.spring(resetAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    requestAnimationFrame(() => setRunning(true));
  };

  const saveAndExit = () => {
    const body = text.trim();
    if (!body) return;
    
    // Save as draft using upsert
    upsert({ 
      date,
      text: body,
      prompt: { text: prompt?.text },
      createdAt: new Date().toISOString(),
      isComplete: false
    });
    
    // Respect user preference for timer behavior
    if (!preserveTimerProgress) {
      setDraftTimer(date, writeDuration, null); // Reset timer and clear Pomodoro state
    }
    
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

const continueToMood = async () => {
  if (!text.trim()) return;
  if (hapticsEnabled) {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }
  
// Gratitude validation: only require ANY words typed, but at least 2 boxes
const completedGratitudeItems = gratitudeEntries.filter(entry => entry?.trim()).length;

// A gratitude entry is valid ONLY if at least 2 boxes are filled
const isGratitudeEntry = completedGratitudeItems >= 2;

// XP bonus only applies when it's valid gratitude
const xpBonus = isGratitudeEntry ? 10 : 0;


  // Track gratitude streak only when it's a valid gratitude entry
  if (isGratitudeEntry) {
    const { incrementGratitudeStreak } = useProgress.getState();
    incrementGratitudeStreak();
  }
  
  // Save draft before navigating
  upsert({ 
    date,
    text: text.trim(),
    prompt: { text: prompt?.text },
    createdAt: new Date().toISOString(),
    isComplete: false,
    isGratitude: isGratitudeEntry,
    gratitudeItems: gratitudeEntries.filter(entry => entry?.trim()), // Store the specific gratitude items
    xpAwarded: 5 + xpBonus // Base 5 XP + gratitude bonus
  });
  
  // Show bonus notification if applicable
  if (xpBonus > 0) {
    showToast(`+10 XP Gratitude Bonus!`);
  }
  
  // Add a small delay to ensure state is committed
  setTimeout(() => {
navigation.navigate('MoodTag', { 
  date, 
  prompt, 
  text,
  suggestedMood: selectedSuggestedMood,
  isGratitudeEntry,    // <-- MUST BE HERE
  xpBonus              // <-- MUST BE HERE
});

  }, 50);
};

  // Use the text from route params directly instead of local state
  
  const handleTextChange = (newText) => {
    // Update the route params directly
    navigation.setParams({
      text: newText,
      date,
      prompt
    });
    
    const words = newText.trim().split(/\s+/).filter(word => word.length > 0).length;
    setWordCount(words);
    
    // Auto-suggest moods when user types enough content
    if (newText.length > 15) {
      const suggestions = getMoodSuggestions(newText);
      console.log('Text:', newText);
      console.log('Suggestions:', suggestions);
      setSuggestedMoods(suggestions);
    } else {
      setSuggestedMoods([]);
    }
  };

    const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000);
  };

  // Gradients for WriteScreen
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
  const placeholderCol = isDark ? '#64748B' : '#94A3B8';

  return (

    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentCard}>
    <Text style={[styles.prompt, { color: promptColor }]}>
      {prompt?.text}
      {prompt?.explanation && (
        <Text style={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B', fontStyle: 'italic' }}>
          {'\n'}💡 {prompt.explanation}
        </Text>
      )}
    </Text>


    

        {/* Timer Section - Fades out when complete */}
        <Animated.View style={[{ opacity: fade }, styles.timerContainer]}>
          {/* POMODORO TIMER + RESET */}
          {showTimer && (
            <View style={styles.timerRow}>
              {/* Reset Button - Left outside pill */}
              <Animated.View style={{ 
                transform: [{ scale: resetAnim }],
                marginRight: 20,
              }}>
                <PremiumPressable
                  onPress={handleReset}
                  haptic="light"
                  style={[
                    styles.resetBtn, 
                    { 
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    }
                  ]}
                >
                  <RotateCcw size={18} color={isDark ? '#A5B4FC' : '#4F46E5'} />
                </PremiumPressable>
              </Animated.View>
              
              {/* Timer Pill - Centered with dynamic height */}
              <Animated.View
                style={[
                  styles.timerPill,
                  { 
                    transform: [{ scale: pulse }], 
                    backgroundColor: phase === 'writing' 
                      ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.07)')
                      : (isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.07)'),
                    borderWidth: 0,
                    // Dynamic height based on content
                    height: phase === 'break' && skipBreakAvailable ? 115 : 90,
                  },
                ]}
              >
                {/* Phase Indicator */}
                <View style={styles.phaseIndicator}>
                  <Text style={[
                    styles.phaseText,
                    { color: phase === 'writing' 
                      ? (isDark ? '#A5B4FC' : '#4F46E5')
                      : (isDark ? '#4ADE80' : '#16A34A')
                    }
                  ]}>
                    {phase === 'writing' ? '🖊️ Writing' : '⏸️ Break'}
                  </Text>
                  <Text style={[
                    styles.cycleText,
                    { color: isDark ? '#9CA3AF' : '#6B7280' }
                  ]}>
                    Cycle {currentCycle}/{totalCycles}
                  </Text>
                </View>
                
                <Timer
                  seconds={remaining}
                  running={running && (phase === 'writing' || phase === 'break')}
                  onTick={handleTick}
                  onDone={undefined} // Remove onDone - we handle completion in handleTick
                />
                
                <Text style={[
                  styles.timerStatus,
                  { color: isDark ? (running ? '#A5B4FC' : '#9CA3AF') : (running ? '#4F46E5' : '#6B7280') }
                ]}>
                  {running ? (phase === 'writing' ? 'Writing' : 'Break') : 'Paused'}
                </Text>

                {/* Skip Break Button */}
                {phase === 'break' && skipBreakAvailable && (
                  <PremiumPressable
                    onPress={skipBreak}
                    haptic="light"
                    style={[
                      styles.skipButton,
                      { 
                        backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.06)',
                      }
                    ]}
                  >
                    <Text style={[styles.skipText, { color: '#6366F1' }]}>
                      Skip Break
                    </Text>
                  </PremiumPressable>
                )}
              </Animated.View>

              {/* Breathing Guide Circle - Right */}
              <View style={{ transform: [{ translateX: 24 }, { translateY: 8 }] }}>
                <BreathingCircle 
                  running={running} // Only animate during writing
                  isDark={isDark}
                />
              </View>
            </View>
          )}
        </Animated.View>

        {/* Show/Hide - Hidden when timer completes */}
        {!timerCompleted && (
          <PremiumPressable
            onPress={() => setShowTimer((s) => !s)}
            haptic="light"
            style={styles.toggle}
          >
            <Text style={{ color: isDark ? '#A5B4FC' : '#4F46E5', fontWeight: '500' }}>
              {showTimer ? 'Hide Timer' : 'Show Timer'}
            </Text>
          </PremiumPressable>
        )}

        {/* Editor - Moves up to replace timer section when completed */}
        <Animated.View style={[
          animatedInputStyle, 
          { 
            marginTop: timerCompleted ? -120 : 2,
            borderRadius: 14,
            // Border color is handled by the animatedInputStyle interpolation
           }
        ]}>
          <TextInput
            ref={inputRef}
            value={route.params?.text || ''} 
            onChangeText={handleTextChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Take a minute to breathe and write…"
            multiline
            style={[
              styles.input,
              {
                color: isDark ? '#E5E7EB' : '#0F172A',
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderWidth: 0, // Remove border since animated container handles it
              },
            ]}
            autoFocus={false}
          />
        </Animated.View>

        {/* Mood Suggestions & Word Count - SAME ROW */}
        <View style={styles.bottomRowContainer}>
          {/* Mood Suggestions - Left side */}
          {suggestedMoods.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsLabel, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                Suggested moods:
              </Text>
              <View style={styles.suggestionsRow}>
                {suggestedMoods.map((suggestion, index) => (
                  <Pressable
                    key={suggestion.mood}
onPress={() => {
  // Toggle selection - if already selected, deselect it
  const newSelection = selectedSuggestedMood === suggestion.mood ? null : suggestion.mood;
  console.log('Setting new selection:', newSelection);
  setSelectedSuggestedMood(newSelection);
  
  // Force immediate visual feedback
  if (hapticsEnabled) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}}
                    style={[
                      styles.suggestionChip,
                      { 
                        backgroundColor: selectedSuggestedMood === suggestion.mood
                          ? (isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)') // Selected state
                          : (isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)'), // Default state
                        borderColor: selectedSuggestedMood === suggestion.mood
                          ? (isDark ? 'rgba(99, 102, 241, 0.8)' : 'rgba(99, 102, 241, 0.6)') // Selected state
                          : (isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)'), // Default state
                        borderWidth: selectedSuggestedMood === suggestion.mood ? 2 : 1, // Thicker border when selected
                      }
                    ]}
                  >
                    <Text style={[styles.suggestionText, { 
                      color: '#6366F1', 
                      fontWeight: selectedSuggestedMood === suggestion.mood ? '800' : '700' 
                    }]}>
                      {suggestion.mood}
                    </Text>
                    {suggestion.confidence > 60 && (
                      <Text style={[styles.confidenceText, { color: '#6366F1' }]}>
                        {suggestion.confidence}%
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Word Count - Right side */}
          <View style={styles.wordCountContainer}>
            <Text style={[styles.wordCount, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>



                  {/* Focus Mode Button */}
          <PremiumPressable
            onPress={() => navigation.navigate('FocusWrite', { 
              date, 
              prompt,
              text 
            })}
            haptic="light"
            style={[
              styles.focusButton,
              { 
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
              }
            ]}
          >
            <Text style={[styles.focusButtonText, { color: '#6366F1' }]}>
              Enter Focus Mode
            </Text>
          </PremiumPressable>
                  {/* Gratitude Journaling Section - Collapsible */}
        {(gratitudeModeEnabled || currentPrompt?.text?.toLowerCase().includes('grateful') || currentPrompt?.text?.toLowerCase().includes('thankful') || currentPrompt?.text?.toLowerCase().includes('appreciate')) && (
          <View style={[
            styles.gratitudeContainer,
            { 
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)',
              borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
            }
          ]}>
            <Pressable 
              onPress={() => setIsGratitudeExpanded(!isGratitudeExpanded)}
              style={styles.gratitudeHeader}
            >
              <Text style={[styles.gratitudeTitle, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                Gratitude Practice {isGratitudeExpanded ? '▲' : '▼'}
              </Text>
              <Text style={[styles.gratitudeSubtitle, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                +10 XP bonus available
              </Text>
            </Pressable>
            
            {isGratitudeExpanded && (
              <>
                <Text style={[styles.gratitudeDescription, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                  List 3 specific things you're grateful for today:
                </Text>
                
                {[1, 2, 3].map((num) => (
                  <View key={num} style={styles.gratitudeInputRow}>
                    <Text style={[styles.gratitudeNumber, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>
                      {num}.
                    </Text>
                    <TextInput
                      style={[
                        styles.gratitudeInput,
                        { 
                          color: isDark ? '#E5E7EB' : '#0F172A',
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                          borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)',
                        }
                      ]}
                      placeholder={`Gratitude #${num}...`}
                      placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                      onChangeText={(text) => {
                        const newEntries = [...gratitudeEntries];
                        newEntries[num-1] = text;
                        setGratitudeEntries(newEntries);
                      }}
                      value={gratitudeEntries[num-1] || ''}
                    />
                  </View>
                ))}
                
                <View style={styles.gratitudeBenefits}>
                  <Text style={[styles.gratitudeBenefit, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                    ✓ Proven to increase happiness
                  </Text>
                  <Text style={[styles.gratitudeBenefit, { color: isDark ? '#CBD5E1' : '#334155' }]}>
                    ✓ Rewires your brain for positivity
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        

        {/* ACTIONS: Pause / Save & Exit / Continue */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {/* Pause / Resume */}
          <PremiumPressable
            onPress={() => setRunning((r) => !r)}
            haptic="light"
            style={[
              styles.btnGhost,
              { 
                borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.3)',
              }
            ]}
          >
            <Text style={[styles.btnGhostText, { color: isDark ? '#E5E7EB' : '#0F172A' }]}>
              {running ? 'Pause' : 'Resume'}
            </Text>
          </PremiumPressable>

          {/* Save & Exit */}
          <PremiumPressable
            onPress={saveAndExit}
            disabled={!text.trim()}
            haptic="light"
            style={[
              styles.btnGhost,
              { 
                borderColor: '#6366F1',
                opacity: !text.trim() ? 0.5 : 1,
              }
            ]}
          >
            <Text style={[styles.btnGhostText, { color: '#6366F1' }]}>Save & Exit</Text>
          </PremiumPressable>

          {/* Continue */}
          <PremiumPressable
            onPress={continueToMood}
            disabled={!text.trim()}
            haptic="light"
            style={[
              styles.btnPrimary,
              { opacity: !text.trim() ? 0.5 : 1 }
            ]}
          >
            <Text style={styles.btnPrimaryText}>Continue</Text>
          </PremiumPressable>
        </View>
      </View>
              {/* Gratitude Bonus Toast */}
        {toastMessage && (
          <View style={[
            styles.toast,
            { 
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.9)' : 'rgba(99, 102, 241, 0.8)',
            }
          ]}>
            <Text style={[styles.toastText, { color: 'white' }]}>
              {toastMessage}
            </Text>
          </View>
        )}
              </ScrollView>

    </LinearGradient>

  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  contentCard: {
    flex: 1, // Remove this if it causes issues
    margin: 1,
    padding: 20,
    borderRadius: 24,
    minHeight: '100%', // Ensure it takes full height
  },
    scrollContent: {
    flexGrow: 1,
    paddingBottom: 20, // Add some bottom padding
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
    marginBottom: 10 
  },
  input: { 
    minHeight: 180, 
    padding: 14, 
    borderRadius: 14, 
    borderWidth: 0, // Changed from 1 to 0
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
    fontWeight: '700' 
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
    minWidth: 60, // Ensure word count has consistent space
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
  skipButtonContainer: {
    height: 20, 
    justifyContent: 'center',
    marginTop: 2,
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
  timerSectionContainer: {
    height: 140,
    justifyContent: 'center',
  },
  timerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    flex: 1,
    marginRight: 12, // Space between suggestions and word count
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
    minHeight: 40, // Ensure consistent height even when no suggestions
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
});

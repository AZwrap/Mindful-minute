import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { useEntriesStore } from '../stores/entriesStore';
import { useWritingSettings } from '../stores/writingSettingsStore';
import { useSettings } from '../stores/settingsStore';

export const useJournalTimer = (date: string, isScreenActive: React.MutableRefObject<boolean>) => {
  const { writeDuration, breakDuration, totalCycles } = useWritingSettings();
  const { hapticsEnabled, preserveTimerProgress } = useSettings();

  // Audio: Load the chime sound
  const player = useAudioPlayer(require('../../assets/chime.mp3'));

  const playChime = () => {
    // Rewind and play (expo-audio doesn't auto-rewind)
    player.seekTo(0);
    player.play();
  };
  
  // Store Actions
  const getDraftTimer = useEntriesStore((s) => s.getDraftTimer);
  const setDraftTimer = useEntriesStore((s) => s.setDraftTimer);
  const getPomodoroState = useEntriesStore((s) => s.getPomodoroState);

// Local State
  const [phase, setPhase] = useState<'writing' | 'break'>('writing');
  const phaseRef = useRef<'writing' | 'break'>('writing'); // Synchronous ref to prevent flicker
  const [currentCycle, setCurrentCycle] = useState(1);
  const [skipBreakAvailable, setSkipBreakAvailable] = useState(false);
  const [remaining, setRemaining] = useState(writeDuration);
  const [running, setRunning] = useState(true);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Animation Refs
  const fade = useRef(new Animated.Value(1)).current;

  // Initialize
  useEffect(() => {
    const initializeTimer = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const storedTimer = preserveTimerProgress ? getDraftTimer(date) : null;
      const storedPomodoroState = preserveTimerProgress ? getPomodoroState(date) : null;

// Only restore if enabled AND data is valid
      if (preserveTimerProgress && storedTimer !== null && storedTimer > 0) {
        setRemaining(storedTimer);
        if (storedPomodoroState) {
          setPhase(storedPomodoroState.mode || 'writing');
          setCurrentCycle(storedPomodoroState.cyclesCompleted || 1);
          setSkipBreakAvailable(storedPomodoroState.mode === 'break');
        }
      } else {
        // RESET: Start fresh
        setRemaining(writeDuration);
        setPhase('writing');
        setCurrentCycle(1);
        setSkipBreakAvailable(false);
        
        // Clean up stale store data to prevent ghosting
        setDraftTimer(date, writeDuration, undefined); 
      }
      setRunning(true);
      setIsInitialLoad(false);
    };
    if (isInitialLoad) initializeTimer();
  }, [isInitialLoad, date, preserveTimerProgress]);

  // Handle Settings Change
  useEffect(() => {
    if (!isInitialLoad) {
      setRunning(false);
      setRemaining(writeDuration);
      setPhase('writing');
      setCurrentCycle(1);
      setTimeout(() => setRunning(true), 50);
    }
  }, [writeDuration]);

  // Tick Logic
  const handleTick = (t: number) => {
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
          // Use Ref to check current phase synchronously
          if (phaseRef.current === 'writing') {
            const nextPhase = 'break';
            setPhase(nextPhase);
            phaseRef.current = nextPhase; // Update ref immediately
            
            setRemaining(breakDuration);
            setSkipBreakAvailable(true);
            if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Medium);
          } else {
            // End of Break
            const nextCycle = currentCycle + 1;
            setCurrentCycle(nextCycle);
            
            if (nextCycle > totalCycles) {
              setRunning(false);
              setTimerCompleted(true);
              if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Animated.timing(fade, { toValue: 0, duration: 600, useNativeDriver: true }).start();
              playChime();
            } else {
              const nextPhase = 'writing';
              setPhase(nextPhase);
              phaseRef.current = nextPhase; // Update ref immediately
              
              setRemaining(writeDuration);
              setSkipBreakAvailable(false);
              if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
              playChime();
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
      } else {
        setPhase('writing');
        setRemaining(writeDuration);
        setCurrentCycle(nextCycle);
        setSkipBreakAvailable(false);
      }
    }
  };

const handleReset = () => {
    setRunning(false);
    setRemaining(writeDuration);
    setPhase('writing');
    phaseRef.current = 'writing'; // Reset Ref
    setCurrentCycle(1);
    setSkipBreakAvailable(false);
    setDraftTimer(date, writeDuration);
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    setTimeout(() => setRunning(true), 100);
  };

  return {
    remaining,
    running,
    phase,
    currentCycle,
    totalCycles,
    skipBreakAvailable,
    timerCompleted,
    setRunning,
    handleTick,
    skipBreak,
    handleReset,
    fade
  };
};
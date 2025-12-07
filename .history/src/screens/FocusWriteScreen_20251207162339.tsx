import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

// Stores & Types
import { useTheme } from '../stores/themeStore';
import { useSettings } from '../stores/settingsStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { RootStackParamList } from '../navigation/RootStack';
import BreathingCircle from '../components/BreathingCircle';

type Props = NativeStackScreenProps<RootStackParamList, 'FocusWrite'>;

export default function FocusWriteScreen({ navigation, route }: Props) {
  const { getCurrentTheme } = useTheme();
  const systemScheme = useColorScheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
const palette = useSharedPalette();
  const settings = useSettings();
  const hapticsEnabled = settings.hapticsEnabled;
  const zenModeEnabled = settings.zenModeEnabled;

  const { date, prompt, text: initialText = '' } = route.params;

  const [text, setText] = useState(initialText);
  const [wordCount, setWordCount] = useState(0);
  
  // Zen Mode State
  const [isZenMode, setIsZenMode] = useState(zenModeEnabled);
  const [zenTimer, setZenTimer] = useState(40);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef<TextInput>(null);

  // Zen Mode Logic
  useEffect(() => {
    if (!isZenMode) return;

    // Countdown
    const interval = setInterval(() => {
      setZenTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishZenMode();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isZenMode]);

  const finishZenMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsZenMode(false);
  };

  // Auto-focus logic (Only runs when NOT in Zen Mode)
  useEffect(() => {
    if (isZenMode) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      return; 
    }

    const timer = setTimeout(() => {
      textInputRef.current?.focus();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 300);

    return () => clearTimeout(timer);
  }, [isZenMode]);

  // Update word count
  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [text]);

  const handleSaveAndExit = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Navigate back to WriteScreen with the updated text
    // We cast as 'any' to bypass strict param checking for the 'fromFocusMode' flag if it's not in the type yet
    navigation.navigate('Write', {
      date,
      prompt,
      text,
    });
  };

  const handleBackgroundTap = () => {
    Keyboard.dismiss();
  };

  const textMain = palette.text;
  const textSub = palette.subtleText;

return (
    <LinearGradient
      colors={[palette.bg, palette.bg]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          {/* ZEN MODE OVERLAY */}
          {isZenMode ? (
            <View style={styles.zenContainer}>
              <Text style={[styles.zenTitle, { color: textMain }]}>Ground Yourself</Text>
              <Text style={[styles.zenSub, { color: textSub }]}>Take a few deep breaths before you begin.</Text>
              
              <View style={{ transform: [{ scale: 4 }], marginVertical: 60 }}>
                <BreathingCircle running={true} isDark={isDark} />
              </View>

              <Text style={[styles.zenTimer, { color: textMain }]}>{zenTimer}s</Text>
              
              <Pressable onPress={finishZenMode} style={styles.skipBtn}>
                <Text style={{ color: textSub, fontSize: 14 }}>Skip</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable 
              style={styles.backgroundPressable}
              onPress={handleBackgroundTap}
            >
              {/* Header */}
            <View style={styles.header}>
              <Pressable
                onPress={handleSaveAndExit}
                style={styles.closeButton}
                hitSlop={10}
              >
                <Text style={[styles.closeText, { color: textSub }]}>
                  Done
                </Text>
              </Pressable>
              
              <View style={styles.stats}>
                <Text style={[styles.wordCount, { color: textSub }]}>
                  {wordCount} words
                </Text>
              </View>
            </View>

            {/* Prompt */}
            {prompt?.text && wordCount === 0 && (
              <View style={styles.promptContainer}>
                <Text style={[styles.promptText, { color: textSub }]}>
                  {prompt.text}
                </Text>
              </View>
            )}

            {/* Writing Area */}
            <View style={styles.writingArea}>
              <TextInput
                ref={textInputRef}
                style={[styles.textInput, { color: textMain }]}
                value={text}
                onChangeText={setText}
                placeholder="Start writing..."
                placeholderTextColor={textSub}
                multiline
                textAlignVertical="top"
                autoCorrect={true}
                spellCheck={true}
                scrollEnabled={true}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                selectionColor={palette.accent}
              />
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { backgroundColor: palette.border }
                ]}
              >
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min((wordCount / 200) * 100, 100)}%`,
                      backgroundColor: palette.accent
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: textSub }]}>
                {wordCount}/200 words
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20 },
  backgroundPressable: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  closeButton: { paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { fontSize: 16, fontWeight: '600' },
  stats: { alignItems: 'flex-end' },
  wordCount: { fontSize: 14, fontWeight: '500' },
  promptContainer: { marginBottom: 20, paddingHorizontal: 10 },
  promptText: { fontSize: 16, lineHeight: 22, fontStyle: 'italic', textAlign: 'center' },
  writingArea: { flex: 1, marginBottom: 20 },
  textInput: { flex: 1, fontSize: 18, lineHeight: 28, fontWeight: '400', paddingHorizontal: 10 },
  progressContainer: { paddingHorizontal: 10, marginBottom: 30 },
  progressBar: { height: 4, borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  zenContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  zenTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  zenSub: { fontSize: 16, textAlign: 'center', opacity: 0.8 },
  zenTimer: { fontSize: 20, fontWeight: '600', marginTop: 20, fontVariant: ['tabular-nums'] },
  skipBtn: { marginTop: 30, padding: 12 },
});
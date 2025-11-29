import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEntriesStore } from "../stores/entriesStore";
import { useTheme } from '../stores/themeStore';
import { useSettings } from '../stores/settingsStore';
import * as Haptics from 'expo-haptics';

export default function FocusWriteScreen() {
  const useEntries = useEntriesStore;
  const navigation = useNavigation();
  const route = useRoute();
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);

  const { date, prompt, text: initialText = '' } = route.params || {};
  
  // Get ALL possible functions from your entries store
  const entriesStore = useEntries();
  
  const [text, setText] = useState(initialText);
  const [wordCount, setWordCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const textInputRef = useRef(null);
  
  
  // Auto-focus and fade in
  useEffect(() => {
    const timer = setTimeout(() => {
      textInputRef.current?.focus();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Update word count
  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [text]);

  // Handle save and exit - THIS IS THE KEY FIX
  const handleSaveAndExit = () => {
    // Save the text back to the WriteScreen using navigation params
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Navigate back to WriteScreen with the updated text
navigation.replace('Write', {
  date,
  prompt,
  text,
  fromFocusMode: true
});

  };

  // Handle tap outside to hide keyboard
  const handleBackgroundTap = () => {
    textInputRef.current?.blur();
  };

  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9'],
    },
  };

  const currentGradient = gradients[currentTheme] || gradients.light;
  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#94A3B8' : '#64748B';

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Pressable 
            style={styles.backgroundPressable}
            onPress={handleBackgroundTap}
          >
            {/* Minimal Header - Always visible for exit */}
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

            {/* Prompt - Show briefly when starting */}
            {prompt?.text && wordCount === 0 && (
              <View style={styles.promptContainer}>
                <Text style={[styles.promptText, { color: textSub }]}>
                  {prompt.text}
                </Text>
              </View>
            )}

            {/* Main Writing Area */}
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
                selectionColor={isDark ? '#6366F1' : '#6366F1'}
              />
            </View>

            {/* Progress Indicator - Compact version */}
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' }
                ]}
              >
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min((wordCount / 200) * 100, 100)}%`,
                      backgroundColor: '#6366F1'
                    }
                  ]} 
                />
              </View>
              
              {/* Compact Word Count Labels */}
              <View style={styles.compactLabels}>
                <Text style={[styles.compactLabel, { 
                  color: wordCount < 50 ? '#6366F1' : textSub,
                  fontWeight: wordCount < 50 ? '600' : '400'
                }]}>
                  Getting started
                </Text>
                <Text style={[styles.compactLabel, { 
                  color: wordCount >= 50 && wordCount < 100 ? '#6366F1' : textSub,
                  fontWeight: wordCount >= 50 && wordCount < 100 ? '600' : '400'
                }]}>
                  Good reflection
                </Text>
                <Text style={[styles.compactLabel, { 
                  color: wordCount >= 100 && wordCount < 150 ? '#6366F1' : textSub,
                  fontWeight: wordCount >= 100 && wordCount < 150 ? '600' : '400'
                }]}>
                  Substantial
                </Text>
                <Text style={[styles.compactLabel, { 
                  color: wordCount >= 150 ? '#6366F1' : textSub,
                  fontWeight: wordCount >= 150 ? '600' : '400'
                }]}>
                  Deep reflection
                </Text>
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
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  backgroundPressable: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stats: {
    alignItems: 'flex-end',
  },
  wordCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  promptContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  promptText: {
    fontSize: 16,
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  writingArea: {
    flex: 1,
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
    paddingHorizontal: 10,
  },
  progressContainer: {
    paddingHorizontal: 10,
    marginBottom: 30,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
    compactLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactLabel: {
    fontSize: 9,
    fontWeight: '400',
    textAlign: 'center',
    flex: 1,
  },
});
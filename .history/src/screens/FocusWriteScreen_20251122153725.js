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
import { useEntries } from '../stores/entriesStore';
import { useTheme } from '../stores/themeStore';
import { useSettings } from '../stores/settingsStore';
import * as Haptics from 'expo-haptics';

export default function FocusWriteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const hapticsEnabled = useSettings((s) => s.hapticsEnabled);

  const { date, prompt, text: initialText = '' } = route.params || {};
  const { updateDraft } = useEntries();
  
  const [text, setText] = useState(initialText);
  const [wordCount, setWordCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
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

  // Update word count and auto-save
  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    
    // Auto-save draft
    if (date) {
      updateDraft(date, text);
    }
  }, [text, date, updateDraft]);

  // Handle save and exit
  const handleSaveAndExit = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.goBack();
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
          
          {/* Minimal Header - Only shows when not focused */}
          {!isFocused && (
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
          )}

          {/* Prompt (only show briefly when starting) */}
          {prompt?.text && !isFocused && wordCount === 0 && (
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
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCorrect={true}
              spellCheck={true}
              scrollEnabled={true}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              selectionColor={isDark ? '#6366F1' : '#6366F1'}
            />
          </View>

          {/* Progress Indicator (only shows when not focused) */}
          {!isFocused && (
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
                      width: `${Math.min((wordCount / 500) * 100, 100)}%`,
                      backgroundColor: '#6366F1'
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: textSub }]}>
                {wordCount}/500 words
              </Text>
            </View>
          )}

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
});
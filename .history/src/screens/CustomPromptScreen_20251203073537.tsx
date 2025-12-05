import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../stores/themeStore';
import { 
  setCustomPrompt, 
  clearCustomPrompt, 
  saveToLibrary, 
  getPromptLibrary, 
  removeFromLibrary 
} from '../lib/prompts'; 
import PremiumPressable from '../components/PremiumPressable';

export default function CustomPromptScreen({ navigation, route }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const { date, currentPrompt, isCustom } = route.params || {};

  const [text, setText] = useState(isCustom ? currentPrompt : '');
  const [library, setLibrary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load library on mount
  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      if (getPromptLibrary) {
        const savedPrompts = await getPromptLibrary();
        setLibrary(savedPrompts || []);
      }
    } catch (e) {
      console.log("Library load error", e);
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    if (true) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    await setCustomPrompt(date, text.trim());
    setIsLoading(false);
    navigation.goBack();
  };

  const handleClear = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await clearCustomPrompt(date);
    navigation.goBack();
  };

  const handleAddToLibrary = async () => {
    if (!text.trim()) return;
    if (saveToLibrary) {
      const newList = await saveToLibrary(text.trim());
      setLibrary(newList);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Prompt added to your collection.");
    }
  };

  const handleDeleteFromLibrary = async (promptText) => {
    if (removeFromLibrary) {
      const newList = await removeFromLibrary(promptText);
      setLibrary(newList);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Theme Colors
  const palette = {
    bg: isDark ? ['#0F172A', '#1E293B'] : ['#F8FAFC', '#F1F5F9'],
    card: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
    text: isDark ? '#E5E7EB' : '#0F172A',
    sub: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    accent: '#6366F1',
  };

  return (
    <LinearGradient
      colors={palette.bg}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text }]}>
              Design Your Day
            </Text>
            <Text style={[styles.subtitle, { color: palette.sub }]}>
              {isCustom 
                ? "Edit your focus for today."
                : "What question do you want to answer today?"}
            </Text>
          </View>

          {/* Main Input Card */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: palette.card, 
              borderColor: palette.border,
              shadowColor: isDark ? "#000" : "#6366F1",
            }
          ]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="e.g., What am I ready to let go of?"
              placeholderTextColor={palette.sub}
              multiline
              maxLength={200}
              style={[styles.input, { color: palette.text }]}
              autoFocus={!isCustom} 
            />
            
            <View style={styles.cardFooter}>
              <Text style={[styles.charCount, { color: palette.sub }]}>
                {text.length}/200
              </Text>

              {/* Save to Library Button (Mini) */}
              {text.trim().length > 0 && saveToLibrary && (
                 <Pressable 
                   onPress={handleAddToLibrary}
                   style={({ pressed }) => [
                     styles.miniBtn,
                     { opacity: pressed ? 0.7 : 1, backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#EEF2FF' }
                   ]}
                 >
                   <Text style={[styles.miniBtnText, { color: palette.accent }]}>+ Save to Library</Text>
                 </Pressable>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <PremiumPressable
              onPress={handleSave}
              disabled={!text.trim() || isLoading}
              haptic="medium"
              style={[
                styles.mainButton,
                { backgroundColor: palette.accent, opacity: !text.trim() ? 0.5 : 1 }
              ]}
            >
              <Text style={styles.mainButtonText}>
                {isLoading ? 'Setting...' : 'Use this Prompt'}
              </Text>
            </PremiumPressable>

            {isCustom && (
              <PremiumPressable
                onPress={handleClear}
                haptic="medium"
                style={[styles.secondaryButton, { borderColor: '#EF4444' }]}
              >
                <Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>
                  Revert to Default
                </Text>
              </PremiumPressable>
            )}
            
            <PremiumPressable
              onPress={() => navigation.goBack()}
              haptic="light"
              style={styles.secondaryButton}
            >
              <Text style={[styles.secondaryButtonText, { color: palette.sub }]}>Cancel</Text>
            </PremiumPressable>
          </View>

          {/* SAVED LIBRARY SECTION */}
          {library.length > 0 && (
            <View style={styles.libraryContainer}>
              <Text style={[styles.sectionTitle, { color: palette.sub }]}>
                FROM YOUR LIBRARY
              </Text>
              
              <View style={styles.libraryGrid}>
                {library.map((item, index) => (
                  <Pressable
                    key={index}
                    onPress={() => setText(item)}
                    style={({ pressed }) => [
                      styles.libraryItem,
                      { 
                        backgroundColor: palette.card,
                        borderColor: palette.border,
                        transform: [{ scale: pressed ? 0.98 : 1 }]
                      }
                    ]}
                  >
                    <Text style={[styles.libraryItemText, { color: palette.text }]} numberOfLines={3}>
                      {item}
                    </Text>
                    
                    <Pressable
                      onPress={() => handleDeleteFromLibrary(item)}
                      hitSlop={10}
                      style={styles.deleteItemBtn}
                    >
                       <Text style={{ fontSize: 16, color: palette.sub }}>×</Text>
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
  },
title: {
    fontSize: 18,        // Much more understated
    fontWeight: '600',   // Lighter weight is "classier"
    marginBottom: 4,
    letterSpacing: 0.5,  // Slight spacing adds elegance
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
input: {
    fontSize: 14,        // Discrete and minimal
    lineHeight: 22,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actions: {
    gap: 12,
  },
  mainButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  libraryContainer: {
    marginTop: 40,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    opacity: 0.6,
  },
  libraryGrid: {
    gap: 12,
  },
  libraryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  libraryItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    marginRight: 12,
    fontWeight: '500',
  },
  deleteItemBtn: {
    padding: 4,
    justifyContent: 'center',
  },
});
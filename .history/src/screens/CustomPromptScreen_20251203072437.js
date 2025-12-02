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
import { setCustomPrompt, clearCustomPrompt, saveToLibrary, getPromptLibrary, removeFromLibrary } from '../lib/prompts'; // Updated imports
import PremiumPressable from '../components/PremiumPressable';

export default function CustomPromptScreen({ navigation, route }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const { date, currentPrompt, isCustom } = route.params || {};

  const [text, setText] = useState(isCustom ? currentPrompt : '');
  const [library, setLibrary] = useState([]);

  // Load library on mount
  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    const savedPrompts = await getPromptLibrary();
    setLibrary(savedPrompts);
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    await setCustomPrompt(date, text.trim());
    navigation.goBack();
  };

  const handleClear = async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await clearCustomPrompt(date);
    navigation.goBack();
  };

  const handleAddToLibrary = async () => {
    if (!text.trim()) return;
    const newList = await saveToLibrary(text.trim());
    setLibrary(newList);
    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert("Saved", "Prompt added to your library.");
  };

  const handleDeleteFromLibrary = async (promptText) => {
    const newList = await removeFromLibrary(promptText);
    setLibrary(newList);
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Determine colors based on theme
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
  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';
  const hapticsEnabled = true; // Assuming enabled or fetch from store if needed

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textMain }]}>Custom Prompt</Text>
            <Text style={[styles.subtitle, { color: textSub }]}>
              Write your own prompt for today
            </Text>
          </View>

          {/* Input Card */}
          <View style={[
            styles.card, 
            { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E2E8F0' }
          ]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="e.g., What am I ready to let go of?"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              multiline
              maxLength={200}
              style={[styles.input, { color: textMain }]}
              autoFocus
            />
            <Text style={[styles.charCount, { color: textSub }]}>{text.length}/200</Text>
            
            {/* Save to Library Button */}
            {text.trim().length > 0 && (
               <Pressable 
                 onPress={handleAddToLibrary}
                 style={({ pressed }) => [
                   styles.libraryBtn,
                   { opacity: pressed ? 0.7 : 1, borderColor: '#6366F1' }
                 ]}
               >
                 <Text style={styles.libraryBtnText}>+ Save to Library</Text>
               </Pressable>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <PremiumPressable
              onPress={handleSave}
              disabled={!text.trim()}
              haptic="medium"
              style={[
                styles.mainButton,
                { backgroundColor: '#6366F1', opacity: !text.trim() ? 0.5 : 1 }
              ]}
            >
              <Text style={styles.mainButtonText}>Use this Prompt</Text>
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
              <Text style={[styles.secondaryButtonText, { color: textSub }]}>Cancel</Text>
            </PremiumPressable>
          </View>

          {/* SAVED LIBRARY SECTION */}
          {library.length > 0 && (
            <View style={styles.libraryContainer}>
              <Text style={[styles.sectionTitle, { color: textSub }]}>Saved Prompts</Text>
              {library.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => setText(item)}
                  style={({ pressed }) => [
                    styles.libraryItem,
                    { 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
                      borderColor: isDark ? '#374151' : '#E2E8F0',
                      opacity: pressed ? 0.9 : 1
                    }
                  ]}
                >
                  <Text style={[styles.libraryItemText, { color: textMain }]}>{item}</Text>
                  <Pressable
                    onPress={() => handleDeleteFromLibrary(item)}
                    hitSlop={10}
                    style={styles.deleteItemBtn}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: 'bold' }}>×</Text>
                  </Pressable>
                </Pressable>
              ))}
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
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  input: {
    fontSize: 18,
    lineHeight: 28,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 8,
  },
  libraryBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  libraryBtnText: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  mainButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
    fontSize: 16,
    fontWeight: '600',
  },
  libraryContainer: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  libraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  libraryItemText: {
    flex: 1,
    fontSize: 15,
    marginRight: 12,
  },
  deleteItemBtn: {
    padding: 4,
  },
});
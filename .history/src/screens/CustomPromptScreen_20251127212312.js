import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useColorScheme,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { setCustomPrompt, clearCustomPrompt } from '../lib/prompts';
import { useTheme } from '../stores/themeStore';
import PremiumPressable from '../components/PremiumPressable';  


export default function CustomPromptScreen({ navigation, route }) {
const systemScheme = useColorScheme();
const { getCurrentTheme } = useTheme();
const currentTheme = getCurrentTheme(systemScheme);
const isDark = currentTheme === 'dark';
  const { date, currentPrompt, isCustom } = route.params;
  
  const [customPrompt, setCustomPromptText] = useState(isCustom ? currentPrompt : '');
  const [isLoading, setIsLoading] = useState(false);

  // Gradients
  const gradients = {
    dark: { primary: ['#0F172A', '#1E293B', '#334155'] },
    light: { primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'] },
  };
const currentGradient = gradients[currentTheme] || gradients.light;

  const handleSave = async () => {
    if (!customPrompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt');
      return;
    }

    setIsLoading(true);
    try {
      await setCustomPrompt(date, customPrompt.trim());
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save custom prompt');
    }
    setIsLoading(false);
  };

  const handleClear = async () => {
    Alert.alert(
      isCustom ? 'Use Default Prompt' : 'Cancel Custom Prompt',
      isCustom 
        ? 'Switch back to today\'s default prompt? Your custom prompt will be removed.'
        : 'Return to today\'s default prompt? Your changes will not be saved.',
      [
        { 
          text: 'Keep Editing', 
          style: 'cancel' 
        },
        { 
          text: isCustom ? 'Use Default' : 'Cancel', 
          style: 'default',
          onPress: async () => {
            setIsLoading(true);
            try {
              if (isCustom) {
                await clearCustomPrompt(date);
              }
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear custom prompt');
            }
            setIsLoading(false);
          }
        },
      ]
    );
  };

  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';
  const borderColor = isDark ? '#374151' : '#D1D5DB';

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: textMain }]}>
          {isCustom ? 'Edit Custom Prompt' : 'Create Custom Prompt'}
        </Text>
        
        <Text style={[styles.description, { color: textSub }]}>
          {isCustom 
            ? 'Edit your custom prompt for today. This will replace the default prompt.'
            : 'Create a custom prompt for today. This will replace the default prompt.'
          }
        </Text>

        <TextInput
          style={[styles.input, { 
            color: textMain, 
            borderColor: borderColor,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF'
          }]}
          placeholder="Enter your custom prompt..."
          placeholderTextColor={textSub}
          value={customPrompt}
          onChangeText={setCustomPromptText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={[styles.note, { color: textSub }]}>
          This custom prompt will only be used for today. Tomorrow will revert to the regular prompt rotation.
        </Text>

        <View style={styles.buttons}>
        <PremiumPressable
            onPress={handleSave}
            disabled={isLoading || !customPrompt.trim()}
            haptic="light"
            style={[
              styles.saveBtn,
              { 
                backgroundColor: '#6366F1',
                opacity: (isLoading || !customPrompt.trim()) ? 0.5 : 1
              }
            ]}
          >
            <Text style={styles.saveBtnText}>
              {isLoading ? 'Saving...' : 'Save Custom Prompt'}
            </Text>
          </PremiumPressable>

          {(isCustom || customPrompt.trim().length > 0) && (
            <PremiumPressable
              onPress={handleClear}
              disabled={isLoading}
              haptic="light"
              style={[
                styles.clearBtn,
                { 
                  borderColor: '#6366F1',
                  opacity: isLoading ? 0.5 : 1
                }
              ]}
            >
              <Text style={[styles.clearBtnText, { color: '#6366F1' }]}>
                {isCustom ? 'Use Default Prompt' : 'Cancel'}
              </Text>
            </PremiumPressable>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    flexGrow: 1, 
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 16,
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  buttons: {
    gap: 12,
  },
  saveBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  clearBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  clearBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
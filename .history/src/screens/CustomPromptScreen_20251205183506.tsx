import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/RootStack';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { saveCustomPrompt } from '../lib/prompts';
import PremiumPressable from '../components/PremiumPressable';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type Props = NativeStackScreenProps<RootStackParamList, 'CustomPrompt'>;

export default function CustomPromptScreen({ navigation, route }: Props) {
  const { date, currentPrompt, isCustom } = route.params;
  const palette = useSharedPalette();
  
  const [promptText, setPromptText] = useState(isCustom ? currentPrompt : '');

  const handleSave = async () => {
    if (!promptText.trim()) {
      Alert.alert('Please enter a prompt');
      return;
    }

    try {
      await saveCustomPrompt(date, promptText.trim());
      // Navigate back to Home, forcing a refresh of the prompt state there
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save custom prompt');
    }
  };

  return (
    <LinearGradient
      colors={[palette.bg, palette.bg]}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: palette.text }]}>Write Your Own Prompt</Text>
            <Text style={[styles.subtitle, { color: palette.subtleText }]}>
              Focus on what matters most to you today.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="e.g. What is one small win I had today?"
              placeholderTextColor={palette.subtleText}
              multiline
              value={promptText}
              onChangeText={setPromptText}
              autoFocus
            />
          </View>

          <View style={styles.footer}>
            <PremiumPressable onPress={() => navigation.goBack()} style={styles.cancelBtn}>
              <Text style={{ color: palette.subtleText, fontWeight: '600' }}>Cancel</Text>
            </PremiumPressable>
            
            <PremiumPressable 
              onPress={handleSave} 
              style={[styles.saveBtn, { backgroundColor: palette.accent }]}
            >
              <Text style={styles.saveBtnText}>Use Prompt</Text>
            </PremiumPressable>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24 },
  header: { marginBottom: 32, marginTop: 16 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16 },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    minHeight: 150,
  },
  input: {
    fontSize: 18,
    lineHeight: 28,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12
  },
  cancelBtn: { padding: 12 },
  saveBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
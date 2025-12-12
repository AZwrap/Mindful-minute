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

import { RotateCcw } from 'lucide-react-native'; // <--- Icon for Reset
import { RootStackParamList } from '../navigation/RootStack';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { saveCustomPrompt, resetToDailyPrompt } from '../lib/prompts'; // <--- Updated import
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
      // Navigate back to Home, forcing a refresh
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save custom prompt');
    }
  };

  const handleReset = async () => {
    try {
      await resetToDailyPrompt(date);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to reset prompt');
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

          {/* Revert Action - Placed below card for better context */}
          {isCustom && (
            <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
                <PremiumPressable 
                    onPress={handleReset} 
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.8, padding: 8 }}
                >
                    <RotateCcw size={14} color="#EF4444" />
                    <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>
                        Revert to Original
                    </Text>
                </PremiumPressable>
            </View>
          )}

          <View style={styles.footer}>
            <PremiumPressable onPress={() => navigation.goBack()} style={styles.cancelBtn}>
                <Text style={{ color: palette.subtleText, fontWeight: '600', fontSize: 16 }}>Cancel</Text>
            </PremiumPressable>
            
            <PremiumPressable 
              onPress={handleSave} 
              haptic="medium"
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
  header: { marginBottom: 24, marginTop: 16 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 22 },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    minHeight: 160,
    textAlignVertical: 'top', // Android fix
  },
  input: {
    fontSize: 18,
    lineHeight: 28,
    textAlignVertical: 'top', // Android fix
    minHeight: 120,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtn: { 
    paddingVertical: 14, 
    paddingHorizontal: 12,
  },
  saveBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { 
    color: 'white', 
    fontWeight: '700', 
    fontSize: 16,
    letterSpacing: 0.5
  },
});
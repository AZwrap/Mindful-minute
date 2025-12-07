import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, Image } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// Navigation
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';

// Stores & Types
import { useEntriesStore, JournalEntry } from "../stores/entriesStore"; 
import { useTheme } from '../stores/themeStore';
import { useSharedPalette } from '../hooks/useSharedPalette';

// Components
import PremiumPressable from '../components/PremiumPressable';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type Props = NativeStackScreenProps<RootStackParamList, 'EntryDetail'>;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function formatDate(iso: string | undefined): string {
  if (!iso) return 'Unknown Date';
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso; // Fallback to raw string if parse fails
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(entry: JournalEntry): string {
  if (entry?.createdAt) {
    const d = new Date(entry.createdAt);
    return d.toLocaleTimeString(undefined, { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  }
  return "Time not recorded";
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function EntryDetailScreen({ route, navigation }: Props) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const palette = useSharedPalette();

  const { date } = route.params;

  // Select entry from store
  const entry = useEntriesStore((s) => s.entries[date]);

  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B', '#334155'],
      card: ['rgba(30, 41, 59, 0.4)', 'rgba(15, 23, 42, 0.6)'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
      card: ['rgba(241, 245, 249, 0.6)', 'rgba(248, 250, 252, 0.8)'],
    },
  };

  const currentGradient = gradients[currentTheme as keyof typeof gradients] || gradients.light;

  const [themeLoaded, setThemeLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setThemeLoaded(true);
  }, []);

  if (!themeLoaded) {
    return null;
  }

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: palette.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: palette.text, fontSize: 16 }}>Entry not found.</Text>
        <PremiumPressable 
          onPress={() => navigation.goBack()} 
          style={{ marginTop: 20, padding: 10 }}
        >
           <Text style={{ color: palette.accent, fontWeight: '600' }}>Go Back</Text>
        </PremiumPressable>
      </View>
    );
  }

  const textMain = palette.text;
  const textSub = palette.subtleText;
  const formattedDate = formatDate(date);

  // Build text for export/copy
  const buildExportText = () => `
MINDFUL MINUTE ENTRY
Date: ${formattedDate}
Prompt: ${entry.prompt?.text || entry.promptText || 'No Prompt'}

Your Entry:
${entry.text || ''}

Mood: ${entry.moodTag?.value || 'Not specified'}
  `.trim();

  const exportEntry = async () => {
    try {
      const content = buildExportText();
      const fileUri = FileSystem.documentDirectory + `mindful-minute-${date}.txt`;
      
      await FileSystem.writeAsStringAsync(fileUri, content);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: `Share Journal Entry - ${formattedDate}`,
        });
      }
    } catch (error) {
      console.log('Export error:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      const content = buildExportText();
      await Clipboard.setStringAsync(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.log('Clipboard error:', error);
    }
  };

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LinearGradient
        colors={currentGradient.card}
        style={styles.contentCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.title, { color: textMain }]}>Journal Entry</Text>
          <Text style={[styles.date, { color: textSub }]}>{formattedDate}</Text>
          <Text style={[styles.time, { color: textSub }]}>{formatTime(entry)}</Text>

          <Text style={[styles.label, { color: textSub }]}>Prompt</Text>
          <Text style={[styles.prompt, { color: textMain }]}>{entry.prompt?.text || entry.promptText}</Text>

{entry.imageUri && (
            <View style={{ marginBottom: 20 }}>
              <Image 
                source={{ uri: entry.imageUri }} 
                style={{ width: '100%', height: 200, borderRadius: 16 }} 
                resizeMode="cover"
              />
            </View>
          )}

          <Text style={[styles.label, { color: textSub }]}>Your Reflection</Text>
          <Text style={[styles.entry, { color: textMain }]}>{entry.text}</Text>

          {entry.moodTag?.value && (
            <View style={styles.moodSection}>
              <Text style={[styles.label, { color: textSub }]}>Mood</Text>
              <View
                style={[
                  styles.moodTag,
                  {
                    backgroundColor: isDark
                      ? 'rgba(99,102,241,0.15)'
                      : 'rgba(99,102,241,0.08)',
                  },
                ]}
              >
                <Text style={[styles.moodText, { color: '#6366F1' }]}>
                  {entry.moodTag.value}
                </Text>
              </View>
            </View>
          )}

          {/* Buttons row */}
          <View style={styles.buttonsRow}>
            <PremiumPressable
              onPress={copyToClipboard}
              haptic="light"
              style={[
                styles.copyBtn,
                {
                  borderColor: isDark
                    ? "rgba(99,102,241,0.4)"
                    : "rgba(99,102,241,0.3)",
                },
              ]}
            >
              <Text
                style={[
                  styles.copyBtnText,
                  {
                    color: "#6366F1",
                  },
                ]}
              >
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </Text>
            </PremiumPressable>

            <PremiumPressable
              onPress={exportEntry}
              haptic="light"
              style={[
                styles.exportBtn,
                { backgroundColor: '#6366F1' },
              ]}
            >
              <Text style={[styles.exportText, { color: 'white' }]}>
                Export Entry
              </Text>
            </PremiumPressable>
          </View>
        </ScrollView>
      </LinearGradient>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  contentCard: {
    flex: 1,
    margin: 20,
    marginTop: 10,
    padding: 24,
    borderRadius: 24,
  },
  scrollContent: {
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  prompt: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  entry: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  moodSection: {
    marginBottom: 16,
  },
  moodTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportText: {
    fontWeight: '700',
    fontSize: 16,
  },
  date: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 2,
  },
  time: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  copyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  copyBtnText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
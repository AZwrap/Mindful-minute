import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, Image, Modal, FlatList, TouchableOpacity, Linking } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Pencil, Users, Copy, X, CheckSquare, Square, PlayCircle, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
// @ts-ignore
import { getRecommendedPlaylist } from '../constants/moodCategories';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// Navigation
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';

// Stores & Types
import { useEntriesStore, JournalEntry } from "../stores/entriesStore"; 
import { useTheme } from '../stores/themeStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { useJournalStore } from '../stores/journalStore';
import { auth } from '../firebaseConfig';
// @ts-ignore
import { addSharedEntry } from '../services/syncedJournalService';

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
const { journals, currentJournalId, sharedEntries, setSharedEntries } = useJournalStore(); // Get full list, data & setter

  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

// --- SHARE LOGIC ---
  const openShareModal = () => {
    const allIds = Object.keys(journals);
    if (allIds.length === 0) {
      alert("No Shared Groups Found. Go to the 'Together' tab to create or join one first.");
      return;
    }
    
    // Default to current journal ONLY if it doesn't already have the entry
    let initialIds: string[] = [];
    if (currentJournalId) {
        const isAlreadyShared = sharedEntries[currentJournalId]?.some((e: any) => e.originalDate === date);
        if (!isAlreadyShared) {
            initialIds = [currentJournalId];
        }
    }

    setSelectedIds(initialIds);
    setShowShareModal(true);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
const handlePlayMusic = async () => {
    const mood = entry.moodTag?.value;
    if (!mood) return;

    // Use the central helper to get the smart playlist (same as MoodTagScreen)
    const playlist = getRecommendedPlaylist(mood);

    if (playlist && playlist.url) {
      try {
        await Linking.openURL(playlist.url);
      } catch (err) {
        console.error("Failed to open link:", err);
        alert("Could not open music app.");
      }
    } else {
      alert(`No playlist found for ${mood}`);
    }
  };
const handleSelectAll = () => {
    // Filter out journals where this entry is already shared
    const availableIds = Object.keys(journals).filter(jid => {
       const isAlreadyShared = sharedEntries[jid]?.some((e: any) => e.originalDate === date);
       return !isAlreadyShared;
    });
    setSelectedIds(availableIds);
  };
  const handleClear = () => setSelectedIds([]);

const confirmShare = async () => {
    // Safety: Filter out already shared IDs just in case they were selected
    const validIds = selectedIds.filter(jid => {
         const isShared = sharedEntries[jid]?.some((e: any) => e.originalDate === date);
         return !isShared;
    });

    if (validIds.length === 0) return;
    
// 1. Prepare data
    // Generate a permanent ID now so Local and Cloud match perfectly
    const uniqueId = `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cleanEntry = JSON.parse(JSON.stringify(entry)); // Remove 'undefined' to prevent crashes

    const sharedEntryData = {
        ...cleanEntry,
        entryId: uniqueId,
        sharedAt: Date.now(),
        originalDate: date,
        userId: auth.currentUser?.uid, // Required for Firestore Rules
        authorName: auth.currentUser?.displayName || "Member",
        createdAt: entry.createdAt || new Date().toISOString()
    };

    // 2. OPTIMISTIC UPDATE: Update UI immediately (Don't wait for Cloud)
    validIds.forEach(jid => {
       const currentList = sharedEntries[jid] || [];
       if (!currentList.some((e: any) => e.originalDate === date)) {
           setSharedEntries(jid, [sharedEntryData, ...currentList]); // Add to top
       }
    });

    // 3. Close Modal & Reset immediately
    setShowShareModal(false);
    setSelectedIds([]); 
    const count = validIds.length;
    alert(`Shared to ${count} group${count === 1 ? '' : 's'}!`);

    // 4. Send to Cloud in Background (Fire & Forget)
    try {
      const promises = validIds.map(jid => 
        addSharedEntry(jid, sharedEntryData)
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Background share failed:", e);
      // Optional: Show a subtle toast here if it fails, but for now we assume success to keep it fast.
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
            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={{ width: 40 }} /> 
              <View>
                <Text style={[styles.title, { color: textMain }]}>Journal Entry</Text>
                <Text style={[styles.date, { color: textSub }]}>{formattedDate}</Text>
              </View>
              <PremiumPressable
                onPress={() => navigation.navigate('Write', { 
                  date, 
                  text: entry.text, 
                  prompt: entry.prompt || { text: entry.promptText || '' } 
                })}
                haptic="light"
                style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
              >
                <Pencil size={18} color={textMain} />
              </PremiumPressable>
            </View>

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
                <Text style={[styles.label, { color: textSub }]}>Mood & Atmosphere</Text>
                
                <View style={styles.moodRow}>
{/* Mood Pill */}
                  <View
                    style={[
                      styles.moodTag,
                      {
                        backgroundColor: isDark
                          ? 'rgba(99,102,241,0.15)'
                          : 'rgba(99,102,241,0.08)',
                        borderColor: isDark
                          ? 'rgba(99,102,241,0.3)'
                          : 'rgba(99,102,241,0.2)',
                      },
                    ]}
                  >
                    <Text style={[styles.moodText, { color: '#6366F1' }]}>
                      {entry.moodTag.value}
                    </Text>
                  </View>

{/* Music Button - Indigo Theme */}
                  <PremiumPressable
                    onPress={handlePlayMusic}
                    style={[
                      styles.musicBtn,
                      { 
                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(99, 102, 241, 0.05)',
                        borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
                        borderWidth: 1,
                      }
                    ]}
                  >
                    <PlayCircle size={16} color={palette.accent} />
                    <Text style={[styles.musicBtnText, { color: palette.accent }]}>
                      Play {entry.moodTag.value} Mix
                    </Text>
                  </PremiumPressable>
                </View>
              </View>
            )}

{/* Actions Container */}
            <View style={styles.actionContainer}>
              {/* 1. Primary Action: Share to Group (if available) */}
              {auth.currentUser && Object.keys(journals).length > 0 && (
                <PremiumPressable
                  onPress={openShareModal}
                  haptic="medium"
                  style={[
                    styles.primaryActionBtn,
                    { 
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                      borderColor: '#10B981',
                    }
                  ]}
                >
                  <Users size={20} color="#059669" />
                  <Text style={[styles.btnText, { color: '#059669' }]}>
                    {isSharing ? "Sending..." : "Share to Group"}
                  </Text>
                </PremiumPressable>
              )}

              {/* 2. Secondary Actions: Copy & Export */}
              <View style={styles.secondaryActionsRow}>
                <PremiumPressable
                  onPress={copyToClipboard}
                  haptic="light"
                  style={[
                    styles.secondaryBtn,
                    {
                      borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)",
                      backgroundColor: 'transparent',
                    },
                  ]}
                >
                  <Copy size={18} color="#6366F1" />
                  <Text style={[styles.btnText, { color: "#6366F1" }]}>
                    {copied ? "Copied" : "Copy"}
                  </Text>
                </PremiumPressable>

                <PremiumPressable
                  onPress={exportEntry}
                  haptic="light"
                  style={[
                    styles.secondaryBtn,
                    { backgroundColor: '#6366F1', borderColor: '#6366F1' },
                  ]}
                >
                  <Share2 size={18} color="white" />
                  <Text style={[styles.btnText, { color: 'white' }]}>
                    Export
                  </Text>
                </PremiumPressable>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>

        {/* SHARE SELECTION MODAL */}
        <Modal
          visible={showShareModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowShareModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? '#1E293B' : 'white' }]}>
              
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textMain }]}>Share to Groups</Text>
                <TouchableOpacity onPress={() => setShowShareModal(false)}>
                  <X size={24} color={textSub} />
                </TouchableOpacity>
              </View>

              {/* Controls */}
              <View style={styles.modalControls}>
                <TouchableOpacity onPress={handleSelectAll}>
                  <Text style={{ color: palette.accent, fontWeight: '600' }}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClear}>
                  <Text style={{ color: textSub, fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              </View>

{/* List */}
              <FlatList
                data={Object.values(journals)}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => {
                  const isSelected = selectedIds.includes(item.id);
                  // Check if entry is already in this journal (matched by originalDate)
                  const isAlreadyShared = sharedEntries[item.id]?.some((e: any) => e.originalDate === date);

                  return (
                    <TouchableOpacity 
                      style={[styles.journalItem, { borderColor: palette.border, opacity: isAlreadyShared ? 0.6 : 1 }]} 
                      onPress={() => !isAlreadyShared && toggleSelection(item.id)}
                      disabled={isAlreadyShared}
                    >
                      <View>
                        <Text style={[styles.journalName, { color: textMain }]}>{item.name}</Text>
                        {isAlreadyShared && (
                          <Text style={{ fontSize: 10, color: palette.sub, fontWeight: '600', marginTop: 2 }}>
                            Already Shared
                          </Text>
                        )}
                      </View>
                      
                      {isAlreadyShared 
                        ? <CheckSquare size={22} color={palette.sub} />
                        : (isSelected 
                            ? <CheckSquare size={22} color={palette.accent} />
                            : <Square size={22} color={textSub} />
                          )
                      }
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Confirm Button */}
              <PremiumPressable
                onPress={confirmShare}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: palette.accent, opacity: selectedIds.length === 0 ? 0.5 : 1 }
                ]}
                disabled={selectedIds.length === 0 || isSharing}
              >
                <Text style={styles.confirmBtnText}>
                  {isSharing ? "Sending..." : `Share (${selectedIds.length})`}
                </Text>
              </PremiumPressable>

            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
moodTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  musicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  moodText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  musicBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
actionContainer: {
    marginTop: 12,
    gap: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    width: '100%',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  journalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  journalName: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
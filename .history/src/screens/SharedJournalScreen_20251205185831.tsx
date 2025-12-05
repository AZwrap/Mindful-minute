import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PenTool, Share2, LogOut } from 'lucide-react-native';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { createInviteLink, leaveSharedJournal } from '../services/syncedJournalService';
import PremiumPressable from '../components/PremiumPressable';
import * as Clipboard from 'expo-clipboard';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedJournal'>;

export default function SharedJournalScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
  const palette = useSharedPalette();
  
  const { 
    joinJournal, 
    sharedEntries, 
    journalInfo, 
    currentUser 
  } = useJournalStore();

  const entries = sharedEntries[journalId] || [];
  const journal = useJournalStore(s => s.journals[journalId]) || journalInfo;

  // Load journal data on mount
  useEffect(() => {
    joinJournal(journalId);
  }, [journalId]);

  const handleInvite = async () => {
    if (!currentUser) {
        Alert.alert("Error", "You must be signed in to invite others.");
        return;
    }
    try {
      const link = await createInviteLink(journalId, currentUser);
      await Clipboard.setStringAsync(link);
      Alert.alert('Copied!', 'Invite link copied to clipboard.');
    } catch (e) {
      Alert.alert('Error', 'Failed to create invite link.');
    }
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave Journal",
      "Are you sure? You won't see these entries anymore.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive", 
          onPress: async () => {
            if (currentUser) {
                await leaveSharedJournal(journalId, currentUser);
                navigation.goBack();
            }
          }
        }
      ]
    );
  };

  return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
             <Text style={[styles.title, { color: palette.text }]}>{journal?.name || 'Shared Journal'}</Text>
             <Text style={[styles.subtitle, { color: palette.subtleText }]}>
                {journal?.members?.length || 1} Members • {entries.length} Entries
             </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PremiumPressable onPress={handleInvite} style={[styles.iconBtn, { backgroundColor: palette.card }]}>
                <Share2 size={20} color={palette.accent} />
            </PremiumPressable>
            <PremiumPressable onPress={handleLeave} style={[styles.iconBtn, { backgroundColor: palette.card }]}>
                <LogOut size={20} color="#EF4444" />
            </PremiumPressable>
          </View>
        </View>

        <FlatList
          data={entries}
          keyExtractor={(item) => item.entryId || Math.random().toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PremiumPressable 
              onPress={() => navigation.navigate('SharedEntryDetail', { entry: item })}
              style={[styles.entryCard, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <Text style={[styles.entryDate, { color: palette.subtleText }]}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
              <Text style={[styles.entryText, { color: palette.text }]} numberOfLines={3}>
                {item.text}
              </Text>
              <Text style={[styles.entryAuthor, { color: palette.accent }]}>
                — {item.authorName || 'Anonymous'}
              </Text>
            </PremiumPressable>
          )}
          ListEmptyComponent={
             <View style={styles.empty}>
                 <Text style={[styles.emptyText, { color: palette.subtleText }]}>No entries yet.</Text>
             </View>
          }
        />

        <PremiumPressable
          onPress={() => navigation.navigate('SharedWrite', { journalId })}
          style={[styles.fab, { backgroundColor: palette.accent }]}
        >
          <PenTool color="white" size={24} />
        </PremiumPressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  list: { padding: 16, gap: 12 },
  entryCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  entryDate: { fontSize: 12, marginBottom: 8, fontWeight: '600' },
  entryText: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
  entryAuthor: { fontSize: 12, fontWeight: '700', fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 30, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16 },
  iconBtn: { padding: 10, borderRadius: 12 },
});
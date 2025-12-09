import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Users, Copy, LogOut, ChevronLeft } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { leaveSharedJournal } from '../services/syncedJournalService';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'JournalDetails'>;

export default function JournalDetailsScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
  const palette = useSharedPalette();
  
  const { journals, currentUser, leaveJournal, removeJournal } = useJournalStore();
  const journal = journals[journalId];

  if (!journal) {
    return (
      <View style={[styles.container, { backgroundColor: palette.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: palette.subtleText }}>Journal not found.</Text>
        <PremiumPressable onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
            <Text style={{ color: palette.accent }}>Go Back</Text>
        </PremiumPressable>
      </View>
    );
  }

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(journal.id);
    Alert.alert("Copied!", "Invite code copied to clipboard.");
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave Group?",
      "You will no longer see these entries.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive", 
          onPress: async () => {
            if (currentUser) {
                await leaveSharedJournal(journalId, currentUser);
                leaveJournal(); // Clear active state
                removeJournal(journalId); // Remove from local list
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
            }
          }
        }
      ]
    );
  };

  return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <PremiumPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={palette.text} />
          </PremiumPressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>Group Info</Text>
          <View style={{ width: 24 }} /> 
        </View>

        <View style={styles.content}>
            {/* INFO CARD */}
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.label, { color: palette.subtleText }]}>JOURNAL NAME</Text>
                <Text style={[styles.value, { color: palette.text }]}>{journal.name}</Text>
                
                <View style={[styles.divider, { backgroundColor: palette.border }]} />
                
                <Text style={[styles.label, { color: palette.subtleText }]}>INVITE CODE</Text>
                <PremiumPressable onPress={handleCopyCode} style={styles.codeRow}>
                    <Text style={[styles.code, { color: palette.accent }]}>{journal.id}</Text>
                    <Copy size={16} color={palette.accent} />
                </PremiumPressable>
            </View>

            {/* MEMBERS LIST */}
            <Text style={[styles.sectionTitle, { color: palette.subtleText }]}>
                MEMBERS ({journal.members.length})
            </Text>
            
            <FlatList
                data={journal.members}
                keyExtractor={(item, index) => item + index}
                renderItem={({ item }) => (
                    <View style={[styles.memberRow, { backgroundColor: palette.card, borderColor: palette.border }]}>
                        <View style={[styles.avatar, { backgroundColor: palette.accent + '20' }]}>
                            <Users size={18} color={palette.accent} />
                        </View>
                        <Text style={[styles.memberName, { color: palette.text }]}>{item}</Text>
                    </View>
                )}
                contentContainerStyle={{ gap: 8 }}
            />

            {/* DANGER ZONE */}
            <PremiumPressable 
                onPress={handleLeave}
                style={[styles.leaveBtn, { borderColor: '#EF4444' + '40', backgroundColor: '#EF4444' + '10' }]}
            >
                <LogOut size={18} color="#EF4444" />
                <Text style={styles.leaveText}>Leave Journal</Text>
            </PremiumPressable>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  backBtn: { padding: 4 },
  content: { flex: 1, padding: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 18, fontWeight: '600' },
  divider: { height: 1, width: '100%', marginVertical: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  code: { fontSize: 20, fontWeight: '700', letterSpacing: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 12, marginLeft: 4 },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 16, fontWeight: '500' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 'auto' },
  leaveText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
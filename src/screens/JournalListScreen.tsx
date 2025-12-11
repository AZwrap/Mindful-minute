import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, TextInput, Keyboard, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus, Users, ChevronRight, CloudDownload } from 'lucide-react-native';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import PremiumPressable from '../components/PremiumPressable';
import { auth } from '../firebaseConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'JournalList'>;

export default function JournalListScreen({ navigation }: Props) {
  const palette = useSharedPalette();
  const { journals, createJournal, joinJournal, restoreJournals, currentUser, lastRead } = useJournalStore();
  const journalList = Object.values(journals);

// Join State
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (currentUser) await restoreJournals();
    } catch (error) {
      console.log("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

// Helper to guard cloud features
  const requireAuth = (action: () => void) => {
    // Check auth.currentUser directly to prevent "stale state" bugs
    if (auth.currentUser || currentUser) {
      action();
    } else {
      Alert.alert(
        "Account Required",
        "You need to sign in to use shared journals.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => navigation.navigate("Auth") }
        ]
      );
    }
  };

  const handleCreate = () => {
    requireAuth(() => navigation.navigate('Invite'));
  };

  const handleJoinSubmit = async () => {
    if (!joinCode.trim()) {
      setIsJoining(false);
      return;
    }
    
    if (!currentUser) {
      requireAuth(() => {}); // Trigger auth prompt
      return;
    }

    try {
      // 1. Join
      await joinJournal(joinCode.trim(), "Member"); // Replace "Member" with real name
      
      // 2. Reset & Navigate
      setJoinCode('');
      setIsJoining(false);
      Keyboard.dismiss();
      navigation.navigate('SharedJournal', { journalId: joinCode.trim() });
      
    } catch (error) {
      Alert.alert("Join Failed", "Could not find a journal with that ID.");
    }
  };

const handleRestore = () => {
    requireAuth(async () => {
      try {
        const count = await restoreJournals();
        Alert.alert("Restore Complete", `Found and restored ${count} group(s).`);
      } catch (e) {
        Alert.alert("Error", "Could not restore groups. Please try again.");
      }
    });
  };
  
  return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
<View style={styles.headerColumn}>
<View style={styles.headerRow}>
            <Text style={[styles.title, { color: palette.text }]}>My Groups</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {/* Restore (Icon Only) */}
              <Pressable onPress={handleRestore} hitSlop={8} style={{ opacity: 0.7 }}>
                <CloudDownload size={22} color={palette.text} />
              </Pressable>

              {/* Join Toggle (Icon Only) */}
              <Pressable onPress={() => setIsJoining(!isJoining)} hitSlop={8} style={{ opacity: isJoining ? 1 : 0.7 }}>
                <Users size={22} color={isJoining ? palette.accent : palette.text} />
              </Pressable>

              {/* Create Button (Primary) */}
              <PremiumPressable 
                onPress={handleCreate} 
                style={[styles.actionBtn, { backgroundColor: palette.accent, paddingVertical: 8, paddingHorizontal: 16 }]}
              >
                <Plus color="white" size={18} />
                <Text style={styles.btnTextWhite}>Create</Text>
              </PremiumPressable>
            </View>
          </View>

          {/* Collapsible Join Input */}
          {isJoining && (
            <View style={styles.joinContainer}>
              <TextInput
                style={[styles.joinInput, { backgroundColor: palette.card, color: palette.text, borderColor: palette.accent }]}
                placeholder="Enter Journal ID..."
                placeholderTextColor={palette.subtleText}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <PremiumPressable onPress={handleJoinSubmit} style={[styles.joinConfirmBtn, { backgroundColor: palette.accent }]}>
                <ChevronRight color="white" size={20} />
              </PremiumPressable>
            </View>
          )}
        </View>

<FlatList
          data={journalList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: palette.subtleText }]}>
                You haven't joined any journals yet.
              </Text>
            </View>
          }
renderItem={({ item }) => {
            // Format relative time helper
            const getTimeAgo = (ts?: number) => {
              if (!ts) return '';
              const diff = Date.now() - ts;
              const mins = Math.floor(diff / 60000);
              if (mins < 1) return 'Just now';
              if (mins < 60) return `${mins}m`;
              const hours = Math.floor(mins / 60);
              if (hours < 24) return `${hours}h`;
              return Math.floor(hours / 24) + 'd';
            };

const lastMsg = item.lastEntry;
            const lastReadTime = lastRead[item.id] || 0;
            const isUnread = (item.updatedAt || 0) > lastReadTime;

return (
              <PremiumPressable
                onPress={() => navigation.navigate('SharedJournal', { journalId: item.id })}
                style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <View style={styles.cardContent}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.groupIcon} />
                  ) : (
                    <View style={[styles.iconBox, { backgroundColor: palette.accent + '20' }]}>
                      <Users size={20} color={palette.accent} />
                    </View>
                  )}
                  
                  <View style={{ flex: 1 }}>
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.cardTitle, { color: palette.text }]}>{item.name}</Text>
                        {isUnread && <View style={styles.unreadDot} />}
                      </View>
                      {lastMsg && (
                        <Text style={{ fontSize: 11, color: palette.accent, fontWeight: '600' }}>
                          {getTimeAgo(lastMsg.createdAt)}
                        </Text>
                      )}
                    </View>
                    
<Text style={[styles.cardSub, { color: palette.subtleText }]} numberOfLines={1}>
                      {lastMsg 
                        ? `${lastMsg.author}: ${lastMsg.text}` 
                        : `${item.memberIds?.length || item.members.length} member${(item.memberIds?.length || item.members.length) !== 1 ? 's' : ''}`
                      }
                    </Text>
                  </View>
                  {!lastMsg && <ChevronRight size={16} color={palette.subtleText} />}
                </View>
              </PremiumPressable>
            );
          }}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerColumn: { padding: 20, paddingBottom: 10, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800' },
  
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  btnTextWhite: { color: 'white', fontWeight: '700', fontSize: 14 },
  
  joinContainer: { flexDirection: 'row', gap: 8 },
  joinInput: { flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, fontSize: 16 },
  joinConfirmBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

list: { padding: 16, paddingTop: 10 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 2 },
  empty: { marginTop: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' },
});
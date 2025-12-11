import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Share, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Users, Copy, LogOut, ChevronLeft, Download, Shield, Trash2, MoreVertical, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../firebaseConfig';

import { MediaService } from '../services/mediaService';
import { JournalService } from '../services/journalService';
import { exportSharedJournalPDF } from '../utils/exportHelper';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { leaveSharedJournal, kickMember, updateMemberRole, deleteSharedJournal } from '../services/syncedJournalService';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'JournalDetails'>;

export default function JournalDetailsScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
  const palette = useSharedPalette();
  
// Get sharedEntries so handleExport doesn't crash
  const { journals, leaveJournal, removeJournal, sharedEntries, updateJournalMeta } = useJournalStore();
  const journal = journals[journalId];
  const currentUser = auth.currentUser;

  // Logic: Export PDF
  const handleExport = async () => {
    const entries = sharedEntries[journalId] || [];
    if (entries.length === 0) {
      Alert.alert("No Data", "There are no entries to export yet.");
      return;
    }
await exportSharedJournalPDF(journal.name, entries);
  };

// Logic: Member Management
  const isOwner = journal?.owner === auth.currentUser?.uid;
  
const handleMemberPress = (memberId: string) => {
    if (!isOwner || memberId === currentUser?.uid) return;

    Alert.alert(
      "Manage Member",
      "Choose an action",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Kick User", 
          style: "destructive",
          onPress: async () => {
             await JournalService.kickMember(journalId, memberId);
             Alert.alert("Success", "User removed.");
          }
        },
        { 
          text: "Make Admin", 
          onPress: async () => {
             await JournalService.updateMemberRole(journalId, memberId, 'admin');
             Alert.alert("Success", "User promoted to Admin.");
          }
        },
        { 
            text: "Demote to Member", 
            onPress: async () => {
               await JournalService.updateMemberRole(journalId, memberId, 'member');
               Alert.alert("Success", "User is now a member.");
            }
          }
      ]
    );
  };

const handleDeleteGroup = () => {
    Alert.alert(
      "Delete Group",
      "Are you sure? This will remove the journal for EVERYONE. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Forever", 
          style: "destructive", 
          onPress: async () => {
             await JournalService.deleteJournal(journalId);
             removeJournal(journalId);
             navigation.reset({
               index: 0,
               routes: [{ name: 'MainTabs' }],
             });
          }
        }
      ]
    );
  };

  // Logic: Share Deep Link
  const handleShareLink = async () => {
    const link = `mindfulminute://join/${journal.id}`;
    try {
      await Share.share({
        message: `Join my shared journal on Mindful Minute! Tap here:\n${link}`,
      });
    } catch (error) {
      Alert.alert("Error", "Could not share link.");
    }
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
                leaveJournal();
                removeJournal(journalId);
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
            }
          }
        }
      ]
    );
  const handleUpdatePhoto = async () => {
    if (!isOwner) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images, // Correct: New API
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        // 1. Convert/Upload
        const uploadUrl = await MediaService.uploadImage(result.assets[0].uri);
        
        if (uploadUrl) {
           // 2. Save to Firestore
           await JournalService.updateJournalPhoto(journalId, uploadUrl);
           
           // 3. Fetch fresh data to ensure consistency
           const updatedJournal = await JournalService.getJournal(journalId);
           
           if (updatedJournal) {
             // 4. Update Store with fresh data (Updates UI immediately)
             updateJournalMeta(journalId, updatedJournal);
             Alert.alert("Success", "Group photo updated!");
           }
        }
      }
    } catch (e) {
      console.error("Photo Update Error:", e);
      Alert.alert("Error", "Failed to update photo.");
    }
  };

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
          {/* GROUP PHOTO */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <TouchableOpacity onPress={handleUpdatePhoto} disabled={!isOwner} activeOpacity={0.8}>
              <View style={[styles.groupAvatar, { backgroundColor: palette.card, borderColor: palette.border }]}>
                {journal.photoUrl ? (
                  <Image source={{ uri: journal.photoUrl }} style={styles.groupAvatarImage} />
                ) : (
                  <Users size={40} color={palette.subtleText} />
                )}
                {isOwner && (
                  <View style={[styles.editBadge, { backgroundColor: palette.accent }]}>
                    <Camera size={12} color="white" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* INFO CARD */}
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.label, { color: palette.subtleText }]}>JOURNAL NAME</Text>
                <Text style={[styles.value, { color: palette.text }]}>{journal.name}</Text>
                
                <View style={[styles.divider, { backgroundColor: palette.border }]} />
                
                {/* Invite Link UI (Whitespace removed between Text and Icon) */}
                <Text style={[styles.label, { color: palette.subtleText }]}>INVITE LINK</Text>
                <PremiumPressable onPress={handleShareLink} style={styles.codeRow}>
                    <Text style={[styles.code, { color: palette.accent, textDecorationLine: 'underline' }]}>Share Invite Link</Text>
                    <Copy size={16} color={palette.accent} />
                </PremiumPressable>
                <Text style={{ fontSize: 10, color: palette.subtleText, marginTop: 6 }}>
                    Code: {journal.id}
                </Text>
            </View>

{/* MEMBERS LIST */}
            <Text style={[styles.sectionTitle, { color: palette.subtleText }]}>
                MEMBERS ({journal.members?.length || 0})
            </Text>
            
<FlatList
                data={journal.members || []}
                keyExtractor={(item) => item}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const role = journal.roles?.[item] || 'member';
                  const isMe = item === currentUser?.uid;
                  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
    
                  return (
                    <PremiumPressable 
                      onPress={() => handleMemberPress(item)}
                      style={[styles.memberRow, { borderColor: palette.border, marginBottom: 8, justifyContent: 'space-between' }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.avatar, { backgroundColor: role === 'owner' ? '#F59E0B' : palette.accent }]}>
                          {role === 'owner' ? <Shield size={16} color="white" /> : <Users size={16} color="white" />}
                        </View>
                        <View>
                          <Text style={[styles.memberName, { color: palette.text }]}>
                            {isMe ? 'You' : `User...${item.slice(-4)}`}
                          </Text>
                          <Text style={{ fontSize: 12, color: palette.subtleText }}>
                            {displayRole}
                          </Text>
                        </View>
                      </View>
                      
                      {isOwner && !isMe && (
                         <MoreVertical size={20} color={palette.subtleText} />
                      )}
                    </PremiumPressable>
                  );
                }}
            />

            {/* ACTIONS */}
            <Text style={[styles.sectionTitle, { color: palette.subtleText, marginTop: 24 }]}>
                ACTIONS
            </Text>

            <PremiumPressable 
                onPress={handleExport}
                style={[styles.actionRow, { backgroundColor: palette.card, borderColor: palette.border, marginBottom: 12 }]}
            >
                <Download size={20} color={palette.text} />
                <Text style={[styles.actionText, { color: palette.text }]}>Export PDF</Text>
            </PremiumPressable>

{/* DANGER ZONE */}
            {isOwner ? (
                <PremiumPressable 
                    onPress={handleDeleteGroup}
                    style={[styles.leaveBtn, { borderColor: '#EF4444' + '40', backgroundColor: '#EF4444' + '10' }]}
                >
                    <Trash2 size={18} color="#EF4444" />
                    <Text style={styles.leaveText}>Delete Group</Text>
                </PremiumPressable>
            ) : (
                <PremiumPressable 
                    onPress={() => {
                        Alert.alert("Leave Journal", "Are you sure?", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Leave", style: "destructive", onPress: async () => {
                                if (currentUser?.uid) {
                                    await leaveSharedJournal(journalId, currentUser.uid);
                                    navigation.goBack();
                                }
                            }}
                        ]);
                    }}
                    style={[styles.leaveBtn, { borderColor: '#EF4444' + '40', backgroundColor: '#EF4444' + '10' }]}
                >
                    <LogOut size={18} color="#EF4444" />
                    <Text style={styles.leaveText}>Leave Journal</Text>
                </PremiumPressable>
            )}
        </View>

</SafeAreaView>
    </LinearGradient>
  );
}
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
actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  actionText: { fontSize: 16, fontWeight: '600' },

  // Group Avatar Styles
  groupAvatar: { width: 100, height: 100, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  groupAvatarImage: { width: '100%', height: '100%', borderRadius: 30 },
  editBadge: { position: 'absolute', bottom: -6, right: -6, padding: 6, borderRadius: 20, borderWidth: 2, borderColor: 'white' },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Share, Image, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Users, Copy, LogOut, ChevronLeft, Download, Shield, Trash2, MoreVertical, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { JournalService } from '../services/journalService';
import { MediaService } from '../services/mediaService';
import { leaveSharedJournal, kickMember, updateMemberRole } from '../services/syncedJournalService';
import { exportSharedJournalPDF } from '../utils/exportHelper';
import { auth } from '../firebaseConfig';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'JournalDetails'>;

export default function JournalDetailsScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
  const palette = useSharedPalette();
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  // Get store actions and data
  const { journals, removeJournal, sharedEntries, updateJournalMeta, leaveJournal } = useJournalStore();
  
  // 1. Safety Check: Get journal or fallback
  const journal = journals[journalId];

  // 2. Logic: Permissions
  const currentUserId = auth.currentUser?.uid;
  const userRole = journal?.roles?.[currentUserId || ''] || 'member';
  
  // Admin Privileges: Owner OR Admin
  const isAdmin = journal?.owner === currentUserId || userRole === 'admin' || userRole === 'owner';
  const isOwner = journal?.owner === currentUserId;

  // Logic: Export PDF
  const handleExport = async () => {
    const entries = sharedEntries[journalId] || [];
    if (entries.length === 0) {
      Alert.alert("No Data", "There are no entries to export yet.");
      return;
    }
    await exportSharedJournalPDF(journal?.name || "Journal", entries);
  };

const handleMemberPress = (memberId: string, memberName: string) => {
    if (!isAdmin || memberId === currentUserId) return;

Alert.alert(
      "Manage Member",
      `Manage ${memberName}`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove from Group", 
          style: "destructive",
          onPress: async () => {
             try {
               await kickMember(journalId, memberId);
             } catch (e) {
               Alert.alert("Error", "Failed to remove user.");
             }
          }
        },
        { 
          text: "Make Admin", 
          onPress: async () => {
             try {
               await updateMemberRole(journalId, memberId, 'admin');
             } catch (e) {
               Alert.alert("Error", "Failed to promote user.");
             }
          }
        },
        { 
            text: "Demote to Member", 
            onPress: async () => {
               try {
                 await updateMemberRole(journalId, memberId, 'member');
               } catch (e) {
                 Alert.alert("Error", "Failed to demote user.");
               }
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
             try {
               await JournalService.deleteJournal(journalId);
               removeJournal(journalId);
               navigation.reset({
                 index: 0,
                 routes: [{ name: 'MainTabs' }],
               });
             } catch (e) {
               Alert.alert("Error", "Failed to delete group.");
             }
          }
        }
      ]
    );
  };

  // Logic: Share Deep Link
  const handleShareLink = async () => {
    const link = `mindfulminute://join/${journal?.id}`;
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
            if (currentUserId) {
                await leaveSharedJournal(journalId, currentUserId);
                leaveJournal(); // Clear active
                removeJournal(journalId); // Remove from list
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
            }
          }
        }
      ]
    );
  };

  const handleUpdatePhoto = async () => {
    // Permission: Admins can update photo
    if (!isAdmin) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
             // 4. Update Store with fresh data
             updateJournalMeta(journalId, updatedJournal);
             // Silent success (UI updates automatically)
           }
        }
      }
    } catch (e) {
      console.error("Photo Update Error:", e);
      Alert.alert("Error", "Failed to update photo.");
    }
  };

  // 3. Render Fallback if loading failed
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

        <ScrollView style={styles.content}>
            
            {/* GROUP PHOTO */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View>
                {/* View Image Action */}
                <TouchableOpacity 
                  onPress={() => journal.photoUrl && setShowFullScreen(true)} 
                  activeOpacity={0.9}
                  disabled={!journal.photoUrl}
                >
                  <View style={[styles.groupAvatar, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    {journal.photoUrl ? (
                      <Image source={{ uri: journal.photoUrl }} style={styles.groupAvatarImage} />
                    ) : (
                      <Users size={40} color={palette.subtleText} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Edit Image Action (Admins Only) */}
                {isAdmin && (
                  <TouchableOpacity 
                    onPress={handleUpdatePhoto}
                    style={[styles.editBadge, { backgroundColor: palette.accent }]}
                  >
                    <Camera size={12} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* INFO CARD */}
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <Text style={[styles.label, { color: palette.subtleText }]}>JOURNAL NAME</Text>
                <Text style={[styles.value, { color: palette.text }]}>{journal.name}</Text>
                
                <View style={[styles.divider, { backgroundColor: palette.border }]} />
                
                {/* Invite Link */}
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
                MEMBERS ({journal.memberIds?.length || 0})
            </Text>
            
<FlatList
                data={journal.memberIds || []}
                keyExtractor={(item) => item}
                scrollEnabled={false}
                renderItem={({ item, index }) => {
                  const role = journal.roles?.[item] || 'member';
                  const isMe = item === currentUserId;
                  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
                  
                  // Match ID to Name using the index (assuming arrays are synced)
                  const rawName = journal.members?.[index] || "Unknown User";
                  const displayName = isMe ? "You" : rawName;

                  return (
                    <PremiumPressable 
                      onPress={() => handleMemberPress(item, rawName)}
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
                      
                      {isAdmin && !isMe && (
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
            
            {/* 1. Leave Group (Visible to EVERYONE) */}
            <PremiumPressable 
                onPress={handleLeave}
                style={[styles.leaveBtn, { borderColor: palette.border, backgroundColor: 'transparent', marginBottom: 12 }]}
            >
                <LogOut size={18} color={palette.text} />
                <Text style={[styles.leaveText, { color: palette.text }]}>Leave Journal</Text>
            </PremiumPressable>

            {/* 2. Delete Group (Admin/Owner Only) */}
            {isAdmin && (
                <PremiumPressable 
                    onPress={handleDeleteGroup}
                    style={[styles.leaveBtn, { borderColor: '#EF4444' + '40', backgroundColor: '#EF4444' + '10' }]}
                >
                    <Trash2 size={18} color="#EF4444" />
                    <Text style={styles.leaveText}>Delete Group</Text>
                </PremiumPressable>
            )}
            
            <View style={{ height: 40 }} />
        </ScrollView>

        {/* Full Screen Image Modal */}
        <Modal visible={showFullScreen} transparent={true} animationType="fade" onRequestClose={() => setShowFullScreen(false)}>
          <View style={styles.fullScreenContainer}>
            <Pressable style={styles.closeBtn} onPress={() => setShowFullScreen(false)}>
              <X color="white" size={30} />
            </Pressable>
            {journal.photoUrl && (
              <Image 
                source={{ uri: journal.photoUrl }} 
                style={styles.fullScreenImage} 
                resizeMode="contain" 
              />
            )}
          </View>
        </Modal>

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
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  actionText: { fontSize: 16, fontWeight: '600' },
  
  // Group Avatar Styles
  groupAvatar: { width: 100, height: 100, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  groupAvatarImage: { width: '100%', height: '100%', borderRadius: 30 },
  editBadge: { position: 'absolute', bottom: 0, right: -6, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white', zIndex: 10 },

  // Full Screen Modal
  fullScreenContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 20 },
});
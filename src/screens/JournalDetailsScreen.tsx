import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Share, Image, TouchableOpacity, Modal, Pressable, ScrollView, TextInput, Platform, Keyboard, Animated, KeyboardAvoidingView } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Users, Copy, LogOut, ChevronLeft, Download, Shield, Trash2, MoreVertical, Camera, X, Pencil, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { JournalService } from '../services/journalService';
import { MediaService } from '../services/mediaService';
import { useUIStore } from '../stores/uiStore';
import { leaveSharedJournal, kickMember, updateMemberRole, updateJournalName } from '../services/syncedJournalService';
import { exportSharedJournalPDF } from '../utils/exportHelper';
import { auth, db } from '../firebaseConfig';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'JournalDetails'>;

export default function JournalDetailsScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
const { showAlert } = useUIStore();
  const palette = useSharedPalette();
  const [previewImage, setPreviewImage] = useState<string | null>(null);



  // Restore Missing State: Journal Name Editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Member Nickname Editing
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [tempNickname, setTempNickname] = useState('');
  
  // Get store actions and data
  const { journals, removeJournal, sharedEntries, updateJournalMeta, leaveJournal } = useJournalStore();
  
  // 1. Safety Check: Get journal or fallback
  const journal = journals[journalId];

// 2. Logic: Permissions
  const currentUserId = auth.currentUser?.uid;
  const rawRole = journal?.roles?.[currentUserId || ''];
  
  // Admin Privileges: Admin/Owner role OR Creator (unless explicitly demoted)
  const isAdmin = rawRole === 'admin' || rawRole === 'owner' || (journal?.owner === currentUserId && rawRole !== 'member');
  const isOwner = journal?.owner === currentUserId;

  // Logic: Listen for pending reports (Badge)
  const [reportCount, setReportCount] = useState(0);
  useEffect(() => {
    if (!isAdmin || !journalId) return;
    const q = query(
      collection(db, "journals", journalId, "reports"), 
      where("status", "==", "pending")
    );
    // Listen for real-time updates
    return onSnapshot(q, snap => setReportCount(snap.size));
  }, [journalId, isAdmin]);

  // Logic: Export PDF
  const handleExport = async () => {
    const entries = sharedEntries[journalId] || [];
    if (entries.length === 0) {
      showAlert("No Data", "There are no entries to export yet.");
      return;
    }
    await exportSharedJournalPDF(journal?.name || "Journal", entries);
  };

const handleMemberPress = (memberId: string, memberName: string) => {
    // Allow clicking anyone EXCEPT yourself
    if (memberId === currentUserId) return;

    // 1. Determine Role of the target user
    let memberRole = journal.roles?.[memberId] || 'member';
    if (memberId === journal.owner || memberRole === 'owner') {
        memberRole = 'admin';
    }
    
    // 2. Build Actions (Available to Everyone)
    const actions: any[] = [
        { text: "Cancel", style: "cancel" },
        {
          text: "Set Nickname", 
          onPress: () => {
             setTempNickname(memberName);
             setEditingMember(memberId);
          }
        }
    ];

    // 3. Add Admin-Only Actions
    if (isAdmin) {
        actions.push({ 
          text: "Remove from Group", 
          style: "destructive",
          onPress: async () => {
             try {
               await kickMember(journalId, memberId);
             } catch (e) {
               showAlert("Error", "Failed to remove user.");
             }
          }
        });

        if (memberRole === 'member') {
            actions.push({ 
              text: "Make Admin", 
              onPress: () => {
                showAlert("Confirm Admin", "Make this user an Admin?", [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Confirm", 
                    onPress: async () => {
                       await updateMemberRole(journalId, memberId, 'admin');
                    }
                  }
                ]);
              }
            });
        } else if (memberRole === 'admin') {
            actions.push({ 
                text: "Demote to Member", 
                onPress: () => {
                   showAlert("Confirm Demotion", "Demote to Member?", [
                     { text: "Cancel", style: "cancel" },
                     { 
                       text: "Confirm", 
                       style: "destructive",
                       onPress: async () => {
                          await updateMemberRole(journalId, memberId, 'member');
                       }
                     }
                   ]);
                }
            });
        }
    }

    showAlert("Manage Member", `Options for ${memberName}`, actions);
  };

  const handleDeleteGroup = () => {
    showAlert(
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
               showAlert("Error", "Failed to delete group.");
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
        message: `Join my shared journal on Micro Muse! Tap here:\n${link}`,
      });
    } catch (error) {
      showAlert("Error", "Could not share link.");
    }
  };
  
const handleCopyCode = async () => {
    if (!journalId) return;
    try {
      console.log("Copying Journal ID:", journalId); // Debug check
      await Clipboard.setStringAsync(journalId);
      showAlert("Copied", "Journal code copied to clipboard.");
    } catch (e) {
      console.error("Clipboard Error:", e);
      showAlert("Error", "Failed to copy code.");
    }
  };

  const handleLeave = () => {
    showAlert(
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
                // leaveJournal(); <--- REMOVED: This was logging you out!
                removeJournal(journalId); 
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
      showAlert("Error", "Failed to update photo.");
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

<KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
        <ScrollView 
          style={styles.content} 
          // 1. Ensure we have enough base padding
          contentContainerStyle={{ paddingBottom: 100 }} 
          keyboardShouldPersistTaps="handled"
          // 2. This is the magic prop for Android Edge-to-Edge
          automaticallyAdjustKeyboardInsets={true}
        >
            
            {/* GROUP PHOTO */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View>
{/* View Image Action */}
                <TouchableOpacity 
                  onPress={() => journal.photoUrl && setPreviewImage(journal.photoUrl)} 
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
                
                {isEditingName ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <TextInput 
                      value={tempName}
                      onChangeText={setTempName}
                      style={{ 
                        flex: 1, 
                        fontSize: 18, 
                        fontWeight: '600', 
                        color: palette.text,
                        borderBottomWidth: 1,
                        borderBottomColor: palette.accent,
                        paddingVertical: 4
                      }}
                      autoFocus
                    />
                    <TouchableOpacity onPress={async () => {
                        if (tempName.trim()) {
                           await updateJournalName(journalId, tempName.trim());
                           setIsEditingName(false);
                        }
                    }}>
                       <Check size={20} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsEditingName(false)}>
                       <X size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
                    <Text style={[styles.value, { color: palette.text }]}>{journal.name}</Text>
                    {isAdmin && (
                      <TouchableOpacity 
                        style={{ padding: 8 }}
                        onPress={() => {
                          setTempName(journal.name);
                          setIsEditingName(true);
                        }}
                      >
                        <Pencil size={16} color={palette.subtleText} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                <View style={[styles.divider, { backgroundColor: palette.border }]} />
                
{/* Invite Link */}
                <Text style={[styles.label, { color: palette.subtleText }]}>INVITE LINK</Text>
                <PremiumPressable onPress={handleShareLink} style={styles.codeRow}>
                    <Text style={[styles.code, { color: palette.accent, textDecorationLine: 'underline' }]}>Share Invite Link</Text>
                    <Copy size={16} color={palette.accent} />
                </PremiumPressable>

                <View style={[styles.divider, { backgroundColor: palette.border }]} />

{/* Journal Code */}
                <Text style={[styles.label, { color: palette.subtleText }]}>JOURNAL CODE</Text>
                <PremiumPressable 
                  onPress={handleCopyCode} 
                  style={[
                    styles.codeRow, 
                    { 
                      justifyContent: 'space-between', 
                      width: '100%', 
                      paddingVertical: 14, // Extra height for easier tapping on Android
                      paddingHorizontal: 4 
                    }
                  ]}
                >
                    <Text 
                      style={[styles.value, { color: palette.text, fontSize: 14, flex: 1 }]}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {journal.id}
                    </Text>
                    <Copy size={16} color={palette.accent} />
                </PremiumPressable>
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
                  // Priority: 1. Check explicit Role Map
                  //           2. If no role map entry, but is Creator -> 'admin'
                  //           3. Default -> 'member'
                  let role = journal.roles?.[item];
                  
                  if (!role && item === journal.owner) {
                      role = 'admin'; // Legacy fallback
                  }
                  
                  if (!role) {
                      role = 'member';
                  }

                  // Force "owner" string to "admin" just in case it slipped through
                  if (role === 'owner') role = 'admin';

                  const isMe = item === currentUserId;
                  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
                  
                  // Priority: 1. Local Nickname 2. Saved Name 3. Legacy Array 4. Fallback
                  const nickname = journal.nicknames?.[item];
                  const storedName = journal.membersMap?.[item];
                  const legacyName = journal.members?.[index];
                  
                  // The name everyone sees
                  const publicName = storedName || (legacyName !== item ? legacyName : null) || `User...${item.slice(-4)}`;
                  // The name ONLY YOU see
                  const displayName = nickname || publicName; 
                  
                  const userPhoto = journal.memberPhotos?.[item];
                  const isEditingThisUser = editingMember === item;

                  return (
                    <PremiumPressable 
                      onPress={() => handleMemberPress(item, displayName)}
                      style={[styles.memberRow, { borderColor: palette.border, marginBottom: 8, justifyContent: 'space-between' }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        {/* Avatar: Photo (Clickable) OR Icon */}
                        {userPhoto ? (
                             <TouchableOpacity onPress={() => setPreviewImage(userPhoto)}>
                               <Image 
                                 source={{ uri: userPhoto }} 
                                 style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: palette.border }} 
                               />
                             </TouchableOpacity>
                        ) : (
                             <View style={[styles.avatar, { backgroundColor: role === 'owner' ? '#F59E0B' : palette.accent }]}>
                                {role === 'owner' ? <Shield size={16} color="white" /> : <Users size={16} color="white" />}
                             </View>
                        )}

                        <View style={{ flex: 1 }}>
                          {isEditingThisUser ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TextInput 
                                  value={tempNickname}
                                  onChangeText={setTempNickname}
                                  style={{ 
                                    flex: 1, 
                                    borderBottomWidth: 1, 
                                    borderBottomColor: palette.accent,
                                    fontSize: 16,
                                    color: palette.text,
                                    padding: 0
                                  }}
                                  autoFocus
                                />
                                <TouchableOpacity onPress={() => {
                                    useJournalStore.getState().setMemberNickname(journalId, item, tempNickname);
                                    setEditingMember(null);
                                }}>
                                   <Check size={18} color="#10B981" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setEditingMember(null)}>
                                   <X size={18} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                          ) : (
                              <Text style={[styles.memberName, { color: palette.text }]}>
                                {isMe ? 'You' : displayName}
                              </Text>
                          )}
                          <Text style={{ fontSize: 12, color: palette.subtleText }}>
                            {displayRole} {nickname ? `• (${publicName})` : ''}
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

{/* Admin Only: Moderation Queue */}
            {isAdmin && (
                <PremiumPressable 
                    onPress={() => navigation.navigate('GroupReports', { journalId })}
                    style={[styles.actionRow, { backgroundColor: palette.card, borderColor: palette.border, marginBottom: 12 }]}
                >
                    <Shield size={20} color="#F59E0B" />
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.actionText, { color: palette.text }]}>Moderation Queue</Text>
                          {reportCount > 0 && (
                            <View style={{ backgroundColor: '#EF4444', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                              <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>{reportCount}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 10, color: palette.subtleText }}>
                           {reportCount > 0 ? `${reportCount} pending review` : "Review reported content"}
                        </Text>
                    </View>
                </PremiumPressable>
            )}

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
            
</ScrollView>
        </KeyboardAvoidingView>

{/* Full Screen Image Modal */}
        <Modal visible={!!previewImage} transparent={true} animationType="fade" onRequestClose={() => setPreviewImage(null)}>
          <View style={styles.fullScreenContainer}>
            <Pressable style={styles.closeBtn} onPress={() => setPreviewImage(null)}>
              <X color="white" size={30} />
            </Pressable>
            {previewImage && (
              <Image 
                source={{ uri: previewImage }} 
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
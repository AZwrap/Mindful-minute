import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TextInput, KeyboardAvoidingView, Platform, Pressable, Keyboard, Modal, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler'; // <--- Added
import { Trash2, Edit2, ChevronLeft, Send, Heart, Flame, ThumbsUp, MessageCircle, Smile } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { auth } from '../firebaseConfig';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedEntryDetail'>;

import { JournalService } from '../services/journalService'; // Ensure this is imported

const QUICK_REACTIONS = [
  // Hearts & Love
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
  
  // Faces (Positive)
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", 
  "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳",
  
  // Faces (Neutral/Negative)
  "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", 
  "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", 
  "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", 
  "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "☠️", "👽", "👾", "🤖",
  
  // Hands & Gestures
  "👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", 
  "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪",
  
  // Nature & Animals
  "💐", "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "☀️", "🌤", "☁️", "⛈", "🌈", "❄️", "🔥", "🌊", "✨", "🌟", 
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦",
  
  // Objects & Symbols
  "💯", "💢", "💥", "💫", "💦", "💨", "🕳", "💣", "💬", "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "🎵", "🎶", "🎼",
  "🏆", "🥇", "🥈", "🥉", "🏅", "🎖", "🎁", "🎈", "🎉", "🎊", "🕯", "💡", "💰", "💸", "💎", "🔮", "🧬", "💊"
];

export default function SharedEntryDetailScreen({ navigation, route }: Props) {
  const { entry: initialEntry } = route.params;
  const palette = useSharedPalette();
  const deleteSharedEntry = useJournalStore(s => s.deleteSharedEntry);
  
  // 1. Get LIVE entry from store (fallback to params if not found yet)
  const entry = useJournalStore(s => 
    s.sharedEntries[initialEntry.journalId]?.find(e => e.entryId === initialEntry.entryId)
  ) || initialEntry;

  const [commentText, setCommentText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

// Check ownership
  const currentUser = auth.currentUser;
  const isAuthor = currentUser?.uid && entry.userId === currentUser.uid;

// Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

  const handleReaction = async (type: string) => {
    if (!currentUser || !entry.journalId) return;
    // Optimistic UI could be handled here, but the store subscription is usually fast enough
    await JournalService.toggleReaction(entry.journalId, entry.entryId, currentUser.uid, type);
  };

  const handleDeleteComment = (comment: any) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to remove this comment?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
             if (!entry.journalId || !entry.entryId) return;
             try {
               await JournalService.deleteComment(entry.journalId, entry.entryId, comment);
             } catch (e) {
               console.error("Failed to delete comment:", e);
               Alert.alert("Error", "Could not delete comment.");
             }
          }
        }
      ]
    );
  };

  const renderRightActions = (progress: any, dragX: any, comment: any) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <Pressable
        style={styles.deleteAction}
        onPress={() => handleDeleteComment(comment)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash2 size={20} color="white" />
        </Animated.View>
      </Pressable>
    );
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !currentUser || !entry.journalId) return;
    
    setIsSubmitting(true);
    try {
      await JournalService.addComment(entry.journalId, entry.entryId, {
        text: commentText.trim(),
        userId: currentUser.uid,
        authorName: currentUser.displayName || 'Member'
      });
      setCommentText('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              // Ensure we have the Journal ID. 
              // Fallback to store's current ID if missing on entry object
              const journalId = entry.journalId || useJournalStore.getState().currentJournalId;
              
              if (journalId && entry.entryId) {
                await deleteSharedEntry(journalId, entry.entryId);
                navigation.goBack();
              } else {
                Alert.alert("Error", "Could not identify journal.");
              }
            } catch (e) {
              Alert.alert("Error", "Could not delete entry.");
            }
          }
        }
      ]
    );
  };

  // Handle various date formats safely
  const dateStr = React.useMemo(() => {
    if (!entry.createdAt) return 'Unknown Date';
    // Handle Firestore Timestamp
    if (typeof entry.createdAt?.toDate === 'function') {
      return entry.createdAt.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }
    // Handle Number/String
    return new Date(entry.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }, [entry.createdAt]);

return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
{/* 1. KeyboardAvoidingView is now the OUTER wrapper */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        // FIX: Use 'padding' for iOS. Use undefined for Android to let the OS handle resizing natively.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        // FIX: Increased offset for iOS header/notch
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        {/* 2. SafeAreaView is now INSIDE */}
        <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
        
        {/* HEADER */}
        <View style={styles.header}>
           <PremiumPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
             <ChevronLeft size={24} color={palette.text} />
             <Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>Back</Text>
           </PremiumPressable>

           {/* ACTIONS (Author Only) */}
           {isAuthor && (
             <View style={{ flexDirection: 'row', gap: 12 }}>
               <PremiumPressable 
                 onPress={() => navigation.navigate('SharedWrite', { journalId: entry.journalId || 'default', entry })}
                 style={styles.actionBtn}
               >
                 <Edit2 size={20} color={palette.text} />
               </PremiumPressable>
               
               <PremiumPressable onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                 <Trash2 size={20} color="#EF4444" />
               </PremiumPressable>
             </View>
           )}
        </View>
        
<ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
           <Text style={[styles.date, { color: palette.subtleText }]}>
             {dateStr}
           </Text>
           <Text style={[styles.author, { color: palette.accent }]}>
             Written by {entry.authorName || 'Anonymous'}
           </Text>

           {entry.imageUri && (
             <Image 
               source={{ uri: entry.imageUri }} 
               style={styles.image} 
               resizeMode="cover" 
             />
           )}

<Text style={[styles.text, { color: palette.text }]}>
             {entry.text}
           </Text>
           
{/* --- REACTIONS --- */}
           <View style={[styles.reactionRow, { borderColor: palette.border }]}>
             
             {/* 1. Dynamic List of Existing Reactions */}
             {Object.entries(entry.reactions || {}).map(([emoji, userList]: any) => {
                const count = userList?.length || 0;
                if (count === 0) return null;
                const hasReacted = currentUser && userList.includes(currentUser.uid);
                
                return (
                 <Pressable 
                   key={emoji} 
                   onPress={() => handleReaction(emoji)}
                   style={[
                     styles.reactionPill, 
                     { 
                       backgroundColor: hasReacted ? palette.accent + '20' : 'transparent',
                       borderColor: hasReacted ? palette.accent : palette.border
                     }
                   ]}
                 >
                   <Text style={{ fontSize: 16 }}>{emoji}</Text>
                   <Text style={[styles.reactionCount, { color: palette.sub }]}>{count}</Text>
                 </Pressable>
                );
             })}

{/* 2. Add Emoji Button */}
             <Pressable 
               onPress={() => setShowEmojiPicker(true)}
               style={[
                 styles.reactionPill, 
                 { borderColor: palette.border, borderStyle: 'dashed', paddingHorizontal: 10 }
               ]}
             >
               <Smile size={18} color={palette.sub} />
               <Text style={{ fontSize: 14, color: palette.sub, fontWeight: '600' }}>+</Text>
             </Pressable>
           </View>

           {/* --- CUSTOM EMOJI PICKER MODAL --- */}
           <Modal
             visible={showEmojiPicker}
             transparent={true}
             animationType="fade"
             onRequestClose={() => setShowEmojiPicker(false)}
           >
             <Pressable 
               style={styles.modalOverlay} 
               onPress={() => setShowEmojiPicker(false)}
             >
              <View style={[styles.emojiPickerCard, { backgroundColor: palette.card, borderColor: palette.border, maxHeight: '70%' }]}>
                 <Text style={[styles.pickerTitle, { color: palette.sub }]}>Quick Reactions</Text>
                 <ScrollView 
                   showsVerticalScrollIndicator={false}
                   contentContainerStyle={styles.emojiGrid}
                 >
                {QUICK_REACTIONS.map(emoji => (
                     <Pressable
                       key={emoji}
                       onPress={() => {
                         // Only add if not already present (don't toggle off from picker)
                         const hasReacted = currentUser && entry.reactions?.[emoji]?.includes(currentUser.uid);
                         if (!hasReacted) {
                            handleReaction(emoji);
                         }
                         setShowEmojiPicker(false);
                       }}
                       style={styles.emojiCell}
                     >
                       <Text style={{ fontSize: 28 }}>{emoji}</Text>
                     </Pressable>
                   ))}
                 </ScrollView>
               </View>
             </Pressable>
           </Modal>

           {/* --- COMMENTS SECTION --- */}
           <View style={styles.commentsSection}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <MessageCircle size={16} color={palette.sub} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: palette.sub, textTransform: 'uppercase' }}>
                  Comments ({entry.comments?.length || 0})
                </Text>
             </View>

{/* List */}
             {entry.comments?.map((c: any) => {
               const isCommentAuthor = currentUser && c.userId === currentUser.uid;
               
               return (
                 <Swipeable
                   key={c.id}
                   renderRightActions={(p, d) => isCommentAuthor ? renderRightActions(p, d, c) : null}
                   containerStyle={{ marginBottom: 8 }} // Move margin here so swipe handles it correctly
                 >
                    <View style={[styles.commentItem, { backgroundColor: palette.card, borderColor: palette.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: palette.accent }}>{c.authorName}</Text>
                          <Text style={{ fontSize: 10, color: palette.sub }}>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: palette.text, marginTop: 4, fontSize: 14 }}>{c.text}</Text>
                    </View>
                 </Swipeable>
               );
             })}
             
             {(!entry.comments || entry.comments.length === 0) && (
               <Text style={{ color: palette.sub, fontStyle: 'italic', fontSize: 13, marginBottom: 10 }}>
                 No comments yet. Be the first!
               </Text>
             )}
           </View>

           <View style={{ height: 100 }} /> 
        </ScrollView>

{/* INPUT BAR */}
          <View style={[styles.inputContainer, { backgroundColor: palette.card, borderTopColor: palette.border }]}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              placeholderTextColor={palette.sub}
              style={[styles.input, { color: palette.text, backgroundColor: palette.bg }]}
              multiline
            />
            <Pressable 
              onPress={handlePostComment} 
              disabled={!commentText.trim() || isSubmitting}
              style={[styles.sendBtn, { backgroundColor: commentText.trim() ? palette.accent : palette.border }]}
            >
              <Send size={18} color="white" />
            </Pressable>
          </View>

</SafeAreaView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    padding: 4 
  },
  actionBtn: { 
    padding: 8, 
    backgroundColor: 'rgba(0,0,0,0.05)', 
    borderRadius: 8 
  },
  content: { padding: 24 },
  date: { fontSize: 14, marginBottom: 4 },
  author: { fontSize: 16, fontWeight: '700', marginBottom: 24 },
text: { fontSize: 18, lineHeight: 28 },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 24,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 24,
  },
commentItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    // marginBottom: 8, // <--- REMOVED (Moved to Swipeable containerStyle)
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12, // Match commentItem radius
    marginLeft: 8,    // Gap between content and delete button
  },
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emojiPickerCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  pickerTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 1,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  emojiCell: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
});
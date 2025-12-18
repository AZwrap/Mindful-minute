import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, KeyboardAvoidingView, Platform, Pressable, Keyboard, Modal, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler'; 
import { Trash2, Edit2, ChevronLeft, Send, Heart, Flame, ThumbsUp, MessageCircle, Smile, Flag } from 'lucide-react-native'; // <--- Added Flag
import { LinearGradient } from 'expo-linear-gradient';
import { reportContent } from '../services/syncedJournalService'; // <--- Added Service
import { useUIStore } from '../stores/uiStore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

// Helper component to detect swipe start for immediate closure of other rows
const SwipeMonitor = ({ dragX, onSwipeStart }: any) => {
  React.useEffect(() => {
    if (!dragX) return;
    const id = dragX.addListener(({ value }: any) => {
      // Detect left swipe start (value becomes negative)
      // Trigger as soon as it moves 5 pixels
      if (value < -5) { 
        onSwipeStart();
      }
    });
    return () => dragX.removeListener(id);
  }, [dragX, onSwipeStart]);
  return null;
};

// Sub-component for exclusive swipe management
const CommentItem = ({ comment, currentUser, onDelete, onReport, onRowOpen, palette, onLongPress, onReactionTap }: any) => {
  const swipeableRef = React.useRef<Swipeable>(null);
  const isCommentAuthor = currentUser && comment.userId === currentUser.uid;

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    if (isCommentAuthor) {
      return (
        <Pressable style={styles.deleteAction} onPress={() => onDelete(comment)}>
          <SwipeMonitor dragX={dragX} onSwipeStart={() => onRowOpen(swipeableRef.current)} />
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <Trash2 size={24} color="white" />
            <Text style={styles.actionText}>Delete</Text>
          </Animated.View>
        </Pressable>
      );
    } else {
      return (
        <Pressable style={[styles.deleteAction, { backgroundColor: '#F59E0B' }]} onPress={() => onReport(comment)}>
          <SwipeMonitor dragX={dragX} onSwipeStart={() => onRowOpen(swipeableRef.current)} />
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
            <Flag size={24} color="white" />
            <Text style={styles.actionText}>Report</Text>
          </Animated.View>
        </Pressable>
      );
    }
  };

  const content = (
    <Pressable
      delayLongPress={300}
      onLongPress={() => onLongPress(comment)}
      style={({ pressed }) => [
        styles.commentItem, 
        { 
          backgroundColor: pressed ? palette.card + 'D0' : palette.card, 
          borderColor: palette.border,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }
      ]}
      onTouchStart={() => onRowOpen(swipeableRef.current)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: palette.accent }}>{comment.authorName}</Text>
          <Text style={{ fontSize: 10, color: palette.sub }}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Text style={{ color: palette.text, marginTop: 4, fontSize: 14 }}>{comment.text}</Text>
      
      {/* Comment Reactions */}
      {comment.reactions && Object.keys(comment.reactions).length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {Object.entries(comment.reactions).map(([emoji, userList]: any) => {
             const count = userList?.length || 0;
             if (count === 0) return null;
             const hasReacted = currentUser && userList.includes(currentUser.uid);
             return (
               <Pressable 
                 key={emoji}
                 onPress={() => onReactionTap(comment, emoji)}
                 style={{
                   flexDirection: 'row', alignItems: 'center', gap: 4,
                   backgroundColor: hasReacted ? palette.accent + '15' : 'rgba(0,0,0,0.03)',
                   paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12,
                   borderWidth: 1, borderColor: hasReacted ? palette.accent + '40' : 'transparent'
                 }}
               >
                 <Text style={{ fontSize: 12 }}>{emoji}</Text>
                 <Text style={{ fontSize: 10, fontWeight: '600', color: palette.sub }}>{count}</Text>
               </Pressable>
             )
          })}
        </View>
      )}
    </Pressable>
  );

// Removed the check so everyone can swipe (Delete vs Report)
  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      onSwipeableWillOpen={() => onRowOpen(swipeableRef.current)}
      renderRightActions={renderRightActions}
      containerStyle={{ marginBottom: 8 }}
    >
      {content}
    </Swipeable>
  );
};

export default function SharedEntryDetailScreen({ navigation, route }: Props) {
  // --- MANUAL KEYBOARD HANDLING (Android Fix) ---
  const { showAlert } = useUIStore();
  const bottomPadding = React.useRef(new Animated.Value(0)).current;

  // Track which comment we are reacting to (null = reacting to the main entry)
  const [activeComment, setActiveComment] = React.useState<any>(null);
  
  React.useEffect(() => {
    if (Platform.OS === 'ios') return; // iOS works fine with KeyboardAvoidingView

const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      // Animate to keyboard height explicitly (add buffer to prevent overlap)
      Animated.timing(bottomPadding, {
        toValue: e.endCoordinates.height + 15, 
        duration: 150,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      // Force reset to 0 when keyboard hides
      Animated.timing(bottomPadding, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  // ----------------------------------------------

const { entry: initialEntry } = route.params;
  const palette = useSharedPalette();
  const { deleteSharedEntry, toggleCommentReaction } = useJournalStore();

  // Exclusive Swipe Logic
  const openSwipeableRef = React.useRef<Swipeable | null>(null);
  const onRowOpen = (ref: any) => {
    if (openSwipeableRef.current && openSwipeableRef.current !== ref) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = ref;
  };
  
  // 1. Get LIVE entry from store (fallback to params if not found yet)
  const entry = useJournalStore(s => 
    s.sharedEntries[initialEntry.journalId]?.find(e => e.entryId === initialEntry.entryId)
  ) || initialEntry;

  const [commentText, setCommentText] = React.useState('');
  const insets = useSafeAreaInsets();
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

const handleDeleteComment = async (comment: any) => {
    if (!entry.journalId || !entry.entryId) return;
    try {
      await JournalService.deleteComment(entry.journalId, entry.entryId, comment);
    } catch (e) {
      console.error("Failed to delete comment:", e);
      showAlert("Error", "Could not delete comment.");
    }
  };


const handlePostComment = async () => {
    const textToSend = commentText.trim();
    if (!textToSend || !currentUser || !entry.journalId) return;
    
    // Optimistic clear: Remove text immediately
    setCommentText('');
    setIsSubmitting(true);
    
    try {
      await JournalService.addComment(entry.journalId, entry.entryId, {
        text: textToSend,
        userId: currentUser.uid,
        authorName: currentUser.displayName || 'Member'
      });
    } catch (e) {
      console.error(e);
      setCommentText(textToSend); // Restore text if it fails
      showAlert("Error", "Could not post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportEntry = () => {
     showAlert("Report Entry", "Why are you reporting this content?", [
       { text: "Cancel", style: "cancel" },
       { text: "It's spam", onPress: () => submitReport('entry', entry.entryId, 'spam', entry.userId, entry.text) },
       { text: "It's abusive", onPress: () => submitReport('entry', entry.entryId, 'abusive', entry.userId, entry.text) }
     ]);
  };

  const handleReportComment = (comment: any) => {
     showAlert("Report Comment", "Flag this comment as inappropriate?", [
       { text: "Cancel", style: "cancel" },
       { text: "Report", style: "destructive", onPress: () => submitReport('comment', comment.id, 'inappropriate', comment.userId, comment.text) }
     ]);
  };

  const submitReport = async (type: 'entry'|'comment', id: string, reason: string, authorId: string, snippet: string) => {
      try {
        await reportContent(
          entry.journalId || '', 
          entry.entryId, 
          type, 
          id, 
          reason, 
          currentUser?.uid || 'anon',
          authorId,
          snippet.substring(0, 100)
        );
        showAlert("Thank You", "We have received your report and will review it shortly.");
      } catch (e) {
        showAlert("Error", "Could not submit report.");
      }
  };

  const handleDelete = () => {
    showAlert(
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
                showAlert("Error", "Could not identify journal.");
              }
            } catch (e) {
              showAlert("Error", "Could not delete entry.");
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
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        
        {/* HEADER */}
        <View style={styles.header}>
           <PremiumPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
             <ChevronLeft size={24} color={palette.text} />
             <Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>Back</Text>
           </PremiumPressable>

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

           {!isAuthor && (
              <PremiumPressable onPress={handleReportEntry} style={[styles.actionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                 <Flag size={20} color="#F59E0B" />
               </PremiumPressable>
           )}
        </View>
        
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={styles.content}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
           <Text style={[styles.date, { color: palette.subtleText }]}>{dateStr}</Text>
           <Text style={[styles.author, { color: palette.accent }]}>Written by {entry.authorName || 'Anonymous'}</Text>

           {entry.imageUri && (
             <Image source={{ uri: entry.imageUri }} style={styles.image} resizeMode="cover" />
           )}

           <Text style={[styles.text, { color: palette.text }]}>{entry.text}</Text>
           
           {/* REACTIONS */}
           <View style={[styles.reactionRow, { borderColor: palette.border }]}>
             {Object.entries(entry.reactions || {}).map(([emoji, userList]: any) => {
                const count = userList?.length || 0;
                if (count === 0) return null;
                const hasReacted = currentUser && userList.includes(currentUser.uid);
                return (
                 <Pressable 
                   key={emoji} 
                   onPress={() => handleReaction(emoji)}
                   style={[styles.reactionPill, { backgroundColor: hasReacted ? palette.accent + '20' : 'transparent', borderColor: hasReacted ? palette.accent : palette.border }]}
                 >
                   <Text style={{ fontSize: 16 }}>{emoji}</Text>
                   <Text style={[styles.reactionCount, { color: palette.sub }]}>{count}</Text>
                 </Pressable>
                );
             })}
             <Pressable onPress={() => setShowEmojiPicker(true)} style={[styles.reactionPill, { borderColor: palette.border, borderStyle: 'dashed', paddingHorizontal: 10 }]}>
               <Smile size={18} color={palette.sub} />
               <Text style={{ fontSize: 14, color: palette.sub, fontWeight: '600' }}>+</Text>
             </Pressable>
           </View>

           {/* COMMENTS */}
           <View style={styles.commentsSection}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <MessageCircle size={16} color={palette.sub} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: palette.sub, textTransform: 'uppercase' }}>Comments ({entry.comments?.length || 0})</Text>
             </View>
{entry.comments?.map((c: any) => (
<CommentItem 
                   key={c.id} 
                   comment={c} 
                   currentUser={currentUser} 
                   onDelete={handleDeleteComment} 
                   onReport={handleReportComment} // <--- Added prop
                   onRowOpen={onRowOpen} 
                   palette={palette}
                   onLongPress={(comment: any) => {
                     setActiveComment(comment);
                     setShowEmojiPicker(true);
                   }}
onReactionTap={(comment: any, emoji: string) => {
                      toggleCommentReaction(
                        entry.journalId, 
                        entry.entryId, 
                        comment.id, 
                        currentUser?.uid || '', 
                        emoji
                      );
                   }}
                 />
               ))}
             {(!entry.comments || entry.comments.length === 0) && (
               <Text style={{ color: palette.sub, fontStyle: 'italic', fontSize: 13, marginBottom: 10 }}>No comments yet. Be the first!</Text>
             )}
           </View>
        </ScrollView>

        {/* INPUT BAR */}
        {/* iOS: Uses standard behavior. Android: Uses manual Animated padding. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          style={{ flexGrow: 0 }} // Ensure it doesn't fight for space
        >
          <Animated.View style={[
              styles.inputContainer, 
              { 
                backgroundColor: palette.card, 
                borderTopColor: palette.border,
                // iOS: Standard padding. Android: Animated Keyboard Height + Safe Area
                paddingBottom: Platform.OS === 'ios' 
                  ? 12 
                  : Animated.add(bottomPadding, Math.max(insets.bottom, 12))
              }
            ]}>
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
          </Animated.View>
        </KeyboardAvoidingView>

      </SafeAreaView>

{/* --- CUSTOM EMOJI PICKER MODAL --- */}
             <Modal
               visible={showEmojiPicker}
               transparent={true}
               animationType="fade"
               onRequestClose={() => {
                 setShowEmojiPicker(false);
                 setActiveComment(null); // Reset
               }}
             >
               <Pressable 
                 style={styles.modalOverlay} 
                 onPress={() => {
                    setShowEmojiPicker(false);
                    setActiveComment(null);
                 }}
               >
          <View style={[styles.emojiPickerCard, { backgroundColor: palette.card, borderColor: palette.border, maxHeight: '70%' }]}>
             <Text style={[styles.pickerTitle, { color: palette.sub }]}>Quick Reactions</Text>
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.emojiGrid}>
{QUICK_REACTIONS.map(emoji => (
                       <Pressable
                         key={emoji}
                         onPress={() => {
                           // 1. Capture target comment before clearing state
                           const targetComment = activeComment;
                           
                           // 2. Close UI Immediately (Optimistic)
                           setShowEmojiPicker(false);
                           setActiveComment(null);

                           // 3. Perform Network Request in Background
if (targetComment) {
                             // --- COMMENT REACTION (Optimistic) ---
                             toggleCommentReaction(
                               entry.journalId, 
                               entry.entryId, 
                               targetComment.id, 
                               currentUser?.uid || '', 
                               emoji
                             );
                           } else {
                             // --- ENTRY REACTION ---
                             const hasReacted = currentUser && entry.reactions?.[emoji]?.includes(currentUser.uid);
                             if (!hasReacted) {
                                handleReaction(emoji).catch(err => console.log("Entry reaction failed:", err));
                             }
                           }
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
    alignItems: 'flex-end',
    paddingRight: 24,
    width: 100,
    height: '100%',
    borderRadius: 12, 
    marginLeft: -16, // Pull behind the card
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
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
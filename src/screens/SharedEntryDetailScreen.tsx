import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, KeyboardAvoidingView, Platform, Pressable, Keyboard, Modal, Animated, InteractionManager, FlatList, SectionList } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2, Edit2, ChevronLeft, Send, Heart, Flame, ThumbsUp, MessageCircle, Smile, Flag, Users, X, Play, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { reportContent } from '../services/syncedJournalService'; // <--- Added Service
import { useUIStore } from '../stores/uiStore';
import { useSettings } from '../stores/settingsStore';
import { ShieldBan } from 'lucide-react-native'; // <--- Add Icon
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/types';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { auth } from '../firebaseConfig';
import PremiumPressable from '../components/PremiumPressable';
import { moderateContent } from '../lib/moderation';
import AudioPlayer from '../components/AudioPlayer';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedEntryDetail'>;

import { JournalService } from '../services/journalService'; // Ensure this is imported

const EMOJI_CATEGORIES = [
  { title: "Recently Used", data: [] }, 
  { title: "Smileys & Emotion", data: [
    "😂", "😊", "🥰", "😍", "🤩", "🥳", "😇", "🙂", "🙃", "😉", "😌", "😏", "🤔", "🧐", "🤨", "😎", "🤓", "🫠", "😋", "😛", "😜", "🤪", "🥺", "😢", "😭", "😤", "😠", "😡", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "😴", "🥱", "🤮", "😵‍💫", "😷", "🤒", "🥴"
  ]},
  { title: "Hearts & Symbols", data: [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🔥", "✨", "🌟", "💯", "✅", "💢", "💥", "💫", "💦", "💨", "💬", "💭", "💤"
  ]},
  { title: "Hands & Gestures", data: [
    "🙌", "🙏", "👍", "👏", "💪", "🤝", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "✍️", "💅", "🤳", "👂", "👃"
  ]},
  { title: "Animals & Nature", data: [
    "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐒", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🐢", "🐍", "🦎", "🦖", "🥦", "🍓", "🍒", "🍎"
  ]},
  { title: "Sky & Weather", data: [
    "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "🌪️", "🌫️", "🌈", "☔", "💧", "🌊", "🌙", "🌛", "🌑", "🪐"
  ]},
  { title: "Objects & Travel", data: [
    "🏠", "🏡", "🏢", "🏫", "⛪", "🕌", "⛩️", "⛰️", "🌋", "🗻", "🏕️", "🏖️", "🏝️", "🏜️", "🚀", "✈️", "🚢", "🚗", "🚲", "🛴", "🕯️", "💡", "💰", "💸", "💎", "🎁", "🎈", "🎉", "🎨", "🎭", "🎮", "📚", "🔮", "🧬"
  ]}
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

const CommentItem = ({ comment, currentUser, onDelete, onReport, onRowOpen, palette, onLongPress, onReactionTap, isGroupAdmin, journal }: any) => {
  const swipeableRef = React.useRef<Swipeable>(null);
  const isCommentAuthor = currentUser && comment.userId === currentUser.uid;
  
  // Allow delete if: You wrote it OR You are an Admin
  const canDelete = isCommentAuthor || isGroupAdmin;

  const renderRightActions = (progress: any, dragX: any) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    if (canDelete) {
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
        <Pressable 
          style={[styles.deleteAction, { backgroundColor: '#F59E0B' }]} 
          onPress={() => {
            swipeableRef.current?.close(); 
            onReport(comment);             
          }}
        >
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
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        {/* Commenter Avatar */}
        {journal?.memberPhotos?.[comment.userId] ? (
          <Image 
            source={{ uri: journal.memberPhotos[comment.userId] }} 
            style={{ width: 26, height: 26, borderRadius: 13, marginTop: 2 }} 
          />
        ) : (
          <View style={{ 
            width: 26, height: 26, borderRadius: 13, 
            backgroundColor: palette.accent + '20', 
            alignItems: 'center', justifyContent: 'center',
            marginTop: 2
          }}>
            <Users size={12} color={palette.accent} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: palette.accent }}>{comment.authorName}</Text>
            <Text style={{ fontSize: 10, color: palette.sub }}>
              {new Date(comment.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <Text style={{ color: palette.text, marginTop: 2, fontSize: 14 }}>{comment.text}</Text>
        </View>
      </View>
      
      {/* Comment Reactions */}
      {comment.reactions && Object.keys(comment.reactions).length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginLeft: 36 }}>
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

  // Audio State
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const bottomPadding = React.useRef(new Animated.Value(0)).current;

  // Track which comment we are reacting to (null = reacting to the main entry)
  const [activeComment, setActiveComment] = React.useState<any>(null);

// 1. State for recent emojis
  const [recentEmojis, setRecentEmojis] = React.useState<string[]>([]);

  // 2. Load from storage on mount
  React.useEffect(() => {
    const loadRecents = async () => {
      try {
        const stored = await AsyncStorage.getItem('recent_emojis');
        if (stored) setRecentEmojis(JSON.parse(stored));
      } catch (e) { console.error(e); }
    };
    loadRecents();
  }, []);

  // 3. Update storage helper
  const updateRecents = async (emoji: string) => {
    const filtered = recentEmojis.filter(e => e !== emoji);
    const newRecents = [emoji, ...filtered].slice(0, 7); // Keep top 7
    setRecentEmojis(newRecents);
    await AsyncStorage.setItem('recent_emojis', JSON.stringify(newRecents));
  };

  // Place this near your other state variables (like showCustomEmojiPicker)
  const [isReacting, setIsReacting] = React.useState(false);

  // State for viewing who reacted
  const [reactionSummary, setReactionSummary] = React.useState<{ emoji: string, userIds: string[] } | null>(null);
  
  React.useEffect(() => {
    if (Platform.OS === 'ios') return; // iOS works fine with KeyboardAvoidingView

const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
  // If we are reacting, do NOT move the bottom padding
  if (isReacting) {
    bottomPadding.setValue(0);
    return;
  }
  
  Animated.timing(bottomPadding, {
    toValue: e.endCoordinates.height + 15, 
    duration: 150,
    useNativeDriver: false,
  }).start();
});

const hideSub = Keyboard.addListener('keyboardDidHide', () => {
  // Always reset the padding when the keyboard hides
  Animated.timing(bottomPadding, {
    toValue: 0,
    duration: 100,
    useNativeDriver: false,
  }).start();
  
  // Optional: if the keyboard hides, and we aren't showing the emoji picker, 
  // we should ensure isReacting is false
  if (!showCustomEmojiPicker) {
    setIsReacting(false);
  }
});

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  // ----------------------------------------------

const { entry: initialEntry } = route.params;
  const palette = useSharedPalette();
  const { 
    deleteSharedEntry, 
    toggleCommentReaction, 
    deleteComment, 
    journals, 
    markAsRead, 
    blockUser, 
    blockedUsers: allBlockedMap 
  } = useJournalStore();

// Mark journal as read only when LEAVING (Unmounting).
  React.useEffect(() => {
    return () => {
      if (initialEntry.journalId) {
        markAsRead(initialEntry.journalId);
      }
    };
  }, [initialEntry.journalId, markAsRead]);

  // Exclusive Swipe Logic
  const openSwipeableRef = React.useRef<Swipeable | null>(null);
  const onRowOpen = (ref: any) => {
    if (openSwipeableRef.current && openSwipeableRef.current !== ref) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = ref;
  };
  
// 1. Get LIVE entry
  const rawEntry = useJournalStore(s => 
    s.sharedEntries[initialEntry.journalId]?.find(e => e.entryId === initialEntry.entryId)
  ) || initialEntry;

  // 2. Get Blocked List from JournalStore (Unified)
  const myBlockedUsers = React.useMemo(() => {
     const uid = auth.currentUser?.uid || '';
     if (Array.isArray(allBlockedMap)) return [];
     return allBlockedMap?.[uid] || [];
  }, [allBlockedMap]);

  // 3. Filter Blocked Comments on the fly
  const entry = React.useMemo(() => ({
    ...rawEntry,
    comments: rawEntry.comments?.filter((c: any) => !myBlockedUsers.includes(c.userId))
  }), [rawEntry, myBlockedUsers]);
  
  // Check if user is a Group Admin
  const journal = useJournalStore(s => s.journals[entry.journalId]);
  const userRole = journal?.roles?.[auth.currentUser?.uid || ''] || 'member';
  const isGroupAdmin = (auth.currentUser?.uid === journal?.owner) || userRole === 'admin' || userRole === 'owner';

  const [commentText, setCommentText] = React.useState('');
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

// Check ownership
  const currentUser = auth.currentUser;
  const isAuthor = currentUser?.uid && entry.userId === currentUser.uid;

// Toggle for the custom emoji bottom sheet
  const [showCustomEmojiPicker, setShowCustomEmojiPicker] = React.useState(false);

  const handleReaction = async (type: string) => {
    if (!currentUser || !entry.journalId) return;
    // Optimistic UI could be handled here, but the store subscription is usually fast enough
    await JournalService.toggleReaction(entry.journalId, entry.entryId, currentUser.uid, type);
  };

const handleDeleteComment = async (comment: any) => {
    if (!entry.journalId || !entry.entryId) return;
    try {
      // Use Store Action for Instant UI Update
      await deleteComment(entry.journalId, entry.entryId, comment);
    } catch (e) {
      console.error("Failed to delete comment:", e);
      showAlert("Error", "Could not delete comment.");
    }
  };


const handlePostComment = async () => {
    const textToSend = commentText.trim();
    if (!textToSend || !currentUser || !entry.journalId) return;
    
    setIsSubmitting(true);

    // --- MODERATION CHECK ---
    // Check content safety before posting
    const isSafe = await moderateContent(textToSend);
    if (!isSafe) {
      setIsSubmitting(false); // Unlock so user can fix it
      return; 
    }

    // Optimistic clear: Remove text only after passing safety check
    setCommentText('');
    
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

const handleBlockUser = () => {
    showAlert(
      "Block User",
      "You will no longer see posts or comments from this user. This action is local to your device.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Block", 
          style: "destructive", 
          onPress: () => {
            if (auth.currentUser?.uid) {
               // Use JournalStore blocking (requires both IDs)
               blockUser(auth.currentUser.uid, entry.userId);
               navigation.goBack(); 
            }
          }
        }
      ]
    );
  };

  const handleReportEntry = () => {
     showAlert("Report Entry", "Why are you reporting this content?", [
       { text: "Cancel", style: "cancel" },
       { text: "Block User", onPress: handleBlockUser }, // <--- Added shortcut
       { text: "It's spam", onPress: () => submitReport('entry', entry.entryId, 'spam', entry.userId, entry.text) },
       { text: "It's abusive", onPress: () => submitReport('entry', entry.entryId, 'abusive', entry.userId, entry.text) }
     ]);
  };

const handleReportComment = (comment: any) => {
     showAlert("Report Comment", "Why are you reporting this comment?", [
       { text: "Cancel", style: "cancel" },
       { text: "It's spam", onPress: () => submitReport('comment', comment.id, 'spam', comment.userId, comment.text) },
       { text: "It's inappropriate", style: "destructive", onPress: () => submitReport('comment', comment.id, 'inappropriate', comment.userId, comment.text) }
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
      } catch (e: any) {
        // Handle "Already Reported" specific error
        if (e.message === "You have already reported this content.") {
           showAlert("Notice", e.message);
        } else {
           showAlert("Error", "Could not submit report.");
        }
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

{/* Only show Report button if NOT author and NOT admin */}
{!isAuthor && !isGroupAdmin && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* Block Button */}
                <PremiumPressable onPress={handleBlockUser} style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                   <ShieldBan size={20} color="#EF4444" />
                </PremiumPressable>
                {/* Report Button */}
                <PremiumPressable onPress={handleReportEntry} style={[styles.actionBtn, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                   <Flag size={20} color="#F59E0B" />
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
<Text style={[styles.date, { color: palette.subtleText }]}>{dateStr}</Text>
           <Text style={[styles.author, { color: palette.accent }]}>By {entry.authorName || 'Anonymous'}</Text>

           {/* 1. ENTRY TEXT */}
           <Text style={[styles.text, { color: palette.text }]}>
             {typeof entry.text === 'object' ? (entry.text?.text || '') : entry.text}
           </Text>

           {/* 2. AUDIO PLAYER (Voice Note) */}
           {((entry.audioUri) || (typeof entry.text === 'object' && entry.text?.audioUri)) && (
              <View style={{ marginTop: 16, marginBottom: 12 }}>
                 <PremiumPressable 
                    onPress={async () => {
                      const uri = entry.audioUri || (typeof entry.text === 'object' ? entry.text?.audioUri : null);
                      if (!uri) return;
                      try {
                        if (sound) {
                          if (isPlaying) { await sound.pauseAsync(); setIsPlaying(false); } 
                          else { await sound.playAsync(); setIsPlaying(true); }
                        } else {
                          const { sound: newSound } = await Audio.Sound.createAsync({ uri });
                          setSound(newSound);
                          setIsPlaying(true);
                          await newSound.playAsync();
                          newSound.setOnPlaybackStatusUpdate((s) => {
                            if (s.isLoaded && s.didJustFinish) { setIsPlaying(false); newSound.setPositionAsync(0); }
                          });
                        }
                      } catch (e) { showAlert("Error", "Could not play audio."); }
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      borderWidth: 1, padding: 12, borderRadius: 16, gap: 12
                    }}
                 >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' }}>
                       {isPlaying ? <Square size={16} color="white" fill="white" /> : <Play size={16} color="white" fill="white" />}
                    </View>
                    <View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: palette.text }}>Voice Note</Text>
                        <Text style={{ fontSize: 12, color: palette.subtleText }}>{isPlaying ? 'Playing...' : 'Tap to listen'}</Text>
                    </View>
                 </PremiumPressable>
              </View>
           )}

           {/* 3. IMAGE */}
           {(entry.imageUri || (typeof entry.text === 'object' && entry.text?.imageUri)) && (
             <Image 
               source={{ uri: entry.imageUri || entry.text?.imageUri }} 
               style={styles.image} 
               resizeMode="cover" 
             />
           )}

           {/* AUDIO PLAYER */}
            {entry.audioUri && (
                <View style={{ marginTop: 8 }}>
                   <AudioPlayer uri={entry.audioUri} />
                </View>
            )}
           
{/* REACTIONS */}
           <View style={[styles.reactionRow, { borderColor: palette.border }]}>
             {Object.entries(entry?.reactions || {}).map(([emoji, userList]: any) => {
                const count = userList?.length || 0;
                if (count === 0) return null;
                const hasReacted = currentUser && userList.includes(currentUser.uid);
                return (
<Pressable 
                   key={emoji} 
                   onPress={() => setReactionSummary({ emoji, userIds: userList })}
                   style={[styles.reactionPill, { backgroundColor: hasReacted ? palette.accent + '20' : 'transparent', borderColor: hasReacted ? palette.accent : palette.border }]}
                 >
                   <Text style={{ fontSize: 16 }}>{emoji}</Text>
                   <Text style={[styles.reactionCount, { color: palette.sub }]}>{count}</Text>
                 </Pressable>
                );
             })}
<Pressable 
               onPress={() => {
                 setActiveComment(null);
                 Keyboard.dismiss(); 
                 setIsReacting(true); // Lock the UI to prevent jitters
                 setShowCustomEmojiPicker(true);
               }}
               style={[styles.reactionPill, { borderColor: palette.border, borderStyle: 'dashed', paddingHorizontal: 10 }]}
             >
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
{entry.comments
                ?.filter((c: any) => !myBlockedUsers.includes(c.userId)) // <--- Filter blocked comments
                .map((c: any) => (
               <CommentItem 
                   key={c.id} 
                   comment={c}
                   journal={journal} // <--- Added this line
                   currentUser={currentUser}
                   isGroupAdmin={isGroupAdmin} // <--- Pass the permission
                   onDelete={handleDeleteComment} 
                   onReport={handleReportComment} // <--- Added prop
                   onRowOpen={onRowOpen} 
                   palette={palette}
onLongPress={(comment: any) => {
  setIsReacting(true);        // 1. Lock the UI
  Keyboard.dismiss();         // 2. Clear any active keyboard
  setActiveComment(comment);  // 3. Target this specific comment
  setShowCustomEmojiPicker(true);
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
          // This is the critical fix: disable it when picking an emoji
          enabled={!isReacting} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
          style={{ flexGrow: 0 }}
        >
<Animated.View style={[
    styles.inputContainer, 
    { 
      backgroundColor: palette.card, 
      borderTopColor: palette.border,
      // Logic: Dim the bar slightly when reacting
      opacity: isReacting ? 0.6 : 1,
      paddingBottom: Platform.OS === 'ios' 
        ? 12 
        : isReacting 
          ? Math.max(insets.bottom, 12) 
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

{/* Custom Emoji Keyboard (Bottom Sheet) */}
{showCustomEmojiPicker && (
  <>
    {/* DIMMED BACKDROP */}
{/* DIMMED BACKDROP - Tapping anywhere outside the picker closes it */}
    <Pressable 
      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} 
      onPress={() => {
        setShowCustomEmojiPicker(false);
        setActiveComment(null);
        setIsReacting(false);
        Keyboard.dismiss();
      }}
    />

<View style={{ 
      height: 350, 
      backgroundColor: palette.card, 
      borderTopWidth: 1, 
      borderTopColor: palette.border,
      paddingBottom: insets.bottom || 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100
    }}>
{/* Header with Close Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: palette.sub, textTransform: 'uppercase', letterSpacing: 1 }}>
                Reactions
              </Text>
              <Pressable 
                onPress={() => {
                  setShowCustomEmojiPicker(false); // 1. Hide picker
                  setActiveComment(null);          // 2. Reset target
                  setIsReacting(false);            // 3. Unlock Comment Bar
                  Keyboard.dismiss();              // 4. Clean up keyboard
                }}
                style={{ padding: 8 }}
              >
                <X size={22} color={palette.text} />
              </Pressable>
            </View>

            <SectionList
              sections={[
                // Only show "Recently Used" section if there are actually recents
                ...(recentEmojis.length > 0 ? [{ title: "Recently Used", data: [recentEmojis] }] : []),
                // Map through your EMOJI_CATEGORIES from Step 2
                ...EMOJI_CATEGORIES.map(cat => ({ ...cat, data: [cat.data] }))
              ]}
              keyExtractor={(item, index) => index.toString()}
              stickySectionHeadersEnabled={true}
              showsVerticalScrollIndicator={false}
              renderSectionHeader={({ section: { title } }) => (
                <View style={{ 
                  backgroundColor: palette.card, 
                  paddingHorizontal: 16, 
                  paddingVertical: 6,
                  borderBottomWidth: 0.5,
                  borderBottomColor: palette.border + '40' 
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: palette.accent }}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                // This View wraps the emojis into a grid layout
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 8 }}>
                  {item.map((emoji: string) => (
                    <Pressable
                      key={emoji}
onPress={() => {
                        const targetComment = activeComment;
                        // Close and Unlock everything
                        setShowCustomEmojiPicker(false);
                        setActiveComment(null);
setIsReacting(false); 
                        Keyboard.dismiss(); 
                        
                        updateRecents(emoji); // <--- Restored this call
                        
                        if (targetComment) {
                          toggleCommentReaction(entry.journalId, entry.entryId, targetComment.id, currentUser?.uid || '', emoji);
                        } else {
                          handleReaction(emoji);
                        }
                      }}
                      // 14.28% width creates exactly 7 columns (100 / 7)
                      style={{ width: '14.28%', alignItems: 'center', paddingVertical: 12 }}
                    >
                      <Text style={{ fontSize: 26 }}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
/>
          </View>
</> 
      )}

      {/* REACTION SUMMARY MODAL */}
      <Modal
        visible={!!reactionSummary}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionSummary(null)}
      >
        <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setReactionSummary(null)}
        >
          {/* Prevent clicks on the card from closing the modal */}
          <Pressable style={[styles.emojiPickerCard, { backgroundColor: palette.card, borderColor: palette.border, height: 'auto', maxHeight: 400 }]}>
            
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 }}>
                 <Text style={{ fontSize: 16, fontWeight: '700', color: palette.text }}>
                   Reactions {reactionSummary?.emoji}
                 </Text>
                 <Pressable onPress={() => setReactionSummary(null)} hitSlop={10}>
                   <X size={20} color={palette.text} />
                 </Pressable>
            </View>

            {/* User List */}
            <ScrollView style={{ width: '100%' }} contentContainerStyle={{ gap: 12 }}>
              {reactionSummary?.userIds.map(uid => {
                 // Resolve Name/Photo from Journal Store
                 const name = journal?.membersMap?.[uid] || 'Member';
                 const photo = journal?.memberPhotos?.[uid];
                 const isMe = uid === currentUser?.uid;

                 return (
                    <View key={uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                       {photo ? (
                          <Image source={{ uri: photo }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: palette.border }} />
                       ) : (
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: palette.accent + '20', alignItems: 'center', justifyContent: 'center' }}>
                             <Users size={16} color={palette.accent} />
                          </View>
                       )}
                       <Text style={{ fontSize: 15, fontWeight: isMe ? '700' : '400', color: palette.text, flex: 1 }}>
                          {isMe ? 'You' : name}
                       </Text>
                    </View>
                 );
              })}
            </ScrollView>
            
            {/* "Remove My Reaction" Button (Only if I reacted with this emoji) */}
            {reactionSummary && currentUser && reactionSummary.userIds.includes(currentUser.uid) && (
                <Pressable 
                    onPress={() => {
                        handleReaction(reactionSummary.emoji); // Toggle it OFF
                        setReactionSummary(null); // Close modal
                    }}
                    style={({ pressed }) => ({ 
                      marginTop: 20, 
                      padding: 12, 
                      width: '100%', 
                      alignItems: 'center', 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                      borderRadius: 12,
                      opacity: pressed ? 0.7 : 1
                    })}
                >
                   <Text style={{ color: '#EF4444', fontWeight: '600' }}>Remove My Reaction</Text>
                </Pressable>
            )}
          </Pressable>
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
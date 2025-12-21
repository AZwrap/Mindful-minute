import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Share, Animated, LayoutAnimation, Platform, UIManager, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { JournalService } from '../services/journalService'; // <--- Added
import { useUIStore } from '../stores/uiStore';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PenTool, Share2, LogOut, Search, X, Trash2, MessageCircle, Heart, Users } from 'lucide-react-native';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { createInviteLink, leaveSharedJournal } from '../services/syncedJournalService';
import PremiumPressable from '../components/PremiumPressable';
import * as Clipboard from 'expo-clipboard';
import { auth } from '../firebaseConfig';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedJournal'>;

export default function SharedJournalScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
  const { showAlert } = useUIStore(); 
  const palette = useSharedPalette();

  // Ref to track the currently open swipeable row
  const openSwipeableRef = useRef<Swipeable | null>(null);

  const onRowOpen = (ref: any) => {
    if (openSwipeableRef.current && openSwipeableRef.current !== ref) {
      openSwipeableRef.current.close();
    }
    openSwipeableRef.current = ref;
  };
  
const { 
    subscribeToJournal, 
    sharedEntries, 
    journalInfo, 
    markAsRead,
    deleteSharedEntry,
    isLoading,
    updateJournalMeta, // <--- Added
    restoreJournals    // <--- Added
  } = useJournalStore();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // 1. Refresh Metadata (Name, Members, Photo)
      const updated = await JournalService.getJournal(journalId);
      if (updated) {
        updateJournalMeta(journalId, updated);
      }
      // 2. Sync all journals to ensure roles/permissions are up to date
      await restoreJournals();
    } catch (e) {
      console.log("Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  };
  
  const currentUserId = auth.currentUser?.uid;

  // Helper to handle both Firestore Timestamps and number/string dates
  const safeDate = (val: any) => {
    if (!val) return 'Recently';
    if (typeof val?.toDate === 'function') return val.toDate().toLocaleDateString(); // Firestore
    return new Date(val).toLocaleDateString(); // JS Date/Number
  };

const entries = sharedEntries[journalId] || [];
  const journal = useJournalStore(s => s.journals[journalId]) || journalInfo;

  // Search State
  const [searchText, setSearchText] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
// Enable LayoutAnimation for Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

// Filter Logic
  const filteredEntries = React.useMemo(() => {
    // Safety: Filter out invalid entries (missing ID) to prevent key warnings & crashes
    const validEntries = entries.filter(e => e && e.entryId);

    if (!searchText.trim()) return validEntries;
    
const term = searchText.toLowerCase();
    return validEntries.filter(e => {
      // SAFEGUARD: Handle if text is accidentally an object
      const rawText = typeof e.text === 'object' ? (e.text?.text || '') : e.text;
      return (
        (rawText && rawText.toLowerCase().includes(term)) || 
        (e.authorName && e.authorName.toLowerCase().includes(term))
      );
    });
  }, [entries, searchText]);

// Load journal data on mount
  useEffect(() => {
    subscribeToJournal(journalId);
    // Note: We removed markAsRead() here. 
    // We now only mark as read when you actually open the SharedEntryDetailScreen.
  }, [journalId]);

const handleInvite = async () => {
    const user = auth.currentUser;
    if (!user) {
        showAlert("Error", "You must be signed in to invite others.");
        return;
    }
    try {
      // Pass the direct auth user object
      const link = await createInviteLink(journalId, user as any);
      await Clipboard.setStringAsync(link);
      showAlert('Copied!', 'Invite link copied to clipboard.');
    } catch (e) {
      showAlert('Error', 'Failed to create invite link.');
    }
  };

  const handleLeave = () => {
    showAlert(
      "Leave Journal",
      "Are you sure? You won't see these entries anymore.",
      [
        { text: "Cancel", style: "cancel" },
{ 
          text: "Leave", 
          style: "destructive", 
          onPress: async () => {
            const user = auth.currentUser;
            if (user) {
                // Pass user.uid because leaveSharedJournal expects a string ID
                await leaveSharedJournal(journalId, user.uid);
                // Force navigation back to list to prevent showing a deleted journal
                navigation.reset({
                  index: 1,
                  routes: [{ name: 'MainTabs' }, { name: 'JournalList' }],
                });
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
          <PremiumPressable onPress={() => navigation.navigate('JournalDetails', { journalId })}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* Journal Avatar Thumbnail */}
                {journal?.photoUrl ? (
                  <Image 
                    source={{ uri: journal.photoUrl }} 
                    style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: palette.border }} 
                  />
                ) : (
                  <View style={{ 
                    width: 38, height: 38, borderRadius: 12, 
                    backgroundColor: palette.accent + '15', 
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: palette.border
                  }}>
                    <Users size={18} color={palette.accent} />
                  </View>
                )}

                <View>
                  <Text style={[styles.title, { color: palette.text, fontSize: 18 }]}>
                    {journal?.name || 'Shared Journal'} <Text style={{ fontSize: 14, color: palette.subtleText }}>ⓘ</Text>
                  </Text>
                  <Text style={[styles.subtitle, { color: palette.subtleText, marginTop: 0 }]}>
                    {(() => {
                       const count = journal?.memberIds?.length || journal?.members?.length || 1;
                       const entryCount = entries.length;
                       return `${count} ${count === 1 ? 'Member' : 'Members'} • ${entryCount} ${entryCount === 1 ? 'Entry' : 'Entries'}`;
                    })()}
                  </Text>
                </View>
             </View>
          </PremiumPressable>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PremiumPressable onPress={handleInvite} style={[styles.iconBtn, { backgroundColor: palette.card }]}>
                <Share2 size={20} color={palette.accent} />
            </PremiumPressable>
            <PremiumPressable onPress={handleLeave} style={[styles.iconBtn, { backgroundColor: palette.card }]}>
                <LogOut size={20} color="#EF4444" />
            </PremiumPressable>
            <PremiumPressable 
              onPress={() => {
                if (isSearching) setSearchText('');
                setIsSearching(!isSearching);
              }} 
              style={[styles.iconBtn, { backgroundColor: palette.card }]}
            >
                {isSearching ? <X size={20} color={palette.text} /> : <Search size={20} color={palette.text} />}
            </PremiumPressable>
          </View>
        </View>

        {isSearching && (
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <TextInput
              style={[styles.searchInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.card }]}
              placeholder="Search entries or authors..."
              placeholderTextColor={palette.subtleText}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          </View>
        )}

<FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.entryId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={palette.accent} 
              colors={[palette.accent]} // Android
            />
          }
renderItem={({ item }) => {
            const myRole = journal?.roles?.[currentUserId || ''];
            const isAdmin = myRole === 'admin' || myRole === 'owner';
            
// Check if THIS entry is mine AND has new comments (that are not mine)
            const lastReadTime = useJournalStore.getState().lastRead[journalId] || 0;
            const hasUnreadComment = 
                item.userId === currentUserId && 
                item.comments?.some((c: any) => c.createdAt > lastReadTime && c.userId !== currentUserId);

return (
              <SharedEntryItem
                item={item}
                journal={journal} // <--- Added this line
                hasUnreadComment={hasUnreadComment}
                isOwner={journal?.owner === currentUserId}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onDelete={(id: string) => deleteSharedEntry(journalId, id)}
                navigation={navigation}
                palette={palette}
                safeDate={safeDate}
                onRowOpen={onRowOpen}
              />
            );
          }}
ListEmptyComponent={
             isLoading ? (
               <View style={styles.empty}>
                 <ActivityIndicator size="small" color={palette.accent} />
                 <Text style={[styles.emptyText, { color: palette.subtleText, marginTop: 12 }]}>Syncing entries...</Text>
               </View>
             ) : (
               <View style={styles.empty}>
                   <Text style={[styles.emptyText, { color: palette.subtleText }]}>No entries yet.</Text>
               </View>
             )
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

// Sub-component to handle deletion animation smoothly
const SharedEntryItem = ({ item, isOwner, isAdmin, currentUserId, onDelete, navigation, palette, safeDate, onRowOpen, hasUnreadComment, journal }: any) => {
  const swipeableRef = useRef<Swipeable>(null); // <--- Local ref

  const isAuthor = item.userId === currentUserId;

  // Calculate stats
  const commentCount = item.comments?.length || 0;
  const reactionCount = Object.values(item.reactions || {}).reduce((acc: number, users: any) => acc + (users?.length || 0), 0);
  // Allow delete if: Owner, Admin, or Author
  const canDelete = isOwner || isAdmin || isAuthor;
  
  const handleDelete = () => {
    // 1. Configure Layout Animation for the list update
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // 2. Delete immediately (The Store's optimistic update will remove it from props instantly)
    onDelete(item.entryId);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `"${item.text}"\n\n— ${item.authorName || 'Anonymous'} (Micro Muse)`
      });
    } catch (e) {
      console.log(e);
    }
  };

return (
    <Swipeable
      ref={swipeableRef}
      friction={1} // <--- Makes the close animation faster and snappier
      onSwipeableWillOpen={() => onRowOpen(swipeableRef.current)}
      renderLeftActions={(progress, dragX) => {
        const scale = dragX.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });
        return (
          <Pressable onPress={handleShare} style={styles.leftAction}>
            <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
              <Share2 size={24} color="white" />
              <Text style={styles.actionText}>Share</Text>
            </Animated.View>
          </Pressable>
        );
      }}
      renderRightActions={canDelete ? (progress, dragX) => {
        const scale = dragX.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });
        return (
          <Pressable onPress={handleDelete} style={styles.rightAction}>
            <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
              <Trash2 size={24} color="white" />
              <Text style={styles.actionText}>Delete</Text>
            </Animated.View>
          </Pressable>
        );
      } : undefined}
      overshootLeft={false}
      overshootRight={false}
    >
<PremiumPressable 
        onPress={() => navigation.navigate('SharedEntryDetail', { entry: item })}
        onTouchStart={() => onRowOpen(swipeableRef.current)} 
        style={[styles.entryCard, { backgroundColor: palette.card, borderColor: palette.border }]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.entryDate, { color: palette.subtleText }]}>
            {safeDate(item.createdAt)}
          </Text>
{/* New Comment Indicator (Only for my posts) */}
          {hasUnreadComment && (
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.accent + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accent }} />
                <Text style={{ fontSize: 10, color: palette.accent, fontWeight: '700' }}>New Comment</Text>
             </View>
          )}
        </View>
{/* SAFEGUARD: Handle corrupted text objects */}
        <Text style={[styles.entryText, { color: palette.text }]} numberOfLines={3}>
          {typeof item.text === 'object' ? (item.text?.text || '') : item.text}
        </Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Author Profile Picture */}
          {journal?.memberPhotos?.[item.userId] ? (
            <Image 
              source={{ uri: journal.memberPhotos[item.userId] }} 
              style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: palette.border }} 
            />
          ) : (
            <View style={{ 
              width: 20, height: 20, borderRadius: 10, 
              backgroundColor: palette.accent + '20', 
              alignItems: 'center', justifyContent: 'center' 
            }}>
              <Users size={10} color={palette.accent} />
            </View>
          )}
          <Text style={[styles.entryAuthor, { color: palette.accent, marginBottom: 0 }]}>
            {item.authorName || 'Anonymous'}
          </Text>
        </View>
        
{/* Render image preview (Check both root and nested object) */}
        {(item.imageUri || (typeof item.text === 'object' && item.text?.imageUri)) && (
          <Image 
            source={{ uri: item.imageUri || item.text?.imageUri }} 
            style={{ width: '100%', height: 150, borderRadius: 8, marginTop: 12 }} 
            resizeMode="cover"
          />
        )}

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MessageCircle size={14} color={palette.subtleText} />
            <Text style={{ fontSize: 12, color: palette.subtleText, fontWeight: '600' }}>{commentCount}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Heart size={14} color={palette.subtleText} />
            <Text style={{ fontSize: 12, color: palette.subtleText, fontWeight: '600' }}>{reactionCount}</Text>
          </View>
        </View>
      </PremiumPressable>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 4 },
  list: { padding: 16, gap: 12 },
  entryCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  entryDate: { fontSize: 12, marginBottom: 8, fontWeight: '600' },
  entryText: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
entryAuthor: { fontSize: 12, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 30, right: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16 },
  iconBtn: { padding: 10, borderRadius: 12 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  
  // Swipe Actions
  leftAction: {
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 24,
    width: 100,
    borderRadius: 16,
    marginBottom: 0,
    marginRight: -16, // Pull behind the card
  },
  rightAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
    width: 100,
    borderRadius: 16,
    marginBottom: 0,
    marginLeft: -16, // Pull behind the card
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
});
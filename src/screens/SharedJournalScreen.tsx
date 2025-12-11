import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert, TextInput, Share, Animated, LayoutAnimation, Platform, UIManager, Image } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PenTool, Share2, LogOut, Search, X, Trash2 } from 'lucide-react-native';

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
  const palette = useSharedPalette();
  
const { 
    subscribeToJournal, 
    sharedEntries, 
    journalInfo, 
    markAsRead,
    deleteSharedEntry 
  } = useJournalStore();
  
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
  // Filter Logic
  const filteredEntries = React.useMemo(() => {
    if (!searchText.trim()) return entries;
    const term = searchText.toLowerCase();
    return entries.filter(e => 
      (e.text && e.text.toLowerCase().includes(term)) || 
      (e.authorName && e.authorName.toLowerCase().includes(term))
    );
  }, [entries, searchText]);

// Load journal data on mount
  useEffect(() => {
    subscribeToJournal(journalId); // <--- Changed from joinJournal
    markAsRead(journalId);
    
    // Optional: Mark as read again when leaving to catch updates while open
    return () => markAsRead(journalId);
  }, [journalId]);

const handleInvite = async () => {
    const user = auth.currentUser;
    if (!user) {
        Alert.alert("Error", "You must be signed in to invite others.");
        return;
    }
    try {
      // Pass the direct auth user object
      const link = await createInviteLink(journalId, user as any);
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
             <View>
<Text style={[styles.title, { color: palette.text }]}>
                  {journal?.name || 'Shared Journal'} <Text style={{ fontSize: 16, color: palette.subtleText }}>ⓘ</Text>
                </Text>
<Text style={[styles.subtitle, { color: palette.subtleText }]}>
                    {(() => {
                       const count = journal?.memberIds?.length || journal?.members?.length || 1;
                       const entryCount = entries.length;
                       return `${count} ${count === 1 ? 'Member' : 'Members'} • ${entryCount} ${entryCount === 1 ? 'Entry' : 'Entries'}`;
                    })()}
                </Text>
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
renderItem={({ item }) => {
            const myRole = journal?.roles?.[currentUserId || ''];
            const isAdmin = myRole === 'admin' || myRole === 'owner';

            return (
              <SharedEntryItem
                item={item}
                isOwner={journal?.owner === currentUserId}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onDelete={(id: string) => deleteSharedEntry(journalId, id)}
                navigation={navigation}
                palette={palette}
                safeDate={safeDate}
              />
            );
          }}
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

// Sub-component to handle deletion animation smoothly
const SharedEntryItem = ({ item, isOwner, isAdmin, currentUserId, onDelete, navigation, palette, safeDate }: any) => {
  const isAuthor = item.userId === currentUserId;
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
        message: `"${item.text}"\n\n— ${item.authorName || 'Anonymous'} (Mindful Minute)`
      });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Swipeable
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
        style={[styles.entryCard, { backgroundColor: palette.card, borderColor: palette.border }]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[styles.entryDate, { color: palette.subtleText }]}>
            {safeDate(item.createdAt)}
          </Text>
        </View>
        <Text style={[styles.entryText, { color: palette.text }]} numberOfLines={3}>
          {item.text}
        </Text>
        <Text style={[styles.entryAuthor, { color: palette.accent }]}>
          — {item.authorName || 'Anonymous'}
        </Text>
        
        {/* Render image preview if exists */}
        {item.imageUri && (
          <Image 
            source={{ uri: item.imageUri }} 
            style={{ width: '100%', height: 150, borderRadius: 8, marginTop: 12 }} 
            resizeMode="cover"
          />
        )}
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
  entryAuthor: { fontSize: 12, fontWeight: '700', fontStyle: 'italic' },
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
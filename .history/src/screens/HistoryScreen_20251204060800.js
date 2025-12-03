import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Dimensions,
  Animated,
  Alert,
  RefreshControl,
  FlatList,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEntriesStore } from "../stores/entriesStore";
import { useProgress } from "../stores/progressStore"; // <--- IMPORTED
import MoodDropdown from '../components/MoodDropdown';
import { useTheme } from '../stores/themeStore';
import PremiumPressable from '../components/PremiumPressable';
import { Swipeable } from 'react-native-gesture-handler';
import { Search, X , Trash2 } from 'lucide-react-native'; // <--- ADD THIS
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types'; // <--- NEW IMPORT
import { exportSingleEntry } from '../utils/exportHelper';

const SwipeableEntry = ({
  entry,
  onDelete,
  onPress,
  onLongPress,
  isDark,
  textMain,
  textSub,
  borderColor,
}) => {
  const swipeableRef = useRef(null);

const renderRightActions = (progress, dragX) => {
    // Animation: Fade in, but stay strictly BEHIND the card
    const opacity = progress.interpolate({
      inputRange: [0, 0.1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View 
        style={[
          styles.deleteButtonWrapper, 
          { opacity, zIndex: -1 } // <--- Force it to the back layer
        ]}
      >
        <Pressable
          onPress={() => {
            swipeableRef.current?.close();
            onDelete(entry.date);
          }}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: pressed ? '#DC2626' : '#EF4444' }
          ]}
        >
          <Trash2 size={24} color="white" />
          <Text style={styles.swipeActionText}>Delete</Text>
        </Pressable>
      </Animated.View>
    );
  };

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (isNaN(d.getTime())) return 'Unsaved Draft'; 
    
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <View
      style={[
        styles.entryWrapper,
        {
          backgroundColor: 'transparent', 
          borderColor,
        },
      ]}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={30}
        friction={2}
        overshootFriction={8}
      >
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress} // <--- Add this line
        delayLongPress={500}      // Optional: 500ms delay
          style={({ pressed }) => [
            styles.entryItem,
            { 
              opacity: pressed ? 0.8 : 1,
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              zIndex: 10,      // <--- Force it to the front layer
            elevation: 5,    // <--- Force Android layering
            },
          ]}
        >
          <View style={styles.entryHeader}>
            <Text style={[styles.entryDate, { color: textMain }]}>
              {formatDate(entry.date)}
            </Text>
          </View>

          <Text
            style={[styles.entryPrompt, { color: textSub }]}
            numberOfLines={2}
          >
            {entry.promptText || entry.prompt?.text}
          </Text>

          {entry.text && (
            <Text
              style={[styles.entryReflection, { color: textMain }]}
              numberOfLines={3}
            >
              {entry.text}
            </Text>
          )}

          {entry.moodTag?.value && (
            <View
              style={[
                styles.moodTag,
                {
                  backgroundColor: isDark
                    ? 'rgba(99,102,241,0.15)'
                    : 'rgba(99,102,241,0.08)',
                  borderColor: isDark
                    ? 'rgba(99,102,241,0.3)'
                    : 'rgba(99,102,241,0.2)',
                },
              ]}
            >
              <Text style={[styles.moodText, { color: '#6366F1' }]}>
                {entry.moodTag.value}
              </Text>
            </View>
          )}
        </Pressable>
      </Swipeable>
    </View>
  );
};

// <--- INSERT PROP TYPES HERE --->
SwipeableEntry.propTypes = {
  entry: PropTypes.shape({
    date: PropTypes.string.isRequired,
    text: PropTypes.string,
    promptText: PropTypes.string,
    prompt: PropTypes.shape({
      text: PropTypes.string,
    }),
    moodTag: PropTypes.shape({
      value: PropTypes.string,
      type: PropTypes.string,
    }),
    isComplete: PropTypes.bool,
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onPress: PropTypes.func.isRequired,
  isDark: PropTypes.bool.isRequired,
  textMain: PropTypes.string.isRequired,
  textSub: PropTypes.string.isRequired,
  borderColor: PropTypes.string.isRequired,
};

export default function HistoryScreen({ navigation }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  // FIXED: Get streak from progress store
  const streak = useProgress((s) => s.streak) || 0;

  // FIXED: Select 'entries' directly
  const map = useEntriesStore((s) => s.entries);
  
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

  const [selectedMood, setSelectedMood] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [deletedEntries, setDeletedEntries] = useState({});

// Handle entry deletion
  const handleDeleteEntry = (date) => { // <--- Changed param from 'entry' to 'date'
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            // 1. Update local state to hide immediately
            setDeletedEntries(prev => ({ ...prev, [date]: true }));
            
            // 2. Delete from store using the date string directly
            useEntriesStore.getState().deleteEntry(date);
          }
        }
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Handle Export (Long Press)
  const handleLongPressEntry = (entry) => {
    if (Platform.OS === 'ios') {
        // iOS can show more options
        Alert.alert(
            "Export Entry",
            "Choose a format",
            [
                { text: "PDF Document", onPress: () => exportSingleEntry(entry, 'pdf') },
                { text: "CSV (Excel)", onPress: () => exportSingleEntry(entry, 'csv') },
                { text: "JSON Data", onPress: () => exportSingleEntry(entry, 'json') },
                { text: "Cancel", style: "cancel" }
            ]
        );
    } else {
        // Android limited to 3 buttons, so we prioritize PDF and CSV
        Alert.alert(
            "Export Entry",
            "Choose a format",
            [
                { text: "Cancel", style: "cancel" },
                { text: "CSV", onPress: () => exportSingleEntry(entry, 'csv') },
                { text: "PDF", onPress: () => exportSingleEntry(entry, 'pdf') },
            ]
        );
    }
  };

  useEffect(() => {
    if (entries.length > 0 || map) {
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [entries.length, map]);

  const recentMoods = useMemo(() => {
    const recentEntries = entries.slice(0, 14);
    const moodCounts = {};
    recentEntries.forEach(entry => {
      if (entry.moodTag?.value && entry.moodTag.value !== 'custom') {
        const mood = entry.moodTag.value;
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      }
    });
    return Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([mood]) => mood);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const activeEntries = entries.filter(entry => !deletedEntries[entry.date]);
    const completeEntries = activeEntries.filter(entry => entry.isComplete !== false);
    
// 1. Filter by Mood
    let result = completeEntries;
    if (selectedMood !== 'all') {
      if (selectedMood === 'custom') {
        result = result.filter(entry => entry.moodTag?.type === 'custom');
      } else {
        result = result.filter(entry => entry.moodTag?.value === selectedMood);
      }
    }

    // 2. Filter by Text (Search)
    if (searchText.trim()) {
      const term = searchText.toLowerCase();
      result = result.filter(entry => 
        (entry.text && entry.text.toLowerCase().includes(term)) ||
        (entry.promptText && entry.promptText.toLowerCase().includes(term))
      );
    }

    return result;
  }, [entries, selectedMood, deletedEntries, searchText]); // <--- Added searchText dependency

  const gradients = {
    dark: { primary: ['#0F172A', '#1E293B', '#334155'] },
    light: { primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'] },
  };
  const currentGradient = gradients[currentTheme] || gradients.light;

  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';
  const borderColor = isDark ? '#374151' : '#D1D5DB';

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
        <View style={styles.contentCard}>

{/* 1. STATS SUMMARY WIDGET */}
          <PremiumPressable
            onPress={() => navigation.navigate('Stats', { initialMood: selectedMood })}
            haptic="light"
            style={[
              styles.statsWidget,
              { 
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
                justifyContent: 'space-around' // Use space-around to center the groups nicely
              }
            ]}
          >
            {/* Current Streak */}
            <View style={{ alignItems: 'center' }}> 
              <Text style={[styles.statsLabel, { color: textSub }]}>Current Streak</Text>
              <Text style={[styles.statsValue, { color: '#6366F1' }]}>
                {streak} Day{streak !== 1 ? 's' : ''}
              </Text>
            </View>
            
            {/* Vertical Divider (Optional, keeps them separated visually) */}
            <View style={{ width: 1, height: '80%', backgroundColor: borderColor, opacity: 0.5 }} />

            {/* Total Entries */}
            <View style={{ alignItems: 'center' }}> 
              <Text style={[styles.statsLabel, { color: textSub }]}>Total Entries</Text>
               <Text style={[styles.statsValue, { color: textMain }]}>
                {entries.length}
              </Text>
            </View>
            
            {/* Arrow removed or kept minimal? kept it as requested in previous iterations but maybe distinct enough now. 
               Let's keep the arrow but push it to the far right if needed, or remove it for cleaner look. 
               I'll remove the separate arrow text since the whole card is pressable and space-around handles layout better. */}
          </PremiumPressable>

{/* Mood Filter & Search */}
          <View style={styles.filterContainer}>
            
            {/* Header Row */}
            <View style={styles.filterHeader}>
              <Text style={[styles.filterLabel, { color: textSub }]}>
                Filter Entries
              </Text>
              <PremiumPressable 
                onPress={() => {
                  if (isSearching) setSearchText(''); // Clear on close
                  setIsSearching(!isSearching);
                }}
                hitSlop={10}
              >
                {isSearching ? (
                  <X size={20} color={textSub} />
                ) : (
                  <Search size={20} color={textSub} />
                )}
              </PremiumPressable>
            </View>

            {/* Expandable Search Bar */}
            {isSearching && (
              <TextInput
                style={[
                  styles.searchInput, 
                  { 
                    color: textMain, 
                    borderColor: borderColor,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'white' 
                  }
                ]}
                placeholder="Search entries..."
                placeholderTextColor={textSub}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
            )}
            
            <MoodDropdown
              selectedMood={selectedMood}
              onMoodSelect={setSelectedMood}
              isDark={isDark}
              textMain={textMain}
              textSub={textSub}
              borderColor={borderColor}
            />

            {/* Recent Moods */}
            {recentMoods.length > 0 && (
              <View style={styles.recentMoodsSection}>
                <Text style={[styles.recentMoodsLabel, { color: textSub }]}>
                  Recent moods
                </Text>
                <View style={styles.recentMoodsChips}>
                  {recentMoods.map((mood) => (
                    <PremiumPressable
                      key={mood}
                      onPress={() => setSelectedMood(mood)}
                      haptic="light"
                      style={[
                        styles.recentMoodChip,
                        { 
                          backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
                          borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
                        }
                      ]}
                    >
                      <Text style={[styles.recentMoodText, { color: '#6366F1' }]}>
                        {mood}
                      </Text>
                    </PremiumPressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Entry Count */}
          <View style={styles.entryCountContainer}>
            <Text style={[styles.entryCount, { color: textSub }]}>
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>

          {/* Entries List */}
          <FlatList
            data={filteredEntries}
            keyExtractor={(item) => item.date}
            style={styles.entriesList}
            showsVerticalScrollIndicator={true}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={isDark ? '#6366F1' : '#6366F1'}
                colors={['#6366F1']}
                progressBackgroundColor={isDark ? '#1E293B' : '#F1F5F9'}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: textSub }]}>
                  {selectedMood === 'all' 
                    ? 'No completed entries yet' 
                    : `No completed entries with "${selectedMood}" mood`
                  }
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <SwipeableEntry
                key={item.date}
                entry={item}
                onDelete={handleDeleteEntry}
                onPress={() => navigation.navigate('EntryDetail', { date: item.date })}
                onLongPress={() => handleLongPressEntry(item)}
                isDark={isDark}
                textMain={textMain}
                textSub={textSub}
                borderColor={borderColor}
              />
            )}
          />
        </View>
      </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentCard: {
    flex: 1,
    marginHorizontal: 4,
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 24,
  },
statsWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between', <--- Overridden inline to 'space-around' for better centering
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterContainer: {
    marginBottom: 16,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  entriesList: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryPrompt: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  moodTag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentMoodsSection: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  recentMoodsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentMoodsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recentMoodChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recentMoodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  entryReflection: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  entryWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
  },
  entryItem: {
    padding: 12,
    minHeight: 100,
  },
  deleteButtonWrapper: {
    width: 65,
    height: '100%',
    justifyContent: 'center',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    overflow: 'hidden',   
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  swipeActionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  entryCountContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  entryCount: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
});
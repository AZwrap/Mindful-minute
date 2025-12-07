import React, { useEffect, useMemo, useState, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Animated,
  Alert,
  RefreshControl,
  Platform,
  FlatList,
  TextInput,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { Search, X , Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Navigation
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { TabParamList } from '../navigation/TabNavigator';

// Stores & Types
import { useEntriesStore, JournalEntry } from "../stores/entriesStore";
import { useProgress } from "../stores/progressStore";
import { useTheme } from '../stores/themeStore';

// Components & Utils
import MoodDropdown from '../components/MoodDropdown';
import PremiumPressable from '../components/PremiumPressable';
import { exportSingleEntry } from '../utils/exportHelper';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type HistoryScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'History'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface SwipeableEntryProps {
  entry: JournalEntry;
  onDelete: (date: string) => void;
  onPress: () => void;
  onLongPress: () => void;
  isDark: boolean;
  textMain: string;
  textSub: string;
  borderColor: string;
}

// --------------------------------------------------
// SUB-COMPONENT: Swipeable Entry
// --------------------------------------------------
const SwipeableEntry = memo(({
  entry,
  onDelete,
  onPress,
  onLongPress,
  isDark,
  textMain,
  textSub,
  borderColor,
}: SwipeableEntryProps) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const opacity = progress.interpolate({
      inputRange: [0, 0.1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View 
        style={[
          styles.deleteButtonWrapper, 
          { opacity, zIndex: -1 }
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

  function formatDate(iso: string) {
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
          onLongPress={onLongPress}
          delayLongPress={500} // Increased delay for export menu
          hitSlop={8}
          style={({ pressed }) => [
            styles.entryItem,
            { 
              // Fix: Use solid color shift instead of opacity to prevent delete button bleed-through
              backgroundColor: isDark 
                ? (pressed ? '#334155' : '#1E293B') 
                : (pressed ? '#F1F5F9' : '#FFFFFF'),
              zIndex: 10,
              elevation: 5,
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
});

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------
export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  const streak = useProgress((s) => s.streak) || 0;
  const map = useEntriesStore((s) => s.entries);
  
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ ...entry, date })); // Explicitly merge date back in for types
  }, [map]);

  const [selectedMood, setSelectedMood] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [deletedEntries, setDeletedEntries] = useState<Record<string, boolean>>({});

  // Export Handler
  const handleLongPressEntry = (entry: JournalEntry) => {
    const options = [
      { text: "Export as CSV", onPress: () => exportSingleEntry(entry, 'csv') },
      { text: "Export as PDF", onPress: () => exportSingleEntry(entry, 'pdf') },
      { text: "Export as JSON", onPress: () => exportSingleEntry(entry, 'json') },
      { text: "Cancel", style: "cancel" }
    ] as AlertButton[]; // Using generic AlertButton type logic for structure

    if (Platform.OS === 'android') {
        Alert.alert(
            "Export Entry",
            "Choose a format",
            [
                { text: "Cancel", style: "cancel" },
                { text: "CSV", onPress: () => exportSingleEntry(entry, 'csv') },
                { text: "PDF", onPress: () => exportSingleEntry(entry, 'pdf') },
            ]
        );
    } else {
        Alert.alert("Export Entry", "Choose a format", options);
    }
  };

  const handleDeleteEntry = (date: string) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            setDeletedEntries(prev => ({ ...prev, [date]: true }));
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
    const moodCounts: Record<string, number> = {};
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
    
    let result = completeEntries;
    if (selectedMood !== 'all') {
      if (selectedMood === 'custom') {
        result = result.filter(entry => entry.moodTag?.type === 'custom');
      } else {
        result = result.filter(entry => entry.moodTag?.value === selectedMood);
      }
    }

    if (searchText.trim()) {
      const term = searchText.toLowerCase();
      result = result.filter(entry => 
        (entry.text && entry.text.toLowerCase().includes(term)) ||
        (entry.promptText && entry.promptText.toLowerCase().includes(term)) ||
        (entry.prompt?.text && entry.prompt.text.toLowerCase().includes(term))
      );
    }

    return result;
  }, [entries, selectedMood, deletedEntries, searchText]);

  const gradients = {
    dark: { primary: ['#0F172A', '#1E293B', '#334155'] },
    light: { primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'] },
  };
  const currentGradient = gradients[currentTheme as keyof typeof gradients] || gradients.light;

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

          {/* STATS SUMMARY WIDGET */}
          <PremiumPressable
            onPress={() => navigation.navigate('Stats', { initialMood: selectedMood })}
            haptic="light"
            style={[
              styles.statsWidget,
              { 
                backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE',
                justifyContent: 'space-around' 
              }
            ]}
          >
            <View style={{ alignItems: 'center' }}> 
              <Text style={[styles.statsLabel, { color: textSub }]}>Current Streak</Text>
              <Text style={[styles.statsValue, { color: '#6366F1' }]}>
                {streak} Day{streak !== 1 ? 's' : ''}
              </Text>
            </View>
            
            <View style={{ width: 1, height: '80%', backgroundColor: borderColor, opacity: 0.5 }} />

            <View style={{ alignItems: 'center' }}> 
              <Text style={[styles.statsLabel, { color: textSub }]}>Total Entries</Text>
               <Text style={[styles.statsValue, { color: textMain }]}>
                {entries.length}
              </Text>
            </View>
          </PremiumPressable>

          {/* Mood Filter & Search */}
          <View style={styles.filterContainer}>
            <View style={styles.filterHeader}>
              <Text style={[styles.filterLabel, { color: textSub }]}>
                Filter Entries
              </Text>
              <PremiumPressable 
                onPress={() => {
                  if (isSearching) setSearchText('');
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

          <View style={styles.entryCountContainer}>
            <Text style={[styles.entryCount, { color: textSub }]}>
              {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
            </Text>
          </View>

          <FlatList
            data={filteredEntries}
            keyExtractor={(item) => item.date}
            style={styles.entriesList}
            showsVerticalScrollIndicator={true}
            initialNumToRender={10} 
            maxToRenderPerBatch={5}
            windowSize={5}
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
                <Text style={[styles.emptyText, { color: textSub, marginBottom: 16 }]}>
                  {selectedMood === 'all' 
                    ? 'Your journal is waiting for you.' 
                    : `No entries found for "${selectedMood}".`
                  }
                </Text>
                
                {selectedMood === 'all' && !searchText && (
                  <PremiumPressable
                    onPress={() => navigation.navigate('Write', { date: new Date().toISOString().split('T')[0] })}
                    haptic="medium"
                    style={{
                      backgroundColor: isDark ? '#334155' : 'white',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: borderColor,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Text style={{ 
                      color: isDark ? '#818CF8' : '#6366F1', 
                      fontWeight: '600',
                      fontSize: 15
                    }}>
                      Write New Entry
                    </Text>
                  </PremiumPressable>
                )}
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
            getItemLayout={(data, index) => (
              { length: 110, offset: 110 * index, index }
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
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recentMoodText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  entryReflection: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    fontStyle: 'italic',
    textTransform: 'capitalize',
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
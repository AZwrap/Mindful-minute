import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useColorScheme,
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useEntries } from '../stores/entriesStore';
import MoodDropdown from '../components/MoodDropdown';
import { useTheme } from '../stores/themeStore';
import PremiumPressable from '../components/PremiumPressable';
import { Swipeable } from 'react-native-gesture-handler';

const SwipeableEntry = ({ 
  entry, 
  onDelete, 
  onPress,
  isDark,
  textMain,
  textSub,
  borderColor 
}) => {
  const swipeableRef = useRef(null);

  const renderRightActions = (progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-67, 0],  // Changed from -80 to -70
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActions}>
        <Animated.View style={[styles.swipeAction, { transform: [{ scale }] }]}>
          <Pressable
            style={[styles.deleteButton, { backgroundColor: '#EF4444' }]}
            onPress={() => {
              onDelete(entry);
              swipeableRef.current?.close();
            }}
          >
            <Text style={styles.swipeActionText}>Delete</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  function formatDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={30}
      friction={2}
      overshootFriction={8}
      containerStyle={styles.swipeableContainer}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.entryItem,
          { 
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderColor: borderColor,
            opacity: pressed ? 0.8 : 1,
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
          {entry.promptText}
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
          <View style={[
            styles.moodTag,
            { 
              backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
              borderColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
            }
          ]}>
            <Text style={[styles.moodText, { color: '#6366F1' }]}>
              {entry.moodTag.value}
            </Text>
          </View>
        )}
      </Pressable>
    </Swipeable>
  );
};

export default function HistoryScreen({ navigation }) {
const systemScheme = useColorScheme();
const { getCurrentTheme } = useTheme();
const currentTheme = getCurrentTheme(systemScheme);
const isDark = currentTheme === 'dark';

const { height: screenHeight } = Dimensions.get('window');

  const map = useEntries((s) => s.map);
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);
  const flashDate = useEntries((s) => s.flashDate);
  const consumeFlashDate = useEntries((s) => s.consumeFlashDate);
  
  const [selectedMood, setSelectedMood] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

    const [refreshing, setRefreshing] = useState(false);
  const [deletedEntries, setDeletedEntries] = useState({});

  // Handle entry deletion
  const handleDeleteEntry = (entry) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            // Mark as deleted in local state first
            setDeletedEntries(prev => ({
              ...prev,
              [entry.date]: true
            }));
            
            // Then remove from store
            const { removeEntry } = useEntries.getState();
            removeEntry(entry.date);
          }
        }
      ]
    );
  };

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Simulate refresh - you can add actual data reloading here
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setRefreshing(false);
  };

  useEffect(() => {
  // Fade in when entries are loaded
  if (entries.length > 0 || map) {
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }
}, [entries.length, map]);

  // Get recent moods from entries (last 7 days, most frequent first)
  const recentMoods = useMemo(() => {
    const recentEntries = entries.slice(0, 14); // Last 14 entries (about 2 weeks)
    const moodCounts = {};
    
    recentEntries.forEach(entry => {
      if (entry.moodTag?.value && entry.moodTag.value !== 'custom') {
        const mood = entry.moodTag.value;
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      }
    });
    
    // Return top 4 most used recent moods
    return Object.entries(moodCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 4)
      .map(([mood]) => mood);
  }, [entries]);

  // Filter entries based on selected mood and exclude deleted
  const filteredEntries = useMemo(() => {
    // Filter out deleted entries first
    const activeEntries = entries.filter(entry => !deletedEntries[entry.date]);
    
    // Only show complete entries (with both text AND mood)
    const completeEntries = activeEntries.filter(entry => entry.isComplete !== false);
    
    if (selectedMood === 'all') return completeEntries;
    if (selectedMood === 'custom') {
      return completeEntries.filter(entry => entry.moodTag?.type === 'custom');
    }
    return completeEntries.filter(entry => entry.moodTag?.value === selectedMood);
  }, [entries, selectedMood, deletedEntries]);

  // Gradients
  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B', '#334155'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
    },
  };
const currentGradient = gradients[currentTheme] || gradients.light;

  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';
  const borderColor = isDark ? '#374151' : '#D1D5DB';

  function formatDate(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  
  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
<Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
  <View style={styles.contentCard}>

        {/* Mood Filter */}
        <View style={styles.filterContainer}>
          <Text style={[styles.filterLabel, { color: textSub }]}>Filter by mood:</Text>
          
          <MoodDropdown
            selectedMood={selectedMood}
            onMoodSelect={setSelectedMood}
            isDark={isDark}
            textMain={textMain}
            textSub={textSub}
            borderColor={borderColor}
          />

          {/* Recent Moods Quick Access */}
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

        {/* Virtualized Entries List */}
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
              isDark={isDark}
              textMain={textMain}
              textSub={textSub}
              borderColor={borderColor}
            />
          )}
        />

        {/* Stats Button - Bottom Left */}
        <PremiumPressable
          onPress={() => navigation.navigate('Stats', { initialMood: selectedMood })}
          haptic="light"
          style={[
            styles.statsButton,
            { 
              borderColor: 'rgba(99,102,241,0.3)',
            }
          ]}
        >
          <Text style={[styles.statsButtonText, { color: '#6366F1' }]}>
            Stats
          </Text>
        </PremiumPressable>
      </View>
            </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentCard: {
    flex: 1,
    marginHorizontal: 4,  // Reduced from 8
    marginTop: 8,
    marginBottom: 16,
    padding: 12,  // Reduced from 16
    borderRadius: 24,
  },
  filterContainer: {
    marginBottom: 16,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  statsButtonText: {
    fontWeight: '700',
    fontSize: 14,
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
  entryItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,  // Reduced from 12
    minHeight: 100,
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
    swipeableContainer: {
    marginBottom: 8,
  },
  swipeActions: {
    flexDirection: 'row',
    width: 65,  // Reduced from 70
    marginBottom: 12,
  },
  swipeAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 65,  // Reduced from 70
    borderRadius: 8,  // Smaller radius
    marginLeft: 2,  // Reduced from 4
  },
  swipeActionText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
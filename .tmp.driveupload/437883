import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Stores
import { useEntries } from '../stores/entriesStore';
import { useProgress } from '../stores/progressStore';
import { useTheme } from '../stores/themeStore';

// Components & Utils
import PremiumPressable from '../components/PremiumPressable';
import { analyzeWritingAnalytics } from '../constants/writingAnalytics';

// --- HELPER FUNCTIONS ---

const getDayName = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' }); // Changed to short (Mon, Tue)
};

// Map moods to a rough "valence" score (1-5) for the trend line
const getMoodScore = (mood) => {
  const m = mood?.toLowerCase().trim();
  // Level 5: High Energy / Positive
  if (['happy', 'excited', 'energized', 'optimistic', 'grateful', 'joyful'].includes(m)) return 5;
  // Level 4: Calm / Positive Focus
  if (['calm', 'focused', 'relaxed', 'content', 'peaceful'].includes(m)) return 4;
  // Level 3: Neutral / Internal
  if (['reflective', 'neutral', 'indifferent', 'okay'].includes(m)) return 3;
  // Level 2: Low Energy / Mild Negative
  if (['tired', 'bored', 'sad', 'gloomy', 'lazy'].includes(m)) return 2;
  // Level 1: High Stress / Negative
  if (['anxious', 'stressed', 'overwhelmed', 'angry', 'frustrated'].includes(m)) return 1;
  
  return 3; // Default middle
};

const getMoodColor = (score) => {
  if (score >= 5) return '#10B981'; // Emerald
  if (score === 4) return '#34D399'; // Teal
  if (score === 3) return '#6366F1'; // Indigo
  if (score === 2) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
};

const analyzeWritingPatterns = (allEntries) => {
  if (!allEntries || !allEntries.length) return null;

  const dayCounts = {};
  allEntries.forEach(entry => {
    // Use full day name for the pattern text
    const date = new Date(entry.date);
    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  
  if (allEntries.length === 0) return null;
  const firstEntry = new Date(allEntries[allEntries.length - 1].date);
  const lastEntry = new Date(allEntries[0].date);
  const totalWeeks = Math.max(1, Math.ceil((lastEntry - firstEntry) / (7 * 24 * 60 * 60 * 1000)));
  
  const mostFrequentDay = Object.entries(dayCounts)
    .reduce((max, [day, count]) => count > (dayCounts[max] || 0) ? day : max, Object.keys(dayCounts)[0]);
  
  const totalEntries = allEntries.length;
  const entriesPerWeek = (totalEntries / totalWeeks).toFixed(1);
  
  return { mostFrequentDay, totalEntries, entriesPerWeek, dayCounts };
};

export default function StatsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  // Store Data
  const streak = useProgress((s) => s.streak);
  const level = useProgress((s) => s.level);
  const totalXP = useProgress((s) => s.totalXP);
  const map = useEntries((s) => s.map);

  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);
  
  const writingPatterns = useMemo(() => analyzeWritingPatterns(entries), [entries]);
  const writingAnalytics = useMemo(() => analyzeWritingAnalytics ? analyzeWritingAnalytics(entries) : null, [entries]);

  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (entries.length > 0 || map) {
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [entries.length, map]);

  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Get entries for selected period
  const periodEntries = useMemo(() => {
    const now = new Date();
    let cutoffDate;

    switch (selectedPeriod) {
      case 'week':
        cutoffDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        cutoffDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case 'all':
      default:
        return entries;
    }

    // Filter and ensure we only check valid dates
    return entries.filter(entry => {
      if (!entry.date) return false;
      const entryDate = new Date(`${entry.date}T00:00:00`);
      // Also ensure we count entries on the cutoff day itself
      cutoffDate.setHours(0,0,0,0);
      return entryDate >= cutoffDate;
    });
  }, [entries, selectedPeriod]);

  // Calculate mood statistics (Frequency)
  const moodStats = useMemo(() => {
    const stats = {};
    let totalEntries = 0;

    periodEntries.forEach(entry => {
      if (entry.moodTag?.value) {
        const mood = entry.moodTag.value;
        stats[mood] = (stats[mood] || 0) + 1;
        totalEntries++;
      }
    });

    return Object.entries(stats)
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [periodEntries]);

  // Prepare Trend Data (Chronological order for graph)
  const trendData = useMemo(() => {
    // Take period entries, ensure they have mood, sort ASCENDING by date
    const data = periodEntries
      .filter(e => e.moodTag?.value)
      .sort((a, b) => (a.date > b.date ? 1 : -1)); // Oldest first for graph L->R

    // If too many points, sample them or take last 10
    return data.slice(-10); 
  }, [periodEntries]);

  // Theming
  const gradients = {
    dark: { primary: ['#0F172A', '#1E293B', '#334155'] },
    light: { primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'] },
  };
  const currentGradient = gradients[currentTheme] || gradients.light;
  
  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';
  const borderColor = isDark ? '#374151' : '#D1D5DB';

  const periodLabels = {
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    all: 'All Time'
  };

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
        <ScrollView 
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.contentCard}>
            
            {/* Period Selector */}
            <View style={styles.periodSelector}>
              {['week', 'month', 'all'].map((period) => (
                <PremiumPressable
                  key={period}
                  onPress={() => setSelectedPeriod(period)}
                  haptic="light"
                  style={[
                    styles.periodOption,
                    { 
                      backgroundColor: selectedPeriod === period 
                        ? (isDark ? 'rgba(99, 102, 241, 0.3)' : '#FFFFFF')
                        : 'transparent'
                    }
                  ]}
                >
                  <Text style={[
                    styles.periodText,
                    { 
                      color: selectedPeriod === period 
                        ? (isDark ? '#F9FAFB' : '#111827') 
                        : (isDark ? '#9CA3AF' : '#6B7280')
                    }
                  ]}>
                    {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All Time'}
                  </Text>
                </PremiumPressable>
              ))}
            </View>

            {/* --- MOOD TRENDS (New Section) --- */}
            <View style={[
              styles.section, 
              { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' }
            ]}>
              <Text style={[styles.sectionTitle, { color: textMain }]}>
                Mood Trend
              </Text>
              
              {trendData.length >= 2 ? (
                <View style={styles.chartContainer}>
                  <View style={styles.chartGrid}>
                    {/* Y-Axis Labels (Optional simplification: just icons or High/Low text) */}
                    <View style={styles.yAxis}>
                      <Text style={[styles.axisLabel, { color: textSub }]}>Pos</Text>
                      <Text style={[styles.axisLabel, { color: textSub }]}>Neu</Text>
                      <Text style={[styles.axisLabel, { color: textSub }]}>Neg</Text>
                    </View>

                    {/* The Graph Area */}
                    <View style={styles.graphArea}>
                      {/* Horizontal Grid Lines */}
                      <View style={[styles.gridLine, { bottom: '16%', backgroundColor: borderColor }]} />
                      <View style={[styles.gridLine, { bottom: '50%', backgroundColor: borderColor }]} />
                      <View style={[styles.gridLine, { bottom: '84%', backgroundColor: borderColor }]} />

                      {/* Data Points */}
                      <View style={styles.pointsContainer}>
                        {trendData.map((item, index) => {
                          const score = getMoodScore(item.moodTag.value);
                          // Normalize 1-5 score to 0-100% height
                          // 1 -> 10%, 3 -> 50%, 5 -> 90%
                          const heightPercent = 10 + ((score - 1) * 20); 
                          
                          return (
                            <View key={item.date} style={styles.pointColumn}>
                              {/* The Dot */}
                              <View style={[
                                styles.pointDot, 
                                { 
                                  bottom: `${heightPercent}%`,
                                  backgroundColor: getMoodColor(score),
                                  // Highlight the last one
                                  width: index === trendData.length - 1 ? 10 : 8,
                                  height: index === trendData.length - 1 ? 10 : 8,
                                  borderRadius: 6,
                                }
                              ]} />
                              
                              {/* Date Label */}
                              <Text style={[styles.xLabel, { color: textSub }]}>
                                {getDayName(item.date)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.trendNote, { color: textSub }]}>
                    Last {trendData.length} entries
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptySubtitle, { color: textSub }]}>
                    Write a few more entries to see your mood trends over time.
                  </Text>
                </View>
              )}
            </View>

            {/* Statistics (Frequency) */}
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: textMain, marginBottom: 12 }]}>
                Mood Breakdown
              </Text>
            </View>

            <View style={styles.statsSection}>
              {moodStats.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyTitle, { color: textMain }]}>
                    {selectedPeriod === 'all' ? 'No Entries Yet' : 'No Data'}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: textSub }]}>
                    {selectedPeriod === 'all' 
                      ? 'Start journaling to see your mood trends' 
                      : `No completed entries with moods for ${periodLabels[selectedPeriod].toLowerCase()}`
                    }
                  </Text>
                </View>
              ) : (
                <>
                  {moodStats.map((stat) => (
                    <View 
                      key={stat.mood}
                      style={[styles.statItem, { borderColor }]}
                    >
                      <View style={styles.statHeader}>
                        <Text style={[styles.moodName, { color: textMain }]}>
                          {stat.mood}
                        </Text>
                        <Text style={[styles.statCount, { color: '#6366F1' }]}>
                          {stat.count}
                        </Text>
                      </View>
                      
                      <View style={styles.percentageBar}>
                        <View 
                          style={[
                            styles.percentageFill,
                            { 
                              width: `${stat.percentage}%`,
                              backgroundColor: getMoodColor(getMoodScore(stat.mood)) // Use score color
                            }
                          ]} 
                        />
                      </View>
                      
                      <Text style={[styles.percentageText, { color: textSub }]}>
                        {stat.percentage}%
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* Writing Patterns */}
            <View style={[
              styles.section, 
              { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' }
            ]}>
              <Text style={[styles.sectionTitle, { color: textMain }]}>
                Writing Patterns
              </Text>
              
              {writingPatterns ? (
                <>
                  <View style={styles.insightsGrid}>
                    <View style={styles.insightItem}>
                      <Text style={[styles.insightLabel, { color: textSub }]} numberOfLines={1}>
                        Most Active
                      </Text>
                      <Text style={[styles.insightValue, { color: '#6366F1' }]} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
                        {writingPatterns.mostFrequentDay}
                      </Text>
                    </View>
                    
                    <View style={styles.insightItem}>
                      <Text style={[styles.insightLabel, { color: textSub }]}>
                        Total
                      </Text>
                      <Text style={[styles.insightValue, { color: '#6366F1' }]}>
                        {writingPatterns.totalEntries}
                      </Text>
                    </View>
                    
                    <View style={styles.insightItem}>
                      <Text style={[styles.insightLabel, { color: textSub }]}>
                        Week Avg
                      </Text>
                      <Text style={[styles.insightValue, { color: '#6366F1' }]}>
                        {writingPatterns.entriesPerWeek}
                      </Text>
                    </View>
                  </View>

                  {/* Day Distribution */}
                  {writingPatterns?.dayCounts && (
                    <View style={styles.dayDistribution}>
                      <Text style={[styles.distributionTitle, { color: textSub }]}>
                        Entries by day
                      </Text>
                      <View style={styles.daysGrid}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <View key={day} style={styles.dayItem}>
                            <Text style={[styles.dayName, { color: textSub }]}>{day.slice(0, 3)}</Text>
                            <View style={[styles.dayBarContainer, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                              <View 
                                style={[
                                  styles.dayBar,
                                  { 
                                    width: `${((writingPatterns.dayCounts[day] || 0) / writingPatterns.totalEntries) * 100}%`,
                                    backgroundColor: '#6366F1',
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.dayCount, { color: textSub }]}>
                              {writingPatterns.dayCounts[day] || 0}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyTitle, { color: textMain }]}>No Patterns Yet</Text>
                </View>
              )}
            </View>

            {/* Writing Analytics */}
            <View style={[
              styles.section, 
              { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' }
            ]}>
              <Text style={[styles.sectionTitle, { color: textMain }]}>
                Analytics
              </Text>
              
              {writingAnalytics ? (
                <View style={styles.analyticsGrid}>
                  {/* Word Count Stats */}
                  <View style={styles.analyticsRow}>
                    <View style={styles.analyticItem}>
                      <Text style={[styles.analyticLabel, { color: textSub }]}>Total Words</Text>
                      <Text style={[styles.analyticValue, { color: '#6366F1' }]}>
                        {writingAnalytics.totalWords.toLocaleString()}
                      </Text>
                    </View>
                    
                    <View style={styles.analyticItem}>
                      <Text style={[styles.analyticLabel, { color: textSub }]}>Avg/Entry</Text>
                      <Text style={[styles.analyticValue, { color: '#6366F1' }]}>
                        {writingAnalytics.averageWords}
                      </Text>
                    </View>
                  </View>

                  {/* Entry Length */}
                  <View style={styles.analyticsRow}>
                    <View style={styles.analyticItem}>
                      <Text style={[styles.analyticLabel, { color: textSub }]}>Longest</Text>
                      <Text style={[styles.analyticValue, { color: '#6366F1' }]}>
                        {writingAnalytics.longestEntry.wordCount}
                      </Text>
                    </View>
                    
                    {writingAnalytics.shortestEntry && (
                      <View style={styles.analyticItem}>
                        <Text style={[styles.analyticLabel, { color: textSub }]}>Shortest</Text>
                        <Text style={[styles.analyticValue, { color: '#6366F1' }]}>
                          {writingAnalytics.shortestEntry.wordCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptySubtitle, { color: textSub }]}>
                    Complete 3+ entries to unlock detailed analytics
                  </Text>
                </View>
              )}
            </View>

            {/* Progress Stats */}
            <View style={[
              styles.section, 
              { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' }
            ]}>
              <View style={styles.progressRow}>
                <View style={styles.progressItem}>
                  <Text style={[styles.progressLabel, { color: textSub }]}>Streak</Text>
                  <Text style={[styles.progressValue, { color: '#6366F1' }]}>
                    {streak}
                  </Text>
                </View>
                
                <View style={styles.progressItem}>
                  <Text style={[styles.progressLabel, { color: textSub }]}>Level</Text>
                  <Text style={[styles.progressValue, { color: '#6366F1' }]}>
                    {level}
                  </Text>
                </View>
              </View>
              
              {/* XP Progress Bar */}
              <View style={styles.xpContainer}>
                <View style={styles.xpLabels}>
                  <Text style={[styles.xpText, { color: textSub }]}>To Level {level + 1}</Text>
                  <Text style={[styles.xpText, { color: textSub }]}>
                    {totalXP % 100}/100 XP
                  </Text>
                </View>
                <View style={[styles.xpBar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                  <View 
                    style={[
                      styles.xpProgress, 
                      { 
                        width: `${totalXP % 100}%`,
                        backgroundColor: '#6366F1',
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>

          </View>
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  contentCard: { margin: 16, padding: 16, borderRadius: 24 },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderRadius: 16,
    padding: 6,
  },
  periodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  periodText: { fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
  
  // General Section Styles
  section: { marginBottom: 24, paddingHorizontal: 16, paddingVertical: 20, borderRadius: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
  sectionTitleContainer: { marginTop: 8 },

  // Empty State
  emptyState: { justifyContent: 'center', alignItems: 'center', paddingVertical: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 220, opacity: 0.8 },
  
  // Mood Trend Chart
  chartContainer: { height: 180, marginTop: 8 },
  chartGrid: { flex: 1, flexDirection: 'row' },
  yAxis: { width: 30, justifyContent: 'space-between', paddingVertical: 20, paddingRight: 8 },
  axisLabel: { fontSize: 10, textAlign: 'right', fontWeight: '600', opacity: 0.7 },
  graphArea: { flex: 1, position: 'relative', paddingTop: 20, paddingBottom: 20 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, opacity: 0.2 },
  pointsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  pointColumn: { alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: 20 },
  pointDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute' },
  xLabel: { position: 'absolute', bottom: -20, fontSize: 10, fontWeight: '600', opacity: 0.7 },
  trendNote: { textAlign: 'right', fontSize: 10, marginTop: 12, opacity: 0.5 },

  // Breakdown Stats
  statsSection: { gap: 12, marginBottom: 24 },
  statItem: { padding: 14, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statHeader: { width: 80 }, // Fixed width for name
  moodName: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  statCount: { fontSize: 12, fontWeight: '700', opacity: 0.7, marginTop: 2 },
  percentageBar: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  percentageFill: { height: '100%', borderRadius: 4 },
  percentageText: { fontSize: 12, fontWeight: '600', width: 36, textAlign: 'right' },
  
  // Progress
  progressRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  progressItem: { alignItems: 'center' },
  progressLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', opacity: 0.7 },
  progressValue: { fontSize: 22, fontWeight: '800' },
  xpContainer: { gap: 8 },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  xpText: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  xpBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpProgress: { height: '100%', borderRadius: 4 },
  
  // Insights / Patterns
  insightsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  insightItem: { alignItems: 'center', flex: 1 },
  insightLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6, opacity: 0.7, textAlign: 'center' },
  insightValue: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  
  // Day Distribution
  dayDistribution: { marginTop: 4 },
  distributionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 16, opacity: 0.8 },
  daysGrid: { gap: 10 },
  dayItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayName: { fontSize: 11, fontWeight: '600', width: 24, textAlign: 'right', opacity: 0.8 },
  dayBarContainer: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  dayBar: { height: '100%', borderRadius: 3 },
  dayCount: { fontSize: 11, fontWeight: '600', width: 16, textAlign: 'left', opacity: 0.6 },
  
  // Analytics
  analyticsGrid: { gap: 16 },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  analyticItem: { flex: 1 }, // Align left/right naturally
  analyticLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, opacity: 0.7 },
  analyticValue: { fontSize: 15, fontWeight: '700' },
});
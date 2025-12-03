import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  ScrollView,
  Animated,
  InteractionManager,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEntriesStore } from "../stores/entriesStore";
import { useProgress } from '../stores/progressStore';
import { analyzeWritingAnalytics } from '../constants/writingAnalytics';
import { useTheme } from '../stores/themeStore';
import { useSharedPalette } from '../hooks/useSharedPalette'; // Updated hook
import PremiumPressable from '../components/PremiumPressable';
import { analyzeMoodTrends, getMoodInsights } from '../utils/moodTrends';
import { analyzeWritingInsights, getWritingInsights } from '../utils/writingInsights';
import { analyzeMoodCorrelations, getMoodCorrelationSummary } from '../utils/moodAnalysis';
import { SafeAreaView } from 'react-native-safe-area-context';

// Gratitude analytics helper
const analyzeGratitudePractice = (entries) => {
  const gratitudeEntries = entries.filter(entry => entry.isGratitude);
  const totalEntries = entries.length;
  
  if (gratitudeEntries.length === 0) return null;
  
  const gratitudePercentage = Math.round((gratitudeEntries.length / totalEntries) * 100);
  
  const gratitudeMoods = {};
  const regularMoods = {};
  
  entries.forEach(entry => {
    if (entry.moodTag?.value) {
      const mood = entry.moodTag.value;
      if (entry.isGratitude) {
        gratitudeMoods[mood] = (gratitudeMoods[mood] || 0) + 1;
      } else {
        regularMoods[mood] = (regularMoods[mood] || 0) + 1;
      }
    }
  });
  
  const mostCommonGratitudeMood = Object.entries(gratitudeMoods)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  return {
    totalGratitudeEntries: gratitudeEntries.length,
    gratitudePercentage,
    mostCommonGratitudeMood,
    gratitudeMoods,
    regularMoods,
    hasGratitudeData: gratitudeEntries.length > 0
  };
};

// Writing pattern analysis helpers
const getDayName = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const analyzeWritingPatterns = (allEntries) => {
  if (!allEntries || !allEntries.length) return null;

  const dayCounts = {};
  allEntries.forEach(entry => {
    const day = getDayName(entry.date);
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  if (allEntries.length === 0) return null;
  const firstEntry = new Date(allEntries[allEntries.length - 1].date);
  const lastEntry = new Date(allEntries[0].date);
  const totalWeeks = Math.max(1, Math.ceil((lastEntry - firstEntry) / (7 * 24 * 60 * 60 * 1000)));
  
  const mostFrequentDay = Object.entries(dayCounts)
    .reduce((max, [day, count]) => count > dayCounts[max] ? day : max, Object.keys(dayCounts)[0]);
  
  const totalEntries = allEntries.length;
  const entriesPerWeek = (totalEntries / totalWeeks).toFixed(1);
  
  return { mostFrequentDay, totalEntries, entriesPerWeek, dayCounts };
};

// Weekly Gratitude Report
const generateGratitudeReport = (entries, gratitudeStreak, totalGratitudeEntries) => {
  const recentEntries = entries.slice(0, 14);
  const gratitudeEntries = recentEntries.filter(entry => entry.isGratitude);
  const regularEntries = recentEntries.filter(entry => !entry.isGratitude);
  
  if (gratitudeEntries.length === 0) return null;
  
  const gratitudeMoods = {};
  const regularMoods = {};
  
  gratitudeEntries.forEach(entry => {
    if (entry.moodTag?.value) {
      gratitudeMoods[entry.moodTag.value] = (gratitudeMoods[entry.moodTag.value] || 0) + 1;
    }
  });
  
  regularEntries.forEach(entry => {
    if (entry.moodTag?.value) {
      regularMoods[entry.moodTag.value] = (regularMoods[entry.moodTag.value] || 0) + 1;
    }
  });
  
  const topGratitudeMood = Object.entries(gratitudeMoods).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topRegularMood = Object.entries(regularMoods).sort((a, b) => b[1] - a[1])[0]?.[0];
  
  const positiveMoods = ['calm', 'happy', 'grateful', 'excited', 'peaceful'];
  const gratitudePositivity = Object.keys(gratitudeMoods).filter(mood => 
    positiveMoods.includes(mood.toLowerCase())
  ).length / Object.keys(gratitudeMoods).length * 100;
  
  const regularPositivity = Object.keys(regularMoods).filter(mood => 
    positiveMoods.includes(mood.toLowerCase())
  ).length / Object.keys(regularMoods).length * 100;
  
  return {
    gratitudeEntriesCount: gratitudeEntries.length,
    totalEntriesCount: recentEntries.length,
    gratitudePercentage: Math.round((gratitudeEntries.length / recentEntries.length) * 100),
    topGratitudeMood,
    topRegularMood,
    gratitudePositivity: Math.round(gratitudePositivity),
    regularPositivity: Math.round(regularPositivity),
    positivityDifference: Math.round(gratitudePositivity - regularPositivity),
    currentStreak: gratitudeStreak,
    totalGratitudeEntries
  };
};

export default function StatsScreen({ navigation, route }) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const palette = useSharedPalette();

  // Store Hooks
  const map = useEntriesStore((s) => s.entries);
  const streak = useProgress((s) => s.streak);
  const level = useProgress((s) => s.level);
  const totalXP = useProgress((s) => s.totalXP);
  const gratitudeStreak = useProgress((s) => s.gratitudeStreak);
  const totalGratitudeEntries = useProgress((s) => s.totalGratitudeEntries);

  // UI State
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const [isReady, setIsReady] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Data State (Calculated asynchronously)
  const [data, setData] = useState({
    entries: [],
    moodAnalysis: { insights: [], timeCorrelations: {} },
    correlationSummary: { totalMoodsTracked: 0 },
    gratitudeReport: null,
    writingPatterns: null,
    writingAnalytics: null,
    gratitudeAnalytics: null,
    moodTrends: null,
    moodInsights: [],
    writingInsightsAnalysis: null,
    writingInsights: [],
    periodEntries: [],
    moodStats: []
  });

  // PERFORMANCE FIX: Run heavy calculations after navigation transition
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // 1. Prepare Sorted Entries
      const sortedEntries = Object.entries(map || {})
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([date, entry]) => ({ date, ...entry }));

      // 2. Run Heavy Analytics
      const _writingPatterns = analyzeWritingPatterns(sortedEntries);
      const _writingAnalytics = analyzeWritingAnalytics(sortedEntries);
      const _gratitudeAnalytics = analyzeGratitudePractice(sortedEntries);
      const _moodAnalysis = analyzeMoodCorrelations(sortedEntries);
      const _correlationSummary = getMoodCorrelationSummary(sortedEntries);
      const _gratitudeReport = generateGratitudeReport(sortedEntries, gratitudeStreak, totalGratitudeEntries);

      // 3. Set Data
      setData(prev => ({
        ...prev,
        entries: sortedEntries,
        writingPatterns: _writingPatterns,
        writingAnalytics: _writingAnalytics,
        gratitudeAnalytics: _gratitudeAnalytics,
        moodAnalysis: _moodAnalysis,
        correlationSummary: _correlationSummary,
        gratitudeReport: _gratitudeReport,
      }));

      setIsReady(true);
      
      // Fade In
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });

    return () => task.cancel();
  }, [map, gratitudeStreak, totalGratitudeEntries]);

  // PERIOD FILTERING LOGIC (Runs when period changes)
  useEffect(() => {
    if (!isReady) return;

    const now = new Date();
    let cutoffDate;

    if (selectedPeriod === 'week') cutoffDate = new Date(now.setDate(now.getDate() - 7));
    if (selectedPeriod === 'month') cutoffDate = new Date(now.setDate(now.getDate() - 30));

    const _periodEntries = selectedPeriod === 'all' 
      ? data.entries 
      : data.entries.filter(e => new Date(e.date + 'T00:00:00') >= cutoffDate);

    // Mood Trends
    const _moodTrends = analyzeMoodTrends(data.entries, selectedPeriod);
    const _moodInsights = getMoodInsights(_moodTrends);
    const _writingInsightsAnalysis = analyzeWritingInsights(data.entries, selectedPeriod);
    const _writingInsights = getWritingInsights(_writingInsightsAnalysis);

    // Mood Stats
    const _moodStats = {};
    let total = 0;
    _periodEntries.forEach(e => {
      if (e.moodTag?.value) {
        const m = e.moodTag.value;
        _moodStats[m] = (_moodStats[m] || 0) + 1;
        total++;
      }
    });

    const _moodStatsArray = Object.entries(_moodStats)
      .map(([m, c]) => ({ 
        mood: m, 
        count: c, 
        percentage: total > 0 ? Math.round((c/total)*100) : 0 
      }))
      .sort((a, b) => b.count - a.count);

    setData(prev => ({
      ...prev,
      periodEntries: _periodEntries,
      moodTrends: _moodTrends,
      moodInsights: _moodInsights,
      writingInsightsAnalysis: _writingInsightsAnalysis,
      writingInsights: _writingInsights,
      moodStats: _moodStatsArray
    }));

  }, [selectedPeriod, isReady, data.entries]);

  // Unwrap data for clearer render code
  const { 
    writingPatterns, writingAnalytics, gratitudeAnalytics, 
    moodTrends, moodInsights, writingInsightsAnalysis, writingInsights,
    moodAnalysis, correlationSummary, moodStats, periodEntries, gratitudeReport
  } = data;

  const periodLabels = {
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    all: 'All Time'
  };

  const textMain = palette.text;
  const textSub = palette.subtleText;
  const borderColor = palette.border;

  return (
    <LinearGradient
      colors={[palette.bg, palette.bg]} // Use palette background
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* LOADING STATE */}
      {!isReady ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
          <Text style={[styles.loadingText, { color: palette.subtleText }]}>
            Analyzing Journal...
          </Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: contentFadeAnim, flex: 1 }}>
          <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={[styles.contentCard, { backgroundColor: palette.bg }]}>
              
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
                          ? palette.accent
                          : 'transparent'
                      }
                    ]}
                  >
                    <Text style={[
                      styles.periodText,
                      { 
                        color: selectedPeriod === period 
                          ? palette.accentText // Uses Smart Contrast (White/Black)
                          : palette.text
                      }
                    ]}>
                      {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All Time'}
                    </Text>
                  </PremiumPressable>
                ))}
              </View>

              {/* Gratitude Practice Analytics */}
              {gratitudeAnalytics?.hasGratitudeData && (
                <View style={[
                  styles.insightsSection, 
                  { 
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
                    borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)',
                  }
                ]}>
                  <Text style={[styles.insightsTitle, { color: isDark ? '#4ADE80' : '#16A34A' }]}>
                    Gratitude Practice 🌟
                  </Text>
                  
                  <View style={styles.insightsGrid}>
                    <View style={styles.insightItem}>
                      <Text style={[styles.insightLabel, { color: textSub }]}>Total</Text>
                      <Text style={[styles.insightValue, { color: '#22C55E' }]}>
                        {gratitudeAnalytics.totalGratitudeEntries}
                      </Text>
                    </View>
                    <View style={styles.insightItem}>
                      <Text style={[styles.insightLabel, { color: textSub }]}>Of Entries</Text>
                      <Text style={[styles.insightValue, { color: '#22C55E' }]}>
                        {gratitudeAnalytics.gratitudePercentage}%
                      </Text>
                    </View>
                    {gratitudeAnalytics.mostCommonGratitudeMood && (
                      <View style={styles.insightItem}>
                        <Text style={[styles.insightLabel, { color: textSub }]}>Common Mood</Text>
                        <Text style={[styles.insightValue, { color: '#22C55E', textTransform: 'capitalize' }]}>
                          {gratitudeAnalytics.mostCommonGratitudeMood}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Writing Patterns */}
              <View style={[styles.insightsSection, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}>
                <Text style={[styles.insightsTitle, { color: textMain }]}>Writing Patterns</Text>
                
                {writingPatterns ? (
                  <View style={styles.insightsGrid}>
                    <View style={styles.insightItem}>
                      <Text style={[styles.insightLabel, { color: textSub }]}>Most Active</Text>
                      <Text style={[styles.insightValue, { color: palette.accent }]}>
                        {writingPatterns.mostFrequentDay}
                      </Text>
                    </View>
                    <View style={styles.insightItem}>
                      <Text style={[styles.insightLabel, { color: textSub }]}>Total</Text>
                      <Text style={[styles.insightValue, { color: palette.accent }]}>
                        {writingPatterns.totalEntries}
                      </Text>
                    </View>
                    <View style={styles.insightItem}>
                      <Text style={[styles.insightLabel, { color: textSub }]}>Week Avg</Text>
                      <Text style={[styles.insightValue, { color: palette.accent }]}>
                        {writingPatterns.entriesPerWeek}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyTitle, { color: textMain }]}>No Patterns Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: textSub }]}>
                      Write a few entries to discover your writing habits
                    </Text>
                  </View>
                )}

                {/* Day Distribution */}
                {writingPatterns?.dayCounts && (
                  <View style={styles.dayDistribution}>
                    <Text style={[styles.distributionTitle, { color: textSub }]}>Entries by day</Text>
                    <View style={styles.daysGrid}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <View key={day} style={styles.dayItem}>
                          <Text style={[styles.dayName, { color: textSub }]}>{day.slice(0, 3)}</Text>
                          <View style={[styles.dayBarContainer, { backgroundColor: palette.border }]}>
                            <View 
                              style={[
                                styles.dayBar,
                                { 
                                  width: `${((writingPatterns.dayCounts[day] || 0) / writingPatterns.totalEntries) * 100}%`,
                                  backgroundColor: palette.accent,
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
              </View>

              {/* Writing Analytics */}
              <View style={[styles.analyticsSection, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}>
                <Text style={[styles.analyticsTitle, { color: textMain }]}>Writing Analytics</Text>
                
                {writingAnalytics ? (
                  <View style={styles.analyticsGrid}>
                    <View style={styles.analyticsRow}>
                      <View style={styles.analyticItem}>
                        <Text style={[styles.analyticLabel, { color: textSub }]}>Total Words</Text>
                        <Text style={[styles.analyticValue, { color: palette.accent }]}>
                          {writingAnalytics.totalWords.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.analyticItem}>
                        <Text style={[styles.analyticLabel, { color: textSub }]}>Avg. per Entry</Text>
                        <Text style={[styles.analyticValue, { color: palette.accent }]}>
                          {writingAnalytics.averageWords}
                        </Text>
                      </View>
                    </View>

                    {writingAnalytics.timeStats && (
                      <View style={styles.timeAnalysis}>
                        <Text style={[styles.timeTitle, { color: textSub }]}>
                          Most active: {writingAnalytics.timeStats.mostActive}
                        </Text>
                        <View style={styles.timeBars}>
                          {Object.entries(writingAnalytics.timeStats.slots).map(([time, count]) => (
                            <View key={time} style={styles.timeBarItem}>
                              <Text style={[styles.timeLabel, { color: textSub, width: 60, textAlign: 'right' }]}>
                                {time}
                              </Text>
                              <View style={[styles.timeBarContainer, { backgroundColor: palette.border }]}>
                                <View 
                                  style={[
                                    styles.timeBar,
                                    { 
                                      width: `${(count / writingAnalytics.timeStats.mostActiveCount) * 100}%`,
                                      backgroundColor: palette.accent,
                                      opacity: Math.max(0.3, count / writingAnalytics.timeStats.mostActiveCount)
                                    }
                                  ]} 
                                />
                              </View>
                              <Text style={[styles.timeCount, { color: textSub }]}>{count}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptySubtitle, { color: textSub }]}>
                      Detailed analytics appear after 3 entries.
                    </Text>
                  </View>
                )}
              </View>

              {/* Mood Trends */}
              <View style={[styles.trendsSection, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}>
                <Text style={[styles.trendsTitle, { color: textMain }]}>Mood Statistics</Text>
                
                {moodStats.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyTitle, { color: textMain }]}>No Data</Text>
                    <Text style={[styles.emptySubtitle, { color: textSub }]}>
                      Start tracking moods to see trends.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.trendsContent}>
                    <View style={styles.summary}>
                      <Text style={[styles.summaryText, { color: textMain }]}>
                        {periodEntries.length} entries • {moodStats.length} moods
                      </Text>
                    </View>

                    {moodStats.map((stat) => (
                      <View key={stat.mood} style={[styles.statItem, { borderColor: palette.border }]}>
                        <View style={styles.statHeader}>
                          <Text style={[styles.moodName, { color: textMain }]}>
                            {stat.mood.charAt(0).toUpperCase() + stat.mood.slice(1)}
                          </Text>
                          <Text style={[styles.statCount, { color: palette.accent }]}>
                            {stat.count}
                          </Text>
                        </View>
                        <View style={[styles.percentageBar, { backgroundColor: palette.border }]}>
                          <View 
                            style={[
                              styles.percentageFill,
                              { width: `${stat.percentage}%`, backgroundColor: palette.accent }
                            ]} 
                          />
                        </View>
                        <Text style={[styles.percentageText, { color: textSub }]}>
                          {stat.percentage}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Weekly Recap Button */}
              <View style={styles.bottomRecapContainer}>
                <PremiumPressable
                  onPress={() => navigation.navigate('WeeklyRecap')}
                  haptic="light"
                  style={[
                    styles.recapButton,
                    { 
                      backgroundColor: palette.card,
                      borderColor: palette.accent,
                    }
                  ]}
                >
                  <Text style={[styles.recapButtonText, { color: palette.accent }]}>
                    View Weekly Recap
                  </Text>
                </PremiumPressable>
              </View>

            </View>
          </ScrollView>
        </Animated.View>
      )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  contentCard: { margin: 16, padding: 16, borderRadius: 24 },
  
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 4,
  },
  periodOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
  },

  insightsSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
  },
  insightsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  
  insightsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  insightItem: { alignItems: 'center', flex: 1 },
  insightLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  insightValue: { fontSize: 16, fontWeight: '700' },

  analyticsSection: { marginBottom: 24, padding: 16, borderRadius: 16 },
  analyticsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  analyticsGrid: { gap: 16 },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  analyticItem: { alignItems: 'center', flex: 1 },
  analyticLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  analyticValue: { fontSize: 16, fontWeight: '700' },

  timeAnalysis: { marginTop: 12 },
  timeTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  timeBars: { gap: 8 },
  timeBarItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeLabel: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  timeBarContainer: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  timeBar: { height: '100%', borderRadius: 3 },
  timeCount: { fontSize: 12, fontWeight: '600', width: 20 },

  trendsSection: { marginBottom: 24, padding: 16, borderRadius: 16 },
  trendsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  statItem: { marginBottom: 12 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  moodName: { fontSize: 14, fontWeight: '600' },
  statCount: { fontSize: 14, fontWeight: '700' },
  percentageBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  percentageFill: { height: '100%', borderRadius: 3 },
  percentageText: { fontSize: 11, fontWeight: '500' },

  emptyState: { padding: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', opacity: 0.7 },

  dayDistribution: { marginTop: 16 },
  distributionTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, textAlign: 'center', textTransform: 'uppercase' },
  daysGrid: { gap: 6 },
  dayItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayName: { fontSize: 11, fontWeight: '600', width: 30 },
  dayBarContainer: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  dayBar: { height: '100%', borderRadius: 2 },
  dayCount: { fontSize: 11, fontWeight: '600', width: 16 },

  bottomRecapContainer: { marginTop: 8 },
  recapButton: {
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  recapButtonText: { fontWeight: '700', fontSize: 15 },
});
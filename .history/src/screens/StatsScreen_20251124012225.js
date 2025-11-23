import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEntries } from '../stores/entriesStore';
import { useProgress } from '../stores/progressStore';
import { analyzeWritingAnalytics } from '../constants/writingAnalytics';
import { useTheme } from '../stores/themeStore';
import PremiumPressable from '../components/PremiumPressable';
import { analyzeMoodTrends, getMoodInsights } from '../utils/moodTrends';
import { analyzeWritingInsights, getWritingInsights } from '../utils/writingInsights';
import { analyzeMoodCorrelations, getMoodCorrelationSummary } from '../utils/moodAnalysis';

// Gratitude analytics helper
const analyzeGratitudePractice = (entries) => {
  const gratitudeEntries = entries.filter(entry => entry.isGratitude);
  const totalEntries = entries.length;
  
  if (gratitudeEntries.length === 0) return null;
  
  // Calculate gratitude frequency
  const gratitudePercentage = Math.round((gratitudeEntries.length / totalEntries) * 100);
  
  // Analyze mood patterns in gratitude entries vs regular entries
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
  
  // Find most common mood in gratitude entries
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

  // Calculate total weeks
  if (allEntries.length === 0) return null;
  const firstEntry = new Date(allEntries[allEntries.length - 1].date);
  const lastEntry = new Date(allEntries[0].date);
  const totalWeeks = Math.max(1, Math.ceil((lastEntry - firstEntry) / (7 * 24 * 60 * 60 * 1000)));
  
  // Find most frequent day
  const mostFrequentDay = Object.entries(dayCounts)
    .reduce((max, [day, count]) => count > dayCounts[max] ? day : max, Object.keys(dayCounts)[0]);
  
  const totalEntries = allEntries.length;
  const entriesPerWeek = (totalEntries / totalWeeks).toFixed(1);
  
  return { mostFrequentDay, totalEntries, entriesPerWeek, dayCounts };
};

export default function StatsScreen({ navigation, route }) {
const systemScheme = useColorScheme();
const { getCurrentTheme } = useTheme();
const currentTheme = getCurrentTheme(systemScheme);
const isDark = currentTheme === 'dark';
  // Get entries for analysis - ADD THIS SECTION
  const map = useEntries((s) => s.map);
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

    // Mood correlation analysis - THIS SHOULD COME AFTER entries IS DEFINED
  const moodAnalysis = useMemo(() => {
    return analyzeMoodCorrelations(entries);
  }, [entries]);

  const correlationSummary = useMemo(() => {
    return getMoodCorrelationSummary(entries);
  }, [entries]);

  const streak = useProgress((s) => s.streak);
  const level = useProgress((s) => s.level);
  const totalXP = useProgress((s) => s.totalXP);
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  
const writingPatterns = useMemo(() => analyzeWritingPatterns(entries), [entries]);
const writingAnalytics = useMemo(() => analyzeWritingAnalytics(entries), [entries]);
const gratitudeAnalytics = useMemo(() => analyzeGratitudePractice(entries), [entries]);
const moodTrends = useMemo(() => analyzeMoodTrends(entries, selectedPeriod), [entries, selectedPeriod]);
const moodInsights = useMemo(() => getMoodInsights(moodTrends), [moodTrends]);
const writingInsightsAnalysis = useMemo(() => analyzeWritingInsights(entries, selectedPeriod), [entries, selectedPeriod]);
const writingInsights = useMemo(() => getWritingInsights(writingInsightsAnalysis), [writingInsightsAnalysis]);

// Fade in when entries are available
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

    return entries.filter(entry => {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      return entryDate >= cutoffDate;
    });
  }, [entries, selectedPeriod]);

  // Calculate mood statistics
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

    // Convert to array and sort by frequency
    return Object.entries(stats)
      .map(([mood, count]) => ({
        mood,
        count,
        percentage: totalEntries > 0 ? Math.round((count / totalEntries) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [periodEntries]);

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
    const brand = '#6366F1';

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
        contentContainerStyle={styles.scrollContent}
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
                  selectedPeriod === period && styles.periodTextActive,
                  { 
                    color: selectedPeriod === period 
                      ? (isDark ? '#F9FAFB' : '#111827') 
                      : (isDark ? '#9CA3AF' : '#000000ff')
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
                  <Text style={[styles.insightLabel, { color: textSub }]}>
                    Total
                  </Text>
                  <Text style={[styles.insightValue, { color: '#22C55E' }]}>
                    {gratitudeAnalytics.totalGratitudeEntries}
                  </Text>
                </View>
                
                <View style={styles.insightItem}>
                  <Text style={[styles.insightLabel, { color: textSub }]}>
                    Of Entries
                  </Text>
                  <Text style={[styles.insightValue, { color: '#22C55E' }]}>
                    {gratitudeAnalytics.gratitudePercentage}%
                  </Text>
                </View>
                
                {gratitudeAnalytics.mostCommonGratitudeMood && (
                  <View style={styles.insightItem}>
                    <Text style={[styles.insightLabel, { color: textSub }]}>
                      Common Mood
                    </Text>
                    <Text style={[styles.insightValue, { color: '#22C55E' }]}>
                      {gratitudeAnalytics.mostCommonGratitudeMood}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.gratitudeInsights}>
                <Text style={[styles.gratitudeInsight, { color: isDark ? '#4ADE80' : '#16A34A' }]}>
                  ✨ Keep practicing gratitude for increased happiness
                </Text>
                <Text style={[styles.gratitudeInsight, { color: isDark ? '#4ADE80' : '#16A34A' }]}>
                  🌱 {gratitudeAnalytics.totalGratitudeEntries} moments of appreciation recorded
                </Text>
              </View>
            </View>
          )}

          {/* Writing Patterns */}
          <View style={[
            styles.insightsSection, 
            { 
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' 
            }
          ]}>
            <Text style={[styles.insightsTitle, { color: textMain }]}>
              Writing Patterns
            </Text>
            
            {writingPatterns ? (
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
            ) : (
             <View style={styles.emptyState}>
  <Text style={[styles.emptyTitle, { color: textMain }]}>No Patterns Yet</Text>
  <Text style={[styles.emptySubtitle, { color: textSub }]}>
    Write a few entries to discover your writing habits
  </Text>
</View>
            )}

      {/* Writing Patterns */}
<View style={[
  styles.insightsSection, 
  { 
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' 
  }
]}></View>


            
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
          </View>

          {/* Writing Analytics */}
          <View style={[
            styles.analyticsSection, 
            { 
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' 
            }
          ]}>
            <Text style={[styles.analyticsTitle, { color: textMain }]}>
              Writing Analytics
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
                    <Text style={[styles.analyticLabel, { color: textSub }]}>Avg. per Entry</Text>
                    <Text style={[styles.analyticValue, { color: '#6366F1' }]}>
                      {writingAnalytics.averageWords}
                    </Text>
                  </View>
                </View>

                {/* Entry Length */}
                <View style={styles.analyticsRow}>
                  <View style={styles.analyticItem}>
                    <Text style={[styles.analyticLabel, { color: textSub }]}>Longest Entry</Text>
                    <Text style={[styles.analyticValue, { color: '#6366F1' }]}>
                      {writingAnalytics.longestEntry.wordCount} words
                    </Text>
                  </View>
                  
                  {writingAnalytics.shortestEntry && (
                    <View style={styles.analyticItem}>
                      <Text style={[styles.analyticLabel, { color: textSub }]}>Shortest Entry</Text>
                      <Text style={[styles.analyticValue, { color: '#6366F1' }]}>
                        {writingAnalytics.shortestEntry.wordCount} words
                      </Text>
                    </View>
                  )}
                </View>

                {/* Writing Time Patterns */}
                {writingAnalytics.timeStats && (
                  <View style={styles.timeAnalysis}>
                    <Text style={[styles.timeTitle, { color: textSub }]}>
                      Most active: {writingAnalytics.timeStats.mostActive} 
                      ({writingAnalytics.timeStats.mostActiveCount} entries)
                    </Text>
                    <View style={styles.timeBars}>
                      {Object.entries(writingAnalytics.timeStats.slots).map(([time, count]) => (
                        <View key={time} style={styles.timeBarItem}>
                          <Text style={[styles.timeLabel, { color: textSub }]}>
                            {time}
                          </Text>
                          <View style={[styles.timeBarContainer, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                            <View 
                              style={[
                                styles.timeBar,
                                { 
                                  width: `${(count / writingAnalytics.timeStats.mostActiveCount) * 100}%`,
                                  backgroundColor: '#6366F1',
                                }
                              ]} 
                            />
                          </View>
                          <Text style={[styles.timeCount, { color: textSub }]}>
                            {count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Writing Consistency */}
                {writingAnalytics.consistency && (
                  <View style={styles.consistencySection}>
                    <View style={styles.consistencyHeader}>
                      <Text style={[styles.consistencyLabel, { color: textSub }]}>
                        Writing Consistency
                      </Text>
                      <Text style={[styles.consistencyScore, { color: '#6366F1' }]}>
                        {writingAnalytics.consistency.consistencyScore}%
                      </Text>
                    </View>
                    <Text style={[styles.consistencySub, { color: textSub }]}>
                      Avg. {writingAnalytics.consistency.averageGap} days between entries
                    </Text>
                  </View>
                )}
              </View>
            ) : (
             <View style={styles.emptyState}>
  <Text style={[styles.emptyTitle, { color: textMain }]}>Awaiting Insights</Text>
  <Text style={[styles.emptySubtitle, { color: textSub }]}>
    Complete 3+ entries to unlock detailed analytics
  </Text>
</View>
            )}
          </View>

          {/* Progress Stats */}
          <View style={[
            styles.progressSection, 
            { 
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' 
            }
          ]}>
            <View style={[
  styles.periodSelector,
  { backgroundColor: isDark ? 'rgba(55, 65, 81, 0.5)' : '#F3F4F6' }
]}></View>
            <View style={styles.progressRow}>
              <View style={styles.progressItem}>
                <Text style={[styles.progressLabel, { color: textSub }]}>Day Streak</Text>
                <Text style={[styles.progressValue, { color: '#6366F1' }]}>
                  {streak} day{streak === 1 ? '' : 's'}
                </Text>
              </View>
              
              <View style={styles.progressItem}>
                <Text style={[styles.progressLabel, { color: textSub }]}>Total XP</Text>
                <Text style={[styles.progressValue, { color: '#6366F1' }]}>
                  {totalXP}
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
                <Text style={[styles.xpText, { color: textSub }]}>Progress to Level {level + 1}</Text>
                <Text style={[styles.xpText, { color: textSub }]}>
                  {totalXP % 100}/100
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

          {/* Mood Trends Section */}
<View style={[
  styles.trendsSection, 
  { 
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' 
  }
]}>
  <Text style={[styles.trendsTitle, { color: textMain }]}>
    Mood Trends
  </Text>
  
  {moodTrends ? (
    <View style={styles.trendsContent}>
      {/* Mood Distribution */}
      <View style={styles.distributionSection}>
        <Text style={[styles.distributionTitle, { color: textSub }]}>
          Mood Distribution ({moodTrends.periodLabel})
        </Text>
        
        {moodTrends.moodStats.map((stat, index) => (
          <View key={stat.mood} style={styles.moodStatItem}>
            <View style={styles.moodStatHeader}>
              <Text style={[styles.moodName, { color: textMain }]}>
                {stat.mood.charAt(0).toUpperCase() + stat.mood.slice(1)}
              </Text>
              <Text style={[styles.moodPercentage, { color: '#6366F1' }]}>
                {stat.percentage}%
              </Text>
            </View>
            <View style={[styles.percentageBar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <View 
                style={[
                  styles.percentageFill,
                  { 
                    width: `${stat.percentage}%`,
                    backgroundColor: '#6366F1'
                  }
                ]} 
              />
            </View>
            <Text style={[styles.moodCount, { color: textSub }]}>
              {stat.count} time{stat.count !== 1 ? 's' : ''}
            </Text>
          </View>
        ))}
      </View>

{/* Mood Insights */}
{moodInsights.length > 0 && (
  <View style={styles.insightsSection}>
    <Text style={[styles.insightsTitle, { color: textSub }]}>
      Patterns & Insights
    </Text>
    {moodInsights.map((insight, index) => (
      <View 
        key={index} 
        style={[
          styles.insightItem,
          { 
            backgroundColor: isDark 
              ? 'rgba(99, 102, 241, 0.1)' 
              : 'rgba(99, 102, 241, 0.05)' 
          }
        ]}
      >
        <Text style={[styles.insightText, { color: textMain }]}>
          {insight.text}
        </Text>
      </View>
    ))}
  </View>
)}
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: textMain }]}>No Mood Data Yet</Text>
      <Text style={[styles.emptySubtitle, { color: textSub }]}>
        Tag moods in your entries to see trends and patterns
      </Text>
    </View>
  )}
</View>

        {/* Mood Correlation Analysis */}
        <View style={[
          styles.insightsSection, 
          { 
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' 
          }
        ]}>
          <Text style={[styles.insightsTitle, { color: textMain }]}>
            Mood Patterns
          </Text>
          
          {correlationSummary.totalMoodsTracked > 0 ? (
            <>
              {/* Stats Grid - matches your other stats sections */}
              <View style={styles.insightsGrid}>
                <View style={styles.insightItem}>
                  <Text style={[styles.insightLabel, { color: textSub }]}>
                    Different Moods
                  </Text>
                  <Text style={[styles.insightValue, { color: '#6366F1' }]}>
                    {correlationSummary.totalMoodsTracked}
                  </Text>
                </View>
                
                <View style={styles.insightItem}>
                  <Text style={[styles.insightLabel, { color: textSub }]}>
                    Most Common
                  </Text>
                  <Text style={[styles.insightValue, { color: '#6366F1' }]}>
                    {correlationSummary.mostCommonMood}
                  </Text>
                </View>
              </View>

              {/* Mood Insights - matches your other insight sections */}
              <View style={styles.distributionSection}>
                <Text style={[styles.distributionTitle, { color: textSub }]}>
                  Patterns
                </Text>
                {moodAnalysis.insights.map((insight, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.insightItem,
                      { 
                        backgroundColor: isDark 
                          ? 'rgba(99, 102, 241, 0.1)' 
                          : 'rgba(99, 102, 241, 0.05)' 
                      }
                    ]}
                  >
                    <Text style={[styles.insightText, { color: textMain }]}>
                      {insight}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Time Patterns - matches your other pattern sections */}
              <View style={styles.distributionSection}>
                <Text style={[styles.distributionTitle, { color: textSub }]}>
                  Time of Day Patterns
                </Text>
                {Object.entries(moodAnalysis.timeCorrelations).map(([time, data]) => (
                  <View 
                    key={time} 
                    style={[
                      styles.moodStatItem,
                      { 
                        backgroundColor: isDark 
                          ? 'rgba(30, 41, 59, 0.3)' 
                          : 'rgba(241, 245, 249, 0.5)' 
                      }
                    ]}
                  >
                    <View style={styles.moodStatHeader}>
                      <Text style={[styles.moodName, { color: textMain }]}>
                        {time.charAt(0).toUpperCase() + time.slice(1)}
                      </Text>
                      <Text style={[styles.moodPercentage, { color: '#6366F1' }]}>
                        Usually {data.dominantMood}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: textMain }]}>No Mood Patterns Yet</Text>
              <Text style={[styles.emptySubtitle, { color: textSub }]}>
                Write more entries with mood tags to see pattern analysis
              </Text>
            </View>
          )}
        </View>

{/* Writing Insights Section */}
<View style={[
  styles.insightsSection, 
  { 
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' 
  }
]}>
  <Text style={[styles.insightsMainTitle, { color: textMain }]}>
    Writing Insights
  </Text>
  
  {writingInsightsAnalysis ? (
    <View style={styles.insightsContent}>
      {/* Top Topics */}
      {writingInsightsAnalysis.topicStats.length > 0 && (
        <View style={styles.topicsSection}>
          <Text style={[styles.insightsSubtitle, { color: textSub }]}>
            Your Common Topics
          </Text>
          <View style={styles.topicsGrid}>
            {writingInsightsAnalysis.topicStats.slice(0, 4).map((topic, index) => (
              <View key={topic.topic} style={[
                styles.topicChip,
                { 
                  backgroundColor: isDark 
                    ? 'rgba(99, 102, 241, 0.15)' 
                    : 'rgba(99, 102, 241, 0.08)' 
                }
              ]}>
                <Text style={[styles.topicText, { color: '#6366F1' }]}>
                  {topic.topic.charAt(0).toUpperCase() + topic.topic.slice(1)}
                </Text>
                <Text style={[styles.topicPercentage, { color: '#6366F1' }]}>
                  {topic.percentage}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Writing Insights */}
      {writingInsights.length > 0 && (
        <View style={styles.writingInsightsList}>
          <Text style={[styles.insightsSubtitle, { color: textSub }]}>
            Personal Patterns
          </Text>
          {writingInsights.map((insight, index) => (
            <View 
              key={index} 
              style={[
                styles.writingInsightItem,
                { 
                  backgroundColor: isDark 
                    ? 'rgba(99, 102, 241, 0.1)' 
                    : 'rgba(99, 102, 241, 0.05)' 
                }
              ]}
            >
              <Text style={[styles.writingInsightText, { color: textMain }]}>
                {insight.text}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Writing Stats */}
      <View style={styles.writingStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6366F1' }]}>
            {writingInsightsAnalysis.totalEntries}
          </Text>
          <Text style={[styles.statLabel, { color: textSub }]}>
            Entries
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6366F1' }]}>
            {writingInsightsAnalysis.averageWords}
          </Text>
          <Text style={[styles.statLabel, { color: textSub }]}>
            Avg Words
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6366F1' }]}>
            {writingInsightsAnalysis.totalWords}
          </Text>
          <Text style={[styles.statLabel, { color: textSub }]}>
            Total Words
          </Text>
        </View>
      </View>
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: textMain }]}>No Writing Data</Text>
      <Text style={[styles.emptySubtitle, { color: textSub }]}>
        Write a few entries to unlock writing insights
      </Text>
    </View>
  )}
</View>

{/* Statistics */}
<View style={[
  styles.statsSection, 
  { 
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' 
  }
]}>
  <Text style={[styles.statsTitle, { color: textMain }]}>
    Mood Statistics
  </Text>
  
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
      <View style={styles.summary}>
        <Text style={[styles.summaryText, { color: textMain }]}>
          {periodEntries.length} entries • {moodStats.length} moods
        </Text>
      </View>

      

{moodStats.map((stat, index) => (
  <View 
    key={stat.mood}
    style={[styles.statItem, { borderColor }]}
  >
    <View style={styles.statHeader}>
      <Text style={[styles.moodName, { color: textMain }]}>
        {stat.mood.charAt(0).toUpperCase() + stat.mood.slice(1)}
      </Text>
      <Text style={[styles.statCount, { color: '#6366F1' }]}>
        {stat.count} time{stat.count !== 1 ? 's' : ''}
      </Text>
    </View>
                    
    <View style={styles.percentageBar}>
      <View 
        style={[
          styles.percentageFill,
          { 
            width: `${stat.percentage}%`,
            backgroundColor: '#6366F1'
          }
        ]} 
      />
    </View>
                    
    <Text style={[styles.percentageText, { color: textSub }]}>
      {stat.percentage}% of entries
    </Text>
  </View>  
))}

    </>
  )}
</View>

{/* Weekly Recap Button - At the very bottom */}
<View style={styles.bottomRecapContainer}>
  <PremiumPressable
    onPress={() => navigation.navigate('WeeklyRecap')}
    haptic="light"
    style={[
      styles.recapButton,
      { 
        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
        borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'
      }
    ]}
  >
    <Text style={[
      styles.recapButtonText,
      { color: '#6366F1' }
    ]}>
      View Weekly Recap
    </Text>
  </PremiumPressable>
</View>
</View>
</ScrollView>
</Animated.View>
</LinearGradient>
);
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentCard: {
    margin: 16,
    padding: 16,
    borderRadius: 24,
  },
periodSelector: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 20,
  borderRadius: 16, // Increased from 12
  padding: 6, // Increased from 4
},
periodOption: {
  flex: 1,
  alignItems: 'center',
  paddingVertical: 10, // Increased from 8
  paddingHorizontal: 4, // Add horizontal padding
  borderRadius: 12, // Increased from 8
  marginHorizontal: 2, // Add some horizontal margin
},
  periodOptionActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
periodText: {
  fontSize: 13, // Slightly larger font
  fontWeight: '600',
  paddingHorizontal: 4, // Add padding around text
},
  statsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
emptyState: {
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 40,
},
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyTitle: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 8,
  textAlign: 'center',
},
emptySubtitle: {
  fontSize: 14,
  textAlign: 'center',
  lineHeight: 20,
  maxWidth: 200,
},
  summary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
      paddingHorizontal: 4, // Add some horizontal padding

  },
  moodName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  percentageBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressItem: {
    alignItems: 'center',
    flex: 1,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  xpContainer: {
    gap: 6,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  xpBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpProgress: {
    height: '100%',
    borderRadius: 3,
  },
  insightsSection: {
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
insightsGrid: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 20,
  gap: 8,
  paddingHorizontal: 0,
},
insightItem: {
  alignItems: 'center',
  flex: 1,
  minWidth: 0, // Allow flex to work properly
  paddingHorizontal: 4,
},
insightLabel: {
  fontSize: 12,
  fontWeight: '600',
  marginBottom: 6,
  textAlign: 'center',
},
insightValue: {
  fontSize: 18,
  fontWeight: '700',
  textAlign: 'center',
},
  noInsights: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  dayDistribution: {
    marginTop: 8,
  },
  distributionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysGrid: {
    gap: 8,
  },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  dayBarContainer: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  dayBar: {
    height: '100%',
    borderRadius: 2,
  },
  dayCount: {
    fontSize: 11,
    fontWeight: '600',
    width: 15,
    textAlign: 'left',
  },
  analyticsSection: {
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 12,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  analyticsGrid: {
    gap: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticItem: {
    alignItems: 'center',
    flex: 1,
  },
  analyticLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  analyticValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  noAnalytics: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  timeAnalysis: {
    marginTop: 8,
  },
  timeTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeBars: {
    gap: 6,
  },
  timeBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 70,
    textAlign: 'right',
    textTransform: 'capitalize',
  },
  timeBarContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timeBar: {
    height: '100%',
    borderRadius: 3,
  },
  timeCount: {
    fontSize: 11,
    fontWeight: '600',
    width: 20,
    textAlign: 'left',
  },
  consistencySection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  consistencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  consistencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consistencyScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  consistencySub: {
    fontSize: 11,
    fontWeight: '500',
  },
trendsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  trendsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  trendsContent: {
    gap: 20,
  },
  distributionSection: {
    gap: 12,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moodStatItem: {
    gap: 6,
  },
  moodStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodName: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  moodPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  percentageBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 3,
  },
  moodCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  insightsSection: {
    gap: 12,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightItem: {
    padding: 12,
    borderRadius: 8,
    // Remove the backgroundColor from here since it needs to be dynamic
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
  },
insightsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  insightsMainTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  insightsContent: {
    gap: 20,
  },
  insightsSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  topicsSection: {
    gap: 12,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  topicText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  topicPercentage: {
    fontSize: 11,
    fontWeight: '700',
  },
  writingInsightsList: {
    gap: 8,
  },
  writingInsightItem: {
    padding: 12,
    borderRadius: 8,
  },
  writingInsightText: {
    fontSize: 13,
    lineHeight: 18,
  },
  writingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
    statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    marginHorizontal: 6,
  },
  insightsContainer: {
    marginBottom: 20,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  insightCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timePatternsContainer: {
    marginBottom: 20,
  },
  timePatternCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  moodLabel: {
    fontSize: 14,
  },
  emptyState: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  recapButton: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  recapButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  bottomRecapContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
    gratitudeInsights: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 197, 94, 0.2)',
  },
  gratitudeInsight: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
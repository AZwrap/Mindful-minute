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
import { SafeAreaView } from 'react-native-safe-area-context';

// Navigation
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { TabParamList } from '../navigation/TabNavigator';
import { 
  BarChart as BarChartIcon, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Flame, 
  Type, 
  Smile,
  Zap
} from 'lucide-react-native';

// Stores & Types
import { useEntriesStore, JournalEntry } from "../stores/entriesStore";
import { useProgress } from '../stores/progressStore';
import { useTheme } from '../stores/themeStore';
import { useSharedPalette } from '../hooks/useSharedPalette';

// Logic & Components
import { analyzeWritingAnalytics } from '../constants/writingAnalytics';
import PremiumPressable from '../components/PremiumPressable';
import EmptyState from '../components/EmptyState';
import { analyzeMoodTrends, getMoodInsights } from '../utils/moodTrends';
import { analyzeWritingInsights, getWritingInsights } from '../utils/writingInsights';
import { analyzeMoodCorrelations, getMoodCorrelationSummary } from '../utils/moodAnalysis';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Stats'>,
  NativeStackScreenProps<RootStackParamList>
>;

type PeriodType = 'week' | 'month' | 'all';

interface GratitudeAnalytics {
  totalGratitudeEntries: number;
  gratitudePercentage: number;
  mostCommonGratitudeMood?: string;
  gratitudeMoods: Record<string, number>;
  regularMoods: Record<string, number>;
  hasGratitudeData: boolean;
}

interface WritingPatterns {
  mostFrequentDay: string;
  totalEntries: number;
  entriesPerWeek: string;
  dayCounts: Record<string, number>;
}

interface MoodStat {
  mood: string;
  count: number;
  percentage: number;
}

interface StatsDataState {
  entries: JournalEntry[];
  moodAnalysis: any; // Can refine later with strict mood analysis types
  correlationSummary: any;
  gratitudeReport: any;
  writingPatterns: WritingPatterns | null;
  writingAnalytics: any; // Can refine based on analyzeWritingAnalytics return
  gratitudeAnalytics: GratitudeAnalytics | null;
  moodTrends: any;
  moodInsights: any[];
  writingInsightsAnalysis: any;
  writingInsights: any[];
  periodEntries: JournalEntry[];
  moodStats: MoodStat[];
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
const analyzeGratitudePractice = (entries: JournalEntry[]): GratitudeAnalytics | null => {
  const gratitudeEntries = entries.filter(entry => entry.isGratitude);
  const totalEntries = entries.length;
  
  if (gratitudeEntries.length === 0) return null;
  
  const gratitudePercentage = Math.round((gratitudeEntries.length / totalEntries) * 100);
  
  const gratitudeMoods: Record<string, number> = {};
  const regularMoods: Record<string, number> = {};
  
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

const getDayName = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// --- NEW HELPER: Recent Consistency ---
const getRecentConsistency = (entries: JournalEntry[]) => {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0]; // YYYY-MM-DD
  });

  const entrySet = new Set(entries.map(e => e.date));

  return last7Days.map(date => ({
    date,
    dayLabel: new Date(date).toLocaleDateString('en-US', { weekday: 'narrow' }), // M, T, W...
    hasEntry: entrySet.has(date),
    isToday: date === new Date().toISOString().split('T')[0]
  }));
};

// --- NEW HELPER: Estimate Time (30 words/min avg on mobile) ---
const estimateMindfulMinutes = (totalWords: number) => {
  return Math.max(1, Math.round(totalWords / 30));
};

const analyzeWritingPatterns = (allEntries: JournalEntry[]): WritingPatterns | null => {
  if (!allEntries || !allEntries.length) return null;

  const dayCounts: Record<string, number> = {};
  allEntries.forEach(entry => {
    const day = getDayName(entry.date);
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  if (allEntries.length === 0) return null;
  const firstEntry = new Date(allEntries[allEntries.length - 1].date);
  const lastEntry = new Date(allEntries[0].date);
  const totalWeeks = Math.max(1, Math.ceil((lastEntry.getTime() - firstEntry.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  
  const mostFrequentDay = Object.entries(dayCounts)
    .reduce((max, [day, count]) => count > (dayCounts[max] || 0) ? day : max, Object.keys(dayCounts)[0] || '');
  
  const totalEntries = allEntries.length;
  const entriesPerWeek = (totalEntries / totalWeeks).toFixed(1);
  
  return { mostFrequentDay, totalEntries, entriesPerWeek, dayCounts };
};

const generateGratitudeReport = (entries: JournalEntry[], gratitudeStreak: number, totalGratitudeEntries: number) => {
  const recentEntries = entries.slice(0, 14);
  const gratitudeEntries = recentEntries.filter(entry => entry.isGratitude);
  const regularEntries = recentEntries.filter(entry => !entry.isGratitude);
  
  if (gratitudeEntries.length === 0) return null;
  
  const gratitudeMoods: Record<string, number> = {};
  const regularMoods: Record<string, number> = {};
  
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
  ).length / (Object.keys(gratitudeMoods).length || 1) * 100;
  
  const regularPositivity = Object.keys(regularMoods).filter(mood => 
    positiveMoods.includes(mood.toLowerCase())
  ).length / (Object.keys(regularMoods).length || 1) * 100;
  
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

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
// Reusable Bento Card
const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  color, 
  style, 
  bg,
  subLabel 
}: any) => (
  <View style={[styles.bentoCard, { backgroundColor: bg }, style]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[styles.cardLabel, { color: color }]}>{label}</Text>
    </View>
    <View>
      <Text style={[styles.cardValue, { color: 'white' }]}>{value}</Text>
      {subLabel && <Text style={styles.cardSub}>{subLabel}</Text>}
    </View>
  </View>
);

export default function StatsScreen({ route, navigation }: Props) {  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
  const palette = useSharedPalette();

  // Store Hooks
  const map = useEntriesStore((s) => s.entries);
  const gratitudeStreak = useProgress((s) => s.streak); // Assuming basic streak is gratitude for now, or add specific field
  const totalGratitudeEntries = useProgress((s) => s.totalEntries); 

  // UI State
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const [isReady, setIsReady] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');

// --- 1. MEMOIZED ANALYTICS (Heavy calculations) ---
  const statsData = useMemo(() => {
    const sortedEntries = Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));

return {
      entries: sortedEntries,
      consistency: getRecentConsistency(sortedEntries), // New
      writingPatterns: analyzeWritingPatterns(sortedEntries),
writingAnalytics: analyzeWritingAnalytics(sortedEntries),
      // NEW: Calculate time-of-day frequency locally
      timeBreakdown: (() => {
        const counts = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
        sortedEntries.forEach(e => {
          // Fallback to date string if createdAt is missing, assuming standard ISO format
          const d = e.createdAt ? new Date(e.createdAt) : new Date(e.date);
          const h = d.getHours();
          if (h >= 5 && h < 12) counts.Morning++;
          else if (h >= 12 && h < 17) counts.Afternoon++;
          else if (h >= 17 && h < 21) counts.Evening++;
          else counts.Night++;
        });
        return counts;
      })(),
      gratitudeAnalytics: analyzeGratitudePractice(sortedEntries),
      moodAnalysis: analyzeMoodCorrelations(sortedEntries),
      correlationSummary: getMoodCorrelationSummary(sortedEntries),
      gratitudeReport: generateGratitudeReport(sortedEntries, gratitudeStreak, totalGratitudeEntries),
    };
  }, [map, gratitudeStreak, totalGratitudeEntries]);

  // --- 2. FILTERED STATE ---
  const [displayData, setDisplayData] = useState({
    periodEntries: [] as JournalEntry[],
    moodTrends: null as any,
    moodInsights: [] as any[],
    writingInsightsAnalysis: null as any,
    writingInsights: [] as any[],
    moodStats: [] as MoodStat[],
  });

  // Trigger loading animation when data is ready
  useEffect(() => {
    if (statsData.entries) {
      setIsReady(true);
      Animated.timing(contentFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [statsData]);

  // Filter Data Effect
  useEffect(() => {
    if (!isReady) return;

    let cutoffDate = new Date(0);
    if (selectedPeriod === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        cutoffDate = d;
    }
    if (selectedPeriod === 'month') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        cutoffDate = d;
    }

    const _periodEntries = selectedPeriod === 'all' 
      ? statsData.entries 
      : statsData.entries.filter(e => new Date(e.date + 'T00:00:00') >= cutoffDate);

    // Calculate Mood Stats for period
    const _moodStats: Record<string, number> = {};
    let total = 0;
    _periodEntries.forEach(e => {
      if (e.moodTag?.value) {
        const m = e.moodTag.value;
        _moodStats[m] = (_moodStats[m] || 0) + 1;
        total++;
      }
    });

    const _moodStatsArray: MoodStat[] = Object.entries(_moodStats)
      .map(([m, c]) => ({ 
        mood: m, 
        count: c, 
        percentage: total > 0 ? Math.round((c/total)*100) : 0 
      }))
      .sort((a, b) => b.count - a.count);

    setDisplayData({
      periodEntries: _periodEntries,
      moodTrends: analyzeMoodTrends(statsData.entries, selectedPeriod),
      moodInsights: getMoodInsights(analyzeMoodTrends(statsData.entries, selectedPeriod)),
      writingInsightsAnalysis: analyzeWritingInsights(statsData.entries, selectedPeriod),
      writingInsights: getWritingInsights(analyzeWritingInsights(statsData.entries, selectedPeriod)),
      moodStats: _moodStatsArray
    });

  }, [selectedPeriod, isReady, statsData]);

  const { writingPatterns, writingAnalytics, gratitudeAnalytics } = statsData;
  const { moodStats, periodEntries } = displayData;

  const textMain = palette.text;
  const textSub = palette.subtleText;

  return (
    <LinearGradient
      colors={[palette.bg, palette.bg]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
<View style={{ padding: 16 }}>
              
              {/* Period Selector */}
              <View style={styles.periodSelector}>
                {(['week', 'month', 'all'] as const).map((period) => (
                  <PremiumPressable
                    key={period}
                    onPress={() => setSelectedPeriod(period)}
                    haptic="light"
                    style={[
                      styles.periodOption,
                      { backgroundColor: selectedPeriod === period ? palette.accent : 'transparent' }
                    ]}
                  >
                    <Text style={[
                      styles.periodText,
                      { color: selectedPeriod === period ? palette.accentText : textSub }
                    ]}>
                      {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'All Time'}
                    </Text>
                  </PremiumPressable>
                ))}
              </View>

{/* BENTO GRID */}
{(!writingPatterns || writingPatterns.totalEntries === 0) ? (
                <EmptyState
                  icon={BarChartIcon}
                  title="Unlock Your Insights"
                  message="Write at least one entry to start seeing your streaks, writing patterns, and mood trends here."
style={{ marginTop: 20 }}
                />
              ) : (
              <View style={styles.bentoGrid}>
                
                {/* ROW 0: AI Insight Card */}
                {statsData.moodAnalysis?.insights?.[0] && (
                  <View style={[styles.bentoCard, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: palette.accent, borderWidth: 1 }]}>
                    <View style={styles.bentoHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.bentoIcon, { backgroundColor: palette.accent }]}>
                          <Zap size={20} color="white" />
                        </View>
                        <Text style={[styles.bentoLabel, { color: palette.accent, fontWeight: '700', marginTop: 0 }]}>
                          AI INSIGHT
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.bentoValue, { color: textMain, fontSize: 18, lineHeight: 26, fontWeight: '500' }]}>
                      "{statsData.moodAnalysis.insights[0]}"
                    </Text>
                  </View>
                )}

                {/* ROW 1: Streak & Total Entries */}
                <View style={styles.bentoRow}>
                  {/* Streak Card */}
                  <View style={[styles.bentoCard, { flex: 1, backgroundColor: palette.card }]}>
                    <View style={styles.bentoHeader}>
                      <View style={[styles.bentoIcon, { backgroundColor: '#F59E0B20' }]}>
                        <Flame size={20} color="#F59E0B" />
                      </View>
                    </View>
                    <View>
                      <Text style={[styles.bentoValue, { color: textMain }]}>{gratitudeStreak}</Text>
                      <Text style={[styles.bentoLabel, { color: textMain }]}>Current Streak</Text>
                    </View>
                  </View>

                  {/* Entries Card */}
                  <View style={[styles.bentoCard, { flex: 1, backgroundColor: palette.card }]}>
                    <View style={styles.bentoHeader}>
                      <View style={[styles.bentoIcon, { backgroundColor: palette.accent + '20' }]}>
                        <Type size={20} color={palette.accent} />
                      </View>
                    </View>
                    <View>
                      <Text style={[styles.bentoValue, { color: textMain }]}>
                        {writingPatterns?.totalEntries || 0}
                      </Text>
                      <Text style={[styles.bentoLabel, { color: textMain }]}>Total Entries</Text>
                    </View>
                  </View>
                </View>

                {/* ROW 2: Gratitude Overview (Wide) */}
                {gratitudeAnalytics?.hasGratitudeData && (
                  <View style={[styles.bentoCard, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={[styles.bentoLabel, { color: isDark ? '#A7F3D0' : '#166534', marginTop: 0 }]}>
                          GRATITUDE PRACTICE
                        </Text>
                        <Text style={[styles.bentoValue, { color: isDark ? '#ECFDF5' : '#14532D', fontSize: 32 }]}>
                          {gratitudeAnalytics.gratitudePercentage}%
                        </Text>
                        <Text style={[styles.bentoSub, { color: isDark ? '#A7F3D0' : '#166534' }]}>
                          of your entries express gratitude
                        </Text>
                      </View>
                      <View style={[styles.bentoIcon, { backgroundColor: isDark ? '#10B98130' : '#22C55E20', width: 48, height: 48 }]}>
                        <Smile size={24} color={isDark ? '#34D399' : '#15803D'} />
                      </View>
                    </View>
                  </View>
                )}

{/* ROW 3: Stats (Mood + Time) */}
                <View style={styles.bentoRow}>
                  <View style={[styles.bentoCard, { flex: 1, backgroundColor: palette.card }]}>
                    <Text style={[styles.bentoLabel, { color: textSub, marginTop: 0 }]}>Top Mood</Text>
                    <Text 
                      style={[styles.bentoValue, { color: palette.accent, fontSize: 22, textTransform: 'capitalize' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {moodStats[0]?.mood || '—'}
                    </Text>
                  </View>

                  <View style={[styles.bentoCard, { flex: 1, backgroundColor: palette.card }]}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:4}}>
                      <Clock size={14} color={textSub} />
                      <Text style={[styles.bentoLabel, { color: textSub, marginTop: 0 }]}>Mindful Time</Text>
                    </View>
                    <Text style={[styles.bentoValue, { color: textMain }]}>
                      {estimateMindfulMinutes(writingAnalytics?.totalWords || 0)}
                      <Text style={{fontSize: 14, fontWeight:'500', color: textSub}}> mins</Text>
                    </Text>
                  </View>
                </View>

                {/* ROW 4: Consistency Strip (Last 7 Days) - Full Width */}
                <View style={[styles.bentoCard, { backgroundColor: palette.card, marginTop: 12 }]}>
                  <Text style={[styles.bentoLabel, { color: textSub, marginTop: 0 }]}>Last 7 Days</Text>
                  <View style={styles.consistencyRow}>
                    {statsData.consistency.map((day: any) => (
                      <View key={day.date} style={{ alignItems: 'center', gap: 6, flex: 1 }}> 
                        <View 
                          style={[
                            styles.consistencyDot,
                            { 
                              backgroundColor: day.hasEntry ? palette.accent : (isDark ? '#334155' : '#E2E8F0'),
                              borderColor: day.isToday ? palette.text : 'transparent',
                              borderWidth: day.isToday ? 1 : 0
                            }
                          ]}
                        >
                          {day.hasEntry && <View style={{width: 4, height: 4, borderRadius: 2, backgroundColor: 'white'}} />}
                        </View>
                        <Text style={{ fontSize: 10, color: day.isToday ? palette.text : textSub, fontWeight: '600' }}>
                          {day.dayLabel}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* ROW 4: Writing Schedule Chart */}
                {writingPatterns && (
                  <View style={[styles.bentoCard, { backgroundColor: palette.card, marginTop: 12 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.bentoLabel, { color: textSub, marginTop: 0 }]}>WRITING SCHEDULE</Text>
                      <Calendar size={16} color={textSub} />
                    </View>
                    
                    <View style={styles.dayDistribution}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                        const count = writingPatterns.dayCounts[day] || 0;
                        const max = Math.max(...Object.values(writingPatterns.dayCounts));
                        const isTopDay = day === writingPatterns.mostFrequentDay;
                        
                        return (
                          <View key={day} style={styles.dayItem}>
                            <Text style={[styles.dayName, { color: isTopDay ? palette.accent : textSub }]}>
                              {day.substring(0, 3)}
                            </Text>
                            <View style={[styles.dayBarContainer, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                              <Animated.View 
                                style={[
                                  styles.dayBar, 
                                  { 
                                    width: `${max > 0 ? (count / max) * 100 : 0}%`,
                                    backgroundColor: isTopDay ? palette.accent : (count > 0 ? palette.text + '60' : 'transparent') 
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.dayCount, { color: textMain }]}>{count}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
{/* ROW 5: Productive Hours (Uses existing unused styles) */}
                <View style={[styles.bentoCard, { backgroundColor: palette.card, marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.bentoLabel, { color: textSub, marginTop: 0 }]}>PRODUCTIVE HOURS</Text>
                    <Clock size={16} color={textSub} />
                  </View>

                  <View style={styles.timeAnalysis}>
                    {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => {
                      // @ts-ignore - inferred type safety
                      const count = statsData.timeBreakdown[time] || 0;
                      const max = Math.max(...Object.values(statsData.timeBreakdown));
                      
                      return (
                        <View key={time} style={styles.timeBarItem}>
                          <Text style={[styles.timeLabel, { color: textSub, width: 70 }]}>{time}</Text>
                          <View style={[styles.timeBarContainer, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                            <Animated.View 
                              style={[
                                styles.timeBar, 
                                { 
                                  width: `${max > 0 ? (count / max) * 100 : 0}%`,
                                  backgroundColor: count > 0 ? palette.accent : 'transparent'
                                }
                              ]} 
                            />
                          </View>
                          <Text style={[styles.timeCount, { color: textMain }]}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
              )}

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
  // Bento Grid Layout
  bentoGrid: { gap: 12 },
  bentoRow: { flexDirection: 'row', gap: 12 },
  bentoCol: { flex: 1, gap: 12 },
  bentoCard: {
    padding: 16,
    borderRadius: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bentoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    opacity: 0.7,
  },
  bentoValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  bentoSub: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
    marginTop: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 6,
    marginTop: 12,
  },
consistencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    height: 60, 
  },
  consistencyDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartBar: {
    flex: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
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
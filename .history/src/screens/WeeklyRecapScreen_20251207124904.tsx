import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { ChevronLeft, ChevronRight, Lightbulb, TrendingUp, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/RootStack';
import { useEntriesStore } from '../stores/entriesStore';
import { useTheme } from '../stores/themeStore';
import PremiumPressable from '../components/PremiumPressable';
import { generateWeeklyRecap, getPreviousWeekBoundaries, getWeekBoundaries } from '../utils/weeklyRecap';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type Props = NativeStackScreenProps<RootStackParamList, 'WeeklyRecap'>;

interface RecapStats {
  totalEntries: number;
  totalWords: number;
  averageWords: number;
  mostCommonMood: string | null;
  moodFrequency: Record<string, number>;
  insights: string[];
}

interface WeeklyRecapData {
  hasData: boolean;
  message: string;
  stats: RecapStats;
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function WeeklyRecapScreen({ navigation }: Props) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';

  // Store Data
  const map = useEntriesStore((s) => s.entries);
  const entries = useMemo(() => {
    return Object.entries(map || {})
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, entry]) => ({ date, ...entry }));
  }, [map]);

  // Local State
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'previous'>('current');

  const weekBoundaries = selectedWeek === 'current' 
    ? getWeekBoundaries() 
    : getPreviousWeekBoundaries();

  const recap = useMemo(() => {
    // Cast the result to our Interface to ensure we access properties safely
    return generateWeeklyRecap(entries, weekBoundaries.start, weekBoundaries.end) as WeeklyRecapData;
  }, [entries, weekBoundaries]);

  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B', '#334155'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
    },
  };

  const currentGradient = gradients[currentTheme as keyof typeof gradients] || gradients.light;
  const textMain = isDark ? '#E5E7EB' : '#0F172A';
  const textSub = isDark ? '#CBD5E1' : '#334155';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.contentCard}>
          
{/* Minimal Week Header */}
          <View style={styles.headerContainer}>
            <View style={styles.weekRow}>
              <PremiumPressable 
                onPress={() => setSelectedWeek('previous')} 
                hitSlop={20}
                style={{ opacity: selectedWeek === 'previous' ? 0.5 : 1 }}
              >
                <ChevronLeft size={24} color={textMain} />
              </PremiumPressable>

              <View style={styles.headerTextContainer}>
                <Text style={[styles.headerTitle, { color: textMain }]}>
                  {selectedWeek === 'current' ? 'This Week' : 'Last Week'}
                </Text>
                <Text style={[styles.headerDate, { color: textSub }]}>
                  {formatDate(weekBoundaries.start)} - {formatDate(weekBoundaries.end)}
                </Text>
              </View>

              <PremiumPressable 
                onPress={() => setSelectedWeek('current')} 
                hitSlop={20}
                style={{ opacity: selectedWeek === 'current' ? 0.5 : 1 }}
              >
                <ChevronRight size={24} color={textMain} />
              </PremiumPressable>
            </View>
          </View>

          {recap.hasData ? (
            <>
              {/* Main Recap Message */}
              <View style={[
                styles.recapCard,
                { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)' }
              ]}>
                <Text style={[styles.recapMessage, { color: textMain }]}>
                  {recap.message}
                </Text>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={[
                  styles.statCard,
                  { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.6)' }
                ]}>
                  <Text style={[styles.statValue, { color: '#6366F1' }]}>
                    {recap.stats.totalEntries}
                  </Text>
                  <Text style={[styles.statLabel, { color: textSub }]}>
                    Entries
                  </Text>
                </View>

                <View style={[
                  styles.statCard,
                  { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.6)' }
                ]}>
                  <Text style={[styles.statValue, { color: '#6366F1' }]}>
                    {recap.stats.totalWords}
                  </Text>
                  <Text style={[styles.statLabel, { color: textSub }]}>
                    Total Words
                  </Text>
                </View>

                <View style={[
                  styles.statCard,
                  { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.6)' }
                ]}>
                  <Text style={[styles.statValue, { color: '#6366F1' }]}>
                    {recap.stats.averageWords}
                  </Text>
                  <Text style={[styles.statLabel, { color: textSub }]}>
                    Avg. Words
                  </Text>
                </View>
              </View>

              {/* Mood Distribution */}
              {recap.stats.mostCommonMood && (
                <View style={[
                  styles.section,
                  { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.6)' }
                ]}>
                  <Text style={[styles.sectionTitle, { color: textMain }]}>
                    Mood Summary
                  </Text>
                  <Text style={[styles.moodText, { color: textSub }]}>
                    Most common: {recap.stats.mostCommonMood}
                  </Text>
                  <View style={styles.moodChips}>
                    {Object.entries(recap.stats.moodFrequency).map(([mood, count]) => (
                      <View 
                        key={mood}
                        style={[
                          styles.moodChip,
                          { 
                            backgroundColor: isDark 
                              ? 'rgba(99, 102, 241, 0.15)' 
                              : 'rgba(99, 102, 241, 0.08)' 
                          }
                        ]}
                      >
                        <Text style={[styles.moodChipText, { color: '#6366F1' }]}>
                          {mood} ({count})
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

{/* Insights with Icons */}
              {recap.stats.insights.length > 0 && (
                <View style={[
                  styles.section,
                  { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.6)' }
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Lightbulb size={20} color="#F59E0B" /> 
                    <Text style={[styles.sectionTitle, { color: textMain, marginBottom: 0 }]}>
                      Weekly Insights
                    </Text>
                  </View>
                  
                  {recap.stats.insights.map((insight, index) => (
                    <View 
                      key={index}
                      style={[
                        styles.insightItem,
                        { 
                          backgroundColor: 'transparent',
                          borderLeftWidth: 3,
                          borderLeftColor: index === 0 ? '#F59E0B' : (index === 1 ? '#6366F1' : '#10B981'),
                          paddingLeft: 12,
                          paddingVertical: 4
                        }
                      ]}
                    >
                      <Text style={[styles.insightText, { color: textMain, fontStyle: 'italic' }]}>
                        "{insight}"
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            /* Empty State */
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: textMain }]}>
                No Data This Week
              </Text>
              <Text style={[styles.emptySubtitle, { color: textSub }]}>
                Start journaling to see your weekly summary here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
contentCard: {
    marginTop: 20, // Reduced top margin
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 24,
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 16,
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  weekOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  weekOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weekRange: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
recapCard: {
    padding: 24, // Increased padding
    borderRadius: 20,
    marginBottom: 20,
  },
  recapMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
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
    marginHorizontal: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  moodText: {
    fontSize: 14,
    marginBottom: 8,
  },
  moodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moodChipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
insightItem: {
    marginBottom: 12, // More space between insights
  },
insightText: {
    fontSize: 15, // Slightly larger
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
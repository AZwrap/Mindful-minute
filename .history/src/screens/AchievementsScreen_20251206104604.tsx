import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProgress } from '../stores/progressStore';
import { useTheme } from '../stores/themeStore';
import { RootStackParamList } from '../navigation/RootStack';
import { useSharedPalette } from '../hooks/useSharedPalette';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;

type TierType = 'bronze' | 'silver' | 'gold' | 'platinum';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: TierType;
  icon?: string;
}

interface MasteryProgress {
  progress: number;
  total: number;
  unlocked: boolean;
}

interface AchievementsData {
  unlocked: Achievement[];
  allAchievements: Record<string, Achievement>;
  mastery: Record<string, MasteryProgress>;
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function AchievementsScreen({ navigation }: Props) {
  const systemScheme = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(systemScheme);
  const isDark = currentTheme === 'dark';
const palette = useSharedPalette();

  // FIX: Properly subscribe to state changes so the screen re-renders when you unlock something
  const unlockedIds = useProgress((s) => s.unlockedIds);
  const streak = useProgress((s) => s.streak);
  const totalEntries = useProgress((s) => s.totalEntries);

  // Re-calculate achievements whenever the state changes
  const achievementsData = React.useMemo(() => {
    return useProgress.getState().getAchievements();
  }, [unlockedIds, streak, totalEntries]);

  const gradients = {
    dark: {
      primary: ['#0F172A', '#1E293B', '#334155'],
    },
    light: {
      primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
    },
  };

  const currentGradient = gradients[currentTheme as keyof typeof gradients] || gradients.light;

  const categories = {
    consistency: { name: 'Consistency', color: '#10B981' },
    depth: { name: 'Writing Depth', color: '#6366F1' },
    range: { name: 'Emotional Range', color: '#8B5CF6' },
    mindfulness: { name: 'Mindfulness', color: '#F59E0B' },
    patterns: { name: 'Writing Patterns', color: '#EF4444' },
    gratitude: { name: 'Gratitude Practice', color: '#22C55E' }
  };

  const getTierColor = (tier: TierType | string) => {
    switch(tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      default: return '#6366F1';
    }
  };

  return (
    <LinearGradient
      colors={currentGradient.primary}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.contentCard}>
            <Text style={[styles.title, { color: palette.text }]}>
              Achievements
            </Text>
            <Text style={[styles.subtitle, { color: palette.subtleText }]}>
              {achievementsData.unlocked.length} of {Object.keys(achievementsData.allAchievements).length} unlocked
            </Text>

            {/* MASTERY SECTION */}
            <View style={[styles.masterySection, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)' }]}>
              <Text style={[styles.masteryTitle, { color: palette.text }]}>Mastery Progress</Text>
              <View style={styles.masteryGrid}>
                {Object.entries(achievementsData.mastery).map(([category, data]) => (
                  <View key={category} style={styles.masteryItem}>
                    <Text style={[styles.masteryName, { color: palette.text }]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)} Master
                    </Text>
                    <View style={[styles.masteryBar, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                      <View 
                        style={[
                          styles.masteryProgress, 
                          { 
                            width: `${(data.progress / data.total) * 100}%`,
                            backgroundColor: data.unlocked ? '#10B981' : '#6366F1'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.masteryCount, { color: palette.subtleText }]}>
                      {data.progress}/{data.total}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* CATEGORIES */}
            {Object.entries(categories).map(([categoryKey, category]) => {
              const categoryAchievements = Object.values(achievementsData.allAchievements)
                .filter(achievement => achievement.category === categoryKey);
              
              const unlockedInCategory = categoryAchievements.filter(achievement => 
                achievementsData.unlocked.some(a => a.id === achievement.id)
              );

              return (
                <View key={categoryKey} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                    <Text style={[styles.categoryName, { color: palette.text }]}>
                      {category.name}
                    </Text>
                    <Text style={[styles.categoryCount, { color: palette.subtleText }]}>
                      {unlockedInCategory.length}/{categoryAchievements.length}
                    </Text>
                  </View>

                  <View style={styles.achievementsList}>
                    {categoryAchievements.map(achievement => {
                      const isUnlocked = achievementsData.unlocked.some(a => a.id === achievement.id);
                      
                      return (
                        <View 
                          key={achievement.id} 
                          style={[
                            styles.achievementItem,
                            { 
                              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                              opacity: isUnlocked ? 1 : 0.4,
                              borderLeftWidth: 4,
                              borderLeftColor: getTierColor(achievement.tier)
                            }
                          ]}
                        >
                          <View style={styles.achievementRow}>
                            <View style={styles.achievementText}>
                              <Text style={[
                                styles.achievementName,
                                { color: isUnlocked ? palette.text : palette.subtleText }
                              ]}>
                                {achievement.name}
                              </Text>
                              <Text style={[styles.tierBadge, { backgroundColor: getTierColor(achievement.tier) }]}>
                                {achievement.tier.toUpperCase()}
                              </Text>
                            </View>
                            {isUnlocked && (
                              <Text style={[styles.tick, { color: category.color }]}>✓</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentCard: { flex: 1, margin: 16, padding: 20, borderRadius: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  categorySection: { marginBottom: 24 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  categoryColor: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  categoryName: { fontSize: 16, fontWeight: '600', flex: 1 },
  categoryCount: { fontSize: 12, fontWeight: '600' },
  achievementsList: { gap: 8 },
  achievementItem: { padding: 16, borderRadius: 12 },
  achievementName: { fontSize: 14, fontWeight: '600', flex: 1 },
  tick: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  achievementRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  masterySection: { marginBottom: 24, padding: 16, borderRadius: 12 },
  masteryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  masteryGrid: { gap: 12 },
  masteryItem: { gap: 6 },
  masteryName: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  masteryBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  masteryProgress: { height: '100%', borderRadius: 3 },
  masteryCount: { fontSize: 10, fontWeight: '600', textAlign: 'right' },
  tierBadge: { fontSize: 8, fontWeight: '700', color: 'white', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2, alignSelf: 'flex-start' },
  achievementText: { flex: 1 },
});
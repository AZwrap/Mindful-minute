import { JournalEntry } from "../stores/entriesStore";

interface MoodStat {
  mood: string;
  count: number;
  percentage: number;
}

export const analyzeMoodTrends = (entries: JournalEntry[], period = 'month') => {
  if (!entries || entries.length === 0) return null;

  const now = new Date();
  let cutoffDate = new Date(0);

  if (period === 'week') cutoffDate = new Date(now.setDate(now.getDate() - 7));
  if (period === 'month') cutoffDate = new Date(now.setDate(now.getDate() - 30));

  const periodEntries = entries.filter(entry => {
    const entryDate = new Date(`${entry.date}T00:00:00`);
    return entryDate >= cutoffDate;
  });

  const moodFrequency: Record<string, number> = {};
  let totalMoodEntries = 0;

  periodEntries.forEach(entry => {
    if (entry.moodTag?.value) {
      const mood = entry.moodTag.value.toLowerCase();
      moodFrequency[mood] = (moodFrequency[mood] || 0) + 1;
      totalMoodEntries++;
    }
  });

  const moodByDay: Record<string, Record<string, number>> = {
    monday: {}, tuesday: {}, wednesday: {}, thursday: {}, 
    friday: {}, saturday: {}, sunday: {}
  };

  periodEntries.forEach(entry => {
    if (entry.moodTag?.value) {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      const dayName = entryDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const mood = entry.moodTag.value.toLowerCase();
      
      if (moodByDay[dayName]) {
         moodByDay[dayName][mood] = (moodByDay[dayName][mood] || 0) + 1;
      }
    }
  });

  const moodStats: MoodStat[] = Object.entries(moodFrequency)
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: totalMoodEntries > 0 ? Math.round((count / totalMoodEntries) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const dominantMoodByDay: Record<string, { mood: string; count: number }> = {};
  Object.entries(moodByDay).forEach(([day, moods]) => {
    const dominant = Object.entries(moods).sort((a, b) => b[1] - a[1])[0];
    if (dominant) {
      dominantMoodByDay[day] = {
        mood: dominant[0],
        count: dominant[1]
      };
    }
  });

  return {
    period,
    totalEntries: periodEntries.length,
    totalMoodEntries,
    moodStats,
    moodByDay,
    dominantMoodByDay,
    periodLabel: period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'All Time'
  };
};

export const getMoodInsights = (trends: any) => {
  if (!trends) return [];
  const insights = [];

  if (trends.moodStats.length > 0) {
    const topMood = trends.moodStats[0];
    insights.push({
      type: 'most_common',
      text: `Your most frequent mood is ${topMood.mood} (${topMood.percentage}% of entries)`,
      mood: topMood.mood,
      percentage: topMood.percentage
    });
  }

  return insights;
};
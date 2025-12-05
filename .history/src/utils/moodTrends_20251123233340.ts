// src/utils/moodTrends.js

export const analyzeMoodTrends = (entries, period = 'month') => {
  if (!entries || entries.length === 0) return null;

  const now = new Date();
  let cutoffDate;

  switch (period) {
    case 'week':
      cutoffDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      cutoffDate = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'all':
    default:
      cutoffDate = new Date(0); // All time
  }

  // Filter entries for the selected period
  const periodEntries = entries.filter(entry => {
    const entryDate = new Date(`${entry.date}T00:00:00`);
    return entryDate >= cutoffDate;
  });

  // Mood frequency analysis
  const moodFrequency = {};
  let totalMoodEntries = 0;

  periodEntries.forEach(entry => {
    if (entry.mood?.value) {
      const mood = entry.mood.value.toLowerCase();
      moodFrequency[mood] = (moodFrequency[mood] || 0) + 1;
      totalMoodEntries++;
    }
  });

  // Mood by day of week analysis
  const moodByDay = {
    monday: {}, tuesday: {}, wednesday: {}, thursday: {}, 
    friday: {}, saturday: {}, sunday: {}
  };

  periodEntries.forEach(entry => {
    if (entry.mood?.value) {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      const dayName = entryDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const mood = entry.mood.value.toLowerCase();
      
      moodByDay[dayName][mood] = (moodByDay[dayName][mood] || 0) + 1;
    }
  });

  // Weekly mood patterns (last 4 weeks)
  const weeklyPatterns = {};
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (i * 7));
    const weekKey = `Week ${4 - i}`;
    weeklyPatterns[weekKey] = {};
  }

  periodEntries.forEach(entry => {
    const entryDate = new Date(`${entry.date}T00:00:00`);
    const weeksAgo = Math.floor((now - entryDate) / (7 * 24 * 60 * 60 * 1000));
    
    if (weeksAgo >= 0 && weeksAgo <= 3 && entry.mood?.value) {
      const weekKey = `Week ${4 - weeksAgo}`;
      const mood = entry.mood.value.toLowerCase();
      weeklyPatterns[weekKey][mood] = (weeklyPatterns[weekKey][mood] || 0) + 1;
    }
  });

  // Calculate percentages and format data
  const moodStats = Object.entries(moodFrequency)
    .map(([mood, count]) => ({
      mood,
      count,
      percentage: totalMoodEntries > 0 ? Math.round((count / totalMoodEntries) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Find most frequent mood by day
  const dominantMoodByDay = {};
  Object.entries(moodByDay).forEach(([day, moods]) => {
    const dominant = Object.entries(moods).sort(([,a], [,b]) => b - a)[0];
    if (dominant) {
      dominantMoodByDay[day] = {
        mood: dominant[0],
        count: dominant[1]
      };
    }
  });

  return {
    period: period,
    totalEntries: periodEntries.length,
    totalMoodEntries,
    moodStats,
    moodByDay,
    dominantMoodByDay,
    weeklyPatterns,
    periodLabel: period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'All Time'
  };
};

// Get mood insights based on patterns
export const getMoodInsights = (trends) => {
  if (!trends) return [];

  const insights = [];

  // Insight 1: Most common mood
  if (trends.moodStats.length > 0) {
    const topMood = trends.moodStats[0];
    insights.push({
      type: 'most_common',
      text: `Your most frequent mood is ${topMood.mood} (${topMood.percentage}% of entries)`,
      mood: topMood.mood,
      percentage: topMood.percentage
    });
  }

  // Insight 2: Day patterns
  if (Object.keys(trends.dominantMoodByDay).length > 0) {
    const daysWithData = Object.entries(trends.dominantMoodByDay);
    if (daysWithData.length >= 3) {
      const mostConsistentDay = daysWithData.sort(([,a], [,b]) => b.count - a.count)[0];
      insights.push({
        type: 'day_pattern',
        text: `You're most consistently ${mostConsistentDay[1].mood} on ${mostConsistentDay[0]}`,
        day: mostConsistentDay[0],
        mood: mostConsistentDay[1].mood
      });
    }
  }

  // Insight 3: Mood variety
  const uniqueMoods = trends.moodStats.length;
  if (uniqueMoods >= 5) {
    insights.push({
      type: 'variety',
      text: `You express ${uniqueMoods} different moods - great emotional awareness!`,
      count: uniqueMoods
    });
  } else if (uniqueMoods <= 2 && trends.totalMoodEntries >= 5) {
    insights.push({
      type: 'consistency',
      text: `You tend to stick with ${trends.moodStats.map(m => m.mood).join(' and ')}`,
      moods: trends.moodStats.map(m => m.mood)
    });
  }

  return insights;
};
// src/utils/writingInsights.js

// Common topics and their keywords
const TOPIC_KEYWORDS = {
  gratitude: ['grateful', 'thankful', 'appreciate', 'blessed', 'lucky', 'fortunate', 'thank you'],
  family: ['family', 'mom', 'dad', 'parent', 'sibling', 'brother', 'sister', 'child', 'kids'],
  friends: ['friend', 'buddy', 'pal', 'hang out', 'together', 'social'],
  work: ['work', 'job', 'career', 'office', 'colleague', 'boss', 'project', 'deadline'],
  health: ['health', 'exercise', 'workout', 'diet', 'sleep', 'energy', 'tired', 'rest'],
  goals: ['goal', 'plan', 'future', 'achieve', 'success', 'progress', 'target'],
  learning: ['learn', 'study', 'read', 'book', 'course', 'knowledge', 'understand'],
  creativity: ['create', 'write', 'draw', 'paint', 'music', 'art', 'idea', 'inspire'],
  nature: ['nature', 'outside', 'park', 'walk', 'sun', 'weather', 'tree', 'flower'],
  mindfulness: ['present', 'moment', 'breathe', 'meditate', 'aware', 'focus', 'calm']
};

// Common themes in writing
const WRITING_THEMES = {
  reflective: ['reflect', 'think', 'consider', 'realize', 'understand', 'perspective'],
  planning: ['plan', 'will', 'going to', 'next', 'future', 'tomorrow', 'soon'],
  nostalgic: ['remember', 'memory', 'past', 'childhood', 'used to', 'back then'],
  hopeful: ['hope', 'wish', 'looking forward', 'excited', 'can\'t wait', 'optimistic'],
  challenging: ['hard', 'difficult', 'struggle', 'challenge', 'tough', 'stress']
};

export const analyzeWritingInsights = (entries, period = 'month') => {
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
      cutoffDate = new Date(0);
  }

  // Filter entries for the period
  const periodEntries = entries.filter(entry => {
    const entryDate = new Date(`${entry.date}T00:00:00`);
    return entryDate >= cutoffDate && entry.text && entry.text.trim().length > 0;
  });

  if (periodEntries.length === 0) return null;

  // Analyze topics
  const topicFrequency = {};
  let totalTopicMentions = 0;

  // Analyze themes
  const themeFrequency = {};

  // Analyze by day of week
  const writingByDay = {
    monday: { entries: [], wordCount: 0, topics: {} },
    tuesday: { entries: [], wordCount: 0, topics: {} },
    wednesday: { entries: [], wordCount: 0, topics: {} },
    thursday: { entries: [], wordCount: 0, topics: {} },
    friday: { entries: [], wordCount: 0, topics: {} },
    saturday: { entries: [], wordCount: 0, topics: {} },
    sunday: { entries: [], wordCount: 0, topics: {} }
  };

  // Analyze by time of day
  const writingByTime = {
    morning: { entries: [], wordCount: 0 }, // 5am-11am
    afternoon: { entries: [], wordCount: 0 }, // 11am-5pm
    evening: { entries: [], wordCount: 0 }, // 5pm-11pm
    night: { entries: [], wordCount: 0 } // 11pm-5am
  };

  periodEntries.forEach(entry => {
    const text = entry.text.toLowerCase();
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    const entryDate = new Date(`${entry.date}T00:00:00`);
    const dayName = entryDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Get entry hour from createdAt if available, otherwise use current time as fallback
    let entryHour = 12; // Default to noon
    if (entry.createdAt) {
      const createdDate = new Date(entry.createdAt);
      entryHour = createdDate.getHours();
    }

    // Categorize by time of day
    let timeCategory = 'afternoon';
    if (entryHour >= 5 && entryHour < 11) timeCategory = 'morning';
    else if (entryHour >= 11 && entryHour < 17) timeCategory = 'afternoon';
    else if (entryHour >= 17 && entryHour < 23) timeCategory = 'evening';
    else timeCategory = 'night';

    // Update day analysis
    writingByDay[dayName].entries.push(entry);
    writingByDay[dayName].wordCount += wordCount;

    // Update time analysis
    writingByTime[timeCategory].entries.push(entry);
    writingByTime[timeCategory].wordCount += wordCount;

    // Analyze topics
    Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > 0) {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + matches;
        totalTopicMentions += matches;
        
        // Track topics by day
        writingByDay[dayName].topics[topic] = (writingByDay[dayName].topics[topic] || 0) + matches;
      }
    });

    // Analyze themes
    Object.entries(WRITING_THEMES).forEach(([theme, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > 0) {
        themeFrequency[theme] = (themeFrequency[theme] || 0) + matches;
      }
    });
  });

  // Calculate topic percentages and sort
  const topicStats = Object.entries(topicFrequency)
    .map(([topic, count]) => ({
      topic,
      count,
      percentage: totalTopicMentions > 0 ? Math.round((count / totalTopicMentions) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 topics

  // Calculate theme percentages and sort
  const themeStats = Object.entries(themeFrequency)
    .map(([theme, count]) => ({
      theme,
      count,
      percentage: periodEntries.length > 0 ? Math.round((count / periodEntries.length) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Find most active writing day
  const mostActiveDay = Object.entries(writingByDay)
    .sort(([,a], [,b]) => b.entries.length - a.entries.length)[0];

  // Find most productive time
  const mostProductiveTime = Object.entries(writingByTime)
    .sort(([,a], [,b]) => b.entries.length - a.entries.length)[0];

  // Calculate average word count
  const totalWords = periodEntries.reduce((sum, entry) => {
    return sum + (entry.text.trim().split(/\s+/).filter(word => word.length > 0).length);
  }, 0);
  const averageWords = Math.round(totalWords / periodEntries.length);

  return {
    period,
    totalEntries: periodEntries.length,
    totalWords,
    averageWords,
    topicStats,
    themeStats,
    writingByDay,
    writingByTime,
    mostActiveDay: mostActiveDay ? { day: mostActiveDay[0], count: mostActiveDay[1].entries.length } : null,
    mostProductiveTime: mostProductiveTime ? { time: mostProductiveTime[0], count: mostProductiveTime[1].entries.length } : null,
    periodLabel: period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'All Time'
  };
};

export const getWritingInsights = (analysis) => {
  if (!analysis) return [];

  const insights = [];

  // Insight 1: Most common topic
  if (analysis.topicStats.length > 0) {
    const topTopic = analysis.topicStats[0];
    if (topTopic.percentage >= 20) { // Only show if significant
      insights.push({
        type: 'common_topic',
        text: `You often write about ${topTopic.topic} (${topTopic.percentage}% of your topics)`,
        topic: topTopic.topic,
        percentage: topTopic.percentage
      });
    }
  }

  // Insight 2: Most active writing day
  if (analysis.mostActiveDay && analysis.mostActiveDay.count >= 3) {
    insights.push({
      type: 'active_day',
      text: `You write most consistently on ${analysis.mostActiveDay.day}s`,
      day: analysis.mostActiveDay.day,
      count: analysis.mostActiveDay.count
    });
  }

  // Insight 3: Most productive time
  if (analysis.mostProductiveTime && analysis.mostProductiveTime.count >= 3) {
    insights.push({
      type: 'productive_time',
      text: `You're most productive writing in the ${analysis.mostProductiveTime.time}`,
      time: analysis.mostProductiveTime.time,
      count: analysis.mostProductiveTime.count
    });
  }

  // Insight 4: Writing length
  if (analysis.averageWords >= 100) {
    insights.push({
      type: 'detailed_writer',
      text: `You write detailed entries (avg ${analysis.averageWords} words)`,
      averageWords: analysis.averageWords
    });
  } else if (analysis.averageWords <= 50) {
    insights.push({
      type: 'concise_writer',
      text: `You keep your writing concise (avg ${analysis.averageWords} words)`,
      averageWords: analysis.averageWords
    });
  }

  // Insight 5: Common theme
  if (analysis.themeStats.length > 0) {
    const topTheme = analysis.themeStats[0];
    if (topTheme.percentage >= 30) {
      insights.push({
        type: 'common_theme',
        text: `Your writing is often ${topTheme.theme}`,
        theme: topTheme.theme,
        percentage: topTheme.percentage
      });
    }
  }

  return insights.slice(0, 3); // Return top 3 insights
};
import { JournalEntry } from "../stores/entriesStore";

// --------------------------------------------------
// CONFIG & TYPES
// --------------------------------------------------
const TOPIC_KEYWORDS: Record<string, string[]> = {
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

const WRITING_THEMES: Record<string, string[]> = {
  reflective: ['reflect', 'think', 'consider', 'realize', 'understand', 'perspective'],
  planning: ['plan', 'will', 'going to', 'next', 'future', 'tomorrow', 'soon'],
  nostalgic: ['remember', 'memory', 'past', 'childhood', 'used to', 'back then'],
  hopeful: ['hope', 'wish', 'looking forward', 'excited', 'can\'t wait', 'optimistic'],
  challenging: ['hard', 'difficult', 'struggle', 'challenge', 'tough', 'stress']
};

interface TopicStat {
  topic: string;
  count: number;
  percentage: number;
}

interface ThemeStat {
  theme: string;
  count: number;
  percentage: number;
}

interface AnalysisResult {
  period: string;
  totalEntries: number;
  totalWords: number;
  averageWords: number;
  topicStats: TopicStat[];
  themeStats: ThemeStat[];
  mostActiveDay: { day: string; count: number } | null;
  mostProductiveTime: { time: string; count: number } | null;
}

interface Insight {
  type: string;
  text: string;
  [key: string]: any; // Allow extra fields like 'count', 'topic', etc.
}

// --------------------------------------------------
// LOGIC
// --------------------------------------------------
export const analyzeWritingInsights = (entries: JournalEntry[], period = 'month'): AnalysisResult | null => {
  if (!entries || entries.length === 0) return null;

  const now = new Date();
  let cutoffDate = new Date(0);

  if (period === 'week') cutoffDate = new Date(now.setDate(now.getDate() - 7));
  if (period === 'month') cutoffDate = new Date(now.setDate(now.getDate() - 30));

  // Filter entries
  const periodEntries = entries.filter(entry => {
    const entryDate = new Date(`${entry.date}T00:00:00`);
    return entryDate >= cutoffDate && entry.text && entry.text.trim().length > 0;
  });

  if (periodEntries.length === 0) return null;

  const topicFrequency: Record<string, number> = {};
  let totalTopicMentions = 0;
  const themeFrequency: Record<string, number> = {};

  // Trackers
  const writingByDay: Record<string, { entries: JournalEntry[], wordCount: number }> = {};
  const writingByTime: Record<string, { entries: JournalEntry[], wordCount: number }> = {
    morning: { entries: [], wordCount: 0 },
    afternoon: { entries: [], wordCount: 0 },
    evening: { entries: [], wordCount: 0 },
    night: { entries: [], wordCount: 0 }
  };

  // Initialize days
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(d => {
    writingByDay[d] = { entries: [], wordCount: 0 };
  });

  periodEntries.forEach(entry => {
    const text = (entry.text || '').toLowerCase();
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    const entryDate = new Date(`${entry.date}T00:00:00`);
    const dayName = entryDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    let entryHour = 12;
    if (entry.createdAt) {
      const createdDate = new Date(entry.createdAt);
      entryHour = createdDate.getHours();
    }

    let timeCategory = 'afternoon';
    if (entryHour >= 5 && entryHour < 11) timeCategory = 'morning';
    else if (entryHour >= 11 && entryHour < 17) timeCategory = 'afternoon';
    else if (entryHour >= 17 && entryHour < 23) timeCategory = 'evening';
    else timeCategory = 'night';

    // Update trackers
    if (writingByDay[dayName]) {
      writingByDay[dayName].entries.push(entry);
      writingByDay[dayName].wordCount += wordCount;
    }
    
    writingByTime[timeCategory].entries.push(entry);
    writingByTime[timeCategory].wordCount += wordCount;

    // Analyze topics
    Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > 0) {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + matches;
        totalTopicMentions += matches;
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

  // Calculate Stats
  const topicStats: TopicStat[] = Object.entries(topicFrequency)
    .map(([topic, count]) => ({
      topic,
      count,
      percentage: totalTopicMentions > 0 ? Math.round((count / totalTopicMentions) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const themeStats: ThemeStat[] = Object.entries(themeFrequency)
    .map(([theme, count]) => ({
      theme,
      count,
      percentage: periodEntries.length > 0 ? Math.round((count / periodEntries.length) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const dayEntries = Object.entries(writingByDay).map(([day, data]) => ({ day, count: data.entries.length }));
  const sortedDays = dayEntries.sort((a, b) => b.count - a.count);
  const mostActiveDay = sortedDays[0].count > 0 ? sortedDays[0] : null;

  const timeEntries = Object.entries(writingByTime).map(([time, data]) => ({ time, count: data.entries.length }));
  const sortedTimes = timeEntries.sort((a, b) => b.count - a.count);
  const mostProductiveTime = sortedTimes[0].count > 0 ? sortedTimes[0] : null;

  const totalWords = periodEntries.reduce((sum, entry) => {
    return sum + ((entry.text || '').trim().split(/\s+/).filter(word => word.length > 0).length);
  }, 0);
  const averageWords = Math.round(totalWords / periodEntries.length);

  return {
    period,
    totalEntries: periodEntries.length,
    totalWords,
    averageWords,
    topicStats,
    themeStats,
    mostActiveDay,
    mostProductiveTime
  };
};

export const getWritingInsights = (analysis: AnalysisResult | null): Insight[] => {
  if (!analysis) return [];

  const insights: Insight[] = [];

  // Insight 1: Most common topic
  if (analysis.topicStats.length > 0) {
    const topTopic = analysis.topicStats[0];
    if (topTopic.percentage >= 20) {
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

  return insights.slice(0, 3);
};
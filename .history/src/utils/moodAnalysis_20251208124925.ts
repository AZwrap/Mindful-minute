import { JournalEntry } from "../stores/entriesStore";

// --- 1. CONFIGURATION: Keyword Dictionaries ---
const POSITIVE_WORDS = new Set(['good', 'great', 'happy', 'awesome', 'love', 'excellent', 'excited', 'calm', 'peaceful', 'grateful', 'joy', 'hope', 'best', 'win', 'fun', 'smile', 'proud', 'lucky']);
const NEGATIVE_WORDS = new Set(['bad', 'sad', 'hate', 'angry', 'terrible', 'worst', 'awful', 'anxious', 'tired', 'stress', 'pain', 'loss', 'fear', 'lonely', 'hard', 'boring', 'guilt', 'stuck']);
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Work': ['work', 'job', 'boss', 'meeting', 'project', 'deadline', 'office', 'career', 'client', 'email'],
  'Family': ['family', 'mom', 'dad', 'sister', 'brother', 'partner', 'kids', 'home', 'parents', 'son', 'daughter', 'wife', 'husband'],
  'Health': ['gym', 'run', 'sleep', 'eat', 'food', 'diet', 'health', 'sick', 'tired', 'energy', 'walk', 'exercise', 'yoga'],
  'Nature': ['sun', 'rain', 'tree', 'outside', 'walk', 'park', 'weather', 'sky', 'beach', 'mountain'],
  'Growth': ['learn', 'read', 'book', 'study', 'goal', 'habit', 'meditate', 'journal', 'mind'],
};

// --- 2. HELPER: Sentiment Scoring ---
const getSentimentScore = (text: string): number => {
  if (!text) return 0;
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  let score = 0;
  words.forEach(w => {
    if (POSITIVE_WORDS.has(w)) score += 1;
    if (NEGATIVE_WORDS.has(w)) score -= 1;
  });
  return score;
};

// --- 3. HELPER: Topic Extraction ---
const getTopics = (text: string): string[] => {
  if (!text) return [];
  const lower = text.toLowerCase();
  return Object.keys(TOPIC_KEYWORDS).filter(topic => 
    TOPIC_KEYWORDS[topic].some(keyword => lower.includes(keyword))
  );
};

// --- 4. MAIN ANALYZER ---
export const analyzeMoodCorrelations = (entries: JournalEntry[]) => {
  if (!entries || entries.length < 3) {
    return {
      insights: ["Journal a bit more to unlock AI patterns."],
      topics: {},
      sentimentTrend: 'Neutral'
    };
  }

  const topicMoodMap: Record<string, Record<string, number>> = {};
  const dayMoodMap: Record<string, Record<string, number>> = {};
  let totalSentiment = 0;

  entries.forEach(entry => {
    const mood = entry.moodTag?.value || 'Neutral';
    const day = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' });
    const text = entry.text || '';

    // A. Day Analysis
    if (!dayMoodMap[day]) dayMoodMap[day] = {};
    dayMoodMap[day][mood] = (dayMoodMap[day][mood] || 0) + 1;

    // B. Topic Analysis
    const topics = getTopics(text);
    topics.forEach(topic => {
      if (!topicMoodMap[topic]) topicMoodMap[topic] = {};
      topicMoodMap[topic][mood] = (topicMoodMap[topic][mood] || 0) + 1;
    });

    // C. Sentiment Analysis
    totalSentiment += getSentimentScore(text);
  });

  // --- GENERATE INSIGHTS ---
  const insights: string[] = [];

  // Insight 1: Topic Patterns (e.g., "Work makes you Anxious")
  Object.entries(topicMoodMap).forEach(([topic, moods]) => {
    // Sort moods by frequency for this topic
    const topMoodEntry = Object.entries(moods).sort((a, b) => b[1] - a[1])[0];
    if (topMoodEntry && topMoodEntry[1] >= 2) {
      insights.push(`You often feel ${topMoodEntry[0]} when writing about ${topic}.`);
    }
  });

  // Insight 2: Weekend Vibes
  const weekendMoods = { ...dayMoodMap['Saturday'], ...dayMoodMap['Sunday'] };
  if (Object.keys(weekendMoods).length > 0) {
    // Simple check for positive keywords in weekend entries could go here
    // For now, we rely on the mood tags
  }

  // Insight 3: General Sentiment
  const sentimentLabel = totalSentiment > 2 ? 'Positive' : (totalSentiment < -2 ? 'Challenging' : 'Balanced');
  if (entries.length > 5) {
    insights.push(`Your recent writing tone is generally ${sentimentLabel}.`);
  }

  // Fallback
  if (insights.length === 0) {
    insights.push("Keep writing! Distinct patterns will appear soon.");
  }

  return {
    insights: insights.slice(0, 3), // Top 3 insights
    topics: topicMoodMap,
    sentimentTrend: sentimentLabel
  };
};

export const getMoodCorrelationSummary = (entries: JournalEntry[]) => {
  return analyzeMoodCorrelations(entries);
};
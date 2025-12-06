import { MOOD_CATEGORIES } from '../constants/moodCategories';

interface Suggestion {
  mood: string;
  confidence: number;
}

// Simple keyword mapping
const KEYWORDS: Record<string, string[]> = {
  Happy: ['happy', 'good', 'great', 'awesome', 'smile', 'love', 'joy'],
  Sad: ['sad', 'bad', 'cry', 'tear', 'hurt', 'pain', 'lonely', 'down'],
  Stressed: ['stressed', 'busy', 'overwhelmed', 'deadline', 'work', 'pressure', 'anxious'],
  Grateful: ['grateful', 'thank', 'blessed', 'lucky', 'appreciate'],
  Calm: ['calm', 'peace', 'quiet', 'relax', 'sleep', 'chill'],
  Angry: ['angry', 'mad', 'hate', 'furious', 'annoying'],
};

export function getMoodSuggestions(text: string): Suggestion[] {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};

  Object.entries(KEYWORDS).forEach(([mood, words]) => {
    let matches = 0;
    words.forEach(w => {
      if (lower.includes(w)) matches++;
    });
    if (matches > 0) scores[mood] = matches;
  });

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mood, score]) => ({ mood, confidence: score }));
}
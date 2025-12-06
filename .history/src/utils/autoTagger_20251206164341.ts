import { MOOD_CATEGORIES } from '../constants/moodCategories';

interface Suggestion {
  mood: string;
  confidence: number;
}

// Expanded keyword mapping
const KEYWORDS: Record<string, string[]> = {
  Happy: ['happy', 'good', 'great', 'awesome', 'smile', 'love', 'joy', 'wonderful'],
  Sad: ['sad', 'bad', 'cry', 'tear', 'hurt', 'pain', 'lonely', 'down', 'heavy', 'grief'],
  Stressed: ['stressed', 'busy', 'overwhelmed', 'deadline', 'work', 'pressure', 'anxious', 'panic'],
  Grateful: ['grateful', 'thank', 'blessed', 'lucky', 'appreciate', 'gift', 'glad'],
  Calm: ['calm', 'peace', 'quiet', 'relax', 'sleep', 'chill', 'zen', 'still'],
  Angry: ['angry', 'mad', 'hate', 'furious', 'annoying', 'rage', 'irritated'],
  
  // New Moods
  Hopeful: ['hope', 'future', 'better', 'believe', 'wish', 'dream', 'possible'],
  Determined: ['goal', 'focus', 'will', 'plan', 'achieve', 'ready', 'strong'],
  Nostalgic: ['remember', 'past', 'memory', 'childhood', 'old', 'miss', 'ago'],
  Reflective: ['realized', 'learned', 'think', 'understand', 'wonder', 'maybe'],
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
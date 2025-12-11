import { MOOD_CATEGORIES } from '../constants/moodCategories';

interface Suggestion {
  mood: string;
  confidence: number;
}

// Mapped strictly to MoodTagScreen options:
// ['Calm','Grateful','Anxious','Focused','Happy','Reflective','Tired','Energetic','Optimistic','Overwhelmed']
const KEYWORDS: Record<string, string[]> = {
  // High Priority (Exact Matches)
  Sad: ['sad', 'unhappy', 'cry', 'crying', 'tears', 'upset', 'down', 'blue', 'grief', 'heartbroken', 'sorrow'],
  Lonely: ['lonely', 'alone', 'miss', 'missing', 'isolate', 'ignored', 'left out'],
  Tired: ['tired', 'sleepy', 'exhausted', 'drained', 'fatigue', 'weary', 'low energy', 'need sleep'],
  Anxious: ['anxious', 'nervous', 'worry', 'worried', 'scared', 'fear', 'uneasy', 'panic', 'tension'],
  Overwhelmed: ['overwhelmed', 'too much', 'busy', 'drowning', 'pressure', 'stress', 'hectic', 'chaos'],
  
  // Positive
  Happy: ['happy', 'good', 'great', 'joy', 'wonderful', 'smile', 'love', 'awesome'],
  Grateful: ['grateful', 'thank', 'blessed', 'lucky', 'appreciate', 'glad', 'thanks'],
  Calm: ['calm', 'peace', 'chill', 'relax', 'zen', 'quiet', 'still', 'fine', 'okay'],
  Energetic: ['energetic', 'energy', 'pumped', 'active', 'strong', 'power', 'awake', 'alive'],
  Optimistic: ['optimistic', 'hope', 'hopeful', 'positive', 'better', 'believe', 'future', 'looking forward'],
  
  // Focus/Thinking
  Focused: ['focused', 'concentration', 'work', 'study', 'flow', 'dialed in', 'productive', 'goal'],
  Reflective: ['reflective', 'realized', 'learned', 'thinking', 'wonder', 'maybe', 'thought', 'mind'],
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
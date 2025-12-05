// src/utils/autoTagger.js

export const getMoodSuggestions = (text) => {
  if (!text || text.length < 10) return [];
  
  const moodKeywords = {
    grateful: ['grateful', 'thankful', 'appreciate', 'blessed', 'fortunate', 'lucky', 'thank you', 'gratitude', 'appreciation'],
    happy: ['happy', 'joy', 'excited', 'delighted', 'wonderful', 'amazing', 'great', 'good', 'nice', 'fantastic', 'awesome', 'pleased', 'content', 'cheerful'],
    calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'quiet', 'still', 'mindful', 'centered', 'balanced', 'mellow'],
    anxious: ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'tense', 'pressure', 'uneasy', 'apprehensive', 'panic', 'fearful'],
    tired: ['tired', 'exhausted', 'fatigued', 'drained', 'sleepy', 'burned out', 'weary', 'drowsy', 'spent', 'worn out'],
    motivated: ['motivated', 'energized', 'focused', 'determined', 'productive', 'driven', 'purpose', 'inspired', 'ambitious', 'goal'],
    reflective: ['reflect', 'learned', 'realized', 'understood', 'growth', 'insight', 'perspective', 'contemplative', 'thoughtful', 'meditative'],
    loving: ['love', 'care', 'affection', 'compassion', 'kindness', 'heart', 'connection', 'fond', 'adore', 'cherish'],
    frustrated: ['frustrated', 'annoyed', 'angry', 'mad', 'upset', 'irritated', 'disappointed', 'aggravated', 'bothered', 'displeased'],
    hopeful: ['hopeful', 'optimistic', 'looking forward', 'future', 'potential', 'possibility', 'expectant', 'anticipating', 'positive'],
    sad: ['sad', 'unhappy', 'down', 'blue', 'melancholy', 'gloomy', 'heartbroken', 'disheartened', 'depressed'],
    proud: ['proud', 'accomplished', 'achieved', 'success', 'confident', 'satisfied', 'fulfilled', 'triumphant'],
    confused: ['confused', 'uncertain', 'unsure', 'puzzled', 'perplexed', 'bewildered', 'lost', 'disoriented'],
    inspired: ['inspired', 'creative', 'imaginative', 'artistic', 'innovative', 'visionary', 'sparked', 'stimulated']
  };

  const textLower = text.toLowerCase();
  const suggestions = [];

  Object.entries(moodKeywords).forEach(([mood, keywords]) => {
    const count = keywords.filter(keyword => textLower.includes(keyword)).length;
    if (count >= 1) {
      const confidence = Math.min(100, (count / keywords.length) * 100);
      suggestions.push({
        mood,
        confidence: Math.round(confidence),
        keywordMatches: count
      });
    }
  });

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
};

export const suggestMoodFromText = (text) => {
  const suggestions = getMoodSuggestions(text);
  return suggestions.length > 0 ? suggestions[0].mood : null;
};
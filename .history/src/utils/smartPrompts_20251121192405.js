import { analyzeSentiment, extractThemes, detectWritingPatterns } from './textAnalysis';

// Enhanced user data analysis
export const analyzeForSmartPrompts = (entries) => {
  if (!entries || entries.length === 0) {
    return {
      moodFrequency: {},
      commonThemes: [],
      writingPatterns: {},
      sentimentTrend: 'neutral',
      entryStats: {
        totalEntries: 0,
        averageLength: 0,
        completionRate: 0
      }
    };
  }

  const recentEntries = entries.slice(0, 30); // Last 30 entries
  const moodFrequency = {};
  const allText = recentEntries.map(entry => entry.text).join(' ');
  
  // Analyze mood patterns
  recentEntries.forEach(entry => {
    if (entry.moodTag?.value) {
      const mood = entry.moodTag.value.toLowerCase();
      moodFrequency[mood] = (moodFrequency[mood] || 0) + 1;
    }
  });

  // Get common themes and patterns
  const commonThemes = extractThemes(allText);
  const writingPatterns = detectWritingPatterns(recentEntries);
  const sentiment = analyzeSentiment(allText);

  // Calculate entry statistics
  const totalEntries = entries.length;
  const completeEntries = entries.filter(e => e.isComplete).length;
  const averageLength = recentEntries.reduce((sum, entry) => 
    sum + (entry.text?.split(' ').length || 0), 0) / recentEntries.length;

  return {
    moodFrequency,
    commonThemes: commonThemes.slice(0, 5), // Top 5 themes
    writingPatterns,
    sentimentTrend: sentiment,
    entryStats: {
      totalEntries,
      averageLength: Math.round(averageLength),
      completionRate: Math.round((completeEntries / totalEntries) * 100)
    },
    recentMoods: Object.keys(moodFrequency)
      .sort((a, b) => moodFrequency[b] - moodFrequency[a])
      .slice(0, 3)
  };
};

// Enhanced smart prompt generation
export const generateSmartPrompt = (userData) => {
  const { moodFrequency, commonThemes, writingPatterns, sentimentTrend, recentMoods, entryStats } = userData;

  // Base prompt categories
  const promptTemplates = {
    moodReflection: [
      "I notice you've been feeling {mood} lately. What's contributing to that?",
      "Your recent entries mention {theme}. How does this connect to your current mood?",
      "When you feel {mood}, what helps you find balance?"
    ],
    patternAware: [
      "You often write about {theme}. What new insight do you have about this?",
      "I see you typically write {timePattern}. How does this time affect your reflection?",
      "Your entries have been getting {lengthTrend}. What's behind this change?"
    ],
    growthFocused: [
      "Looking back at your journey, how have your perspectives on {theme} evolved?",
      "What would your past self think about how you're handling {mood} now?",
      "If your recent patterns continue, where do you see yourself in a month?"
    ],
    balanceSeeking: [
      "You've mentioned both {mood1} and {mood2} recently. What's creating this contrast?",
      "How can you bring more of your {positiveMood} moments into challenging times?",
      "What's one small shift that could improve your emotional balance?"
    ]
  };

  // Determine which category to use based on user data
  let category;
  if (recentMoods.length >= 2 && moodFrequency[recentMoods[0]] > moodFrequency[recentMoods[1]] * 2) {
    category = 'moodReflection'; // Dominant mood pattern
  } else if (commonThemes.length > 0 && entryStats.totalEntries > 10) {
    category = 'patternAware'; // Established writing patterns
  } else if (entryStats.totalEntries > 20) {
    category = 'growthFocused'; // Enough data for reflection
  } else if (recentMoods.length >= 2) {
    category = 'balanceSeeking'; // Multiple moods
  } else {
    category = 'moodReflection'; // Default
  }

  // Select random template from chosen category
  const templates = promptTemplates[category];
  let prompt = templates[Math.floor(Math.random() * templates.length)];

  // Replace placeholders with actual data
  if (recentMoods.length > 0) {
    prompt = prompt.replace('{mood}', recentMoods[0]);
    prompt = prompt.replace('{mood1}', recentMoods[0]);
    prompt = prompt.replace('{positiveMood}', recentMoods.find(mood => 
      ['calm', 'happy', 'peaceful', 'grateful', 'content'].includes(mood)) || recentMoods[0]);
  }
  
  if (recentMoods.length > 1) {
    prompt = prompt.replace('{mood2}', recentMoods[1]);
  }

  if (commonThemes.length > 0) {
    prompt = prompt.replace('{theme}', commonThemes[0]);
  }

  // Add pattern-specific replacements
  if (writingPatterns.frequentWords?.length > 0) {
    prompt = prompt.replace('{theme}', writingPatterns.frequentWords[0]);
  }

  if (entryStats.averageLength > 50) {
    prompt = prompt.replace('{lengthTrend}', 'more detailed');
  } else if (entryStats.averageLength < 20) {
    prompt = prompt.replace('{lengthTrend}', 'more concise');
  }

  return prompt || "What's present for you in this moment?";
};

// Enhanced explanation generator
export const getPromptExplanation = (prompt, userData) => {
  const { recentMoods, commonThemes, entryStats } = userData;
  
  if (prompt.includes("I notice you've been feeling")) {
    return `Based on your recent moods: ${recentMoods.join(', ')}`;
  }
  
  if (prompt.includes("You often write about")) {
    return `Inspired by your common themes: ${commonThemes.slice(0, 2).join(', ')}`;
  }
  
  if (prompt.includes("Looking back at your journey")) {
    return `Drawing from your ${entryStats.totalEntries} entries`;
  }
  
  if (prompt.includes("You've mentioned both")) {
    return `Noticing your emotional range`;
  }
  
  return "Personalized based on your writing patterns";
};

// Text analysis utilities (simplified versions)
export const analyzeSentiment = (text) => {
  const positiveWords = ['happy', 'good', 'great', 'love', 'peace', 'calm', 'grateful', 'joy', 'content'];
  const negativeWords = ['sad', 'bad', 'stress', 'anxious', 'worried', 'angry', 'tired', 'hard'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  const words = text.toLowerCase().split(' ');
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount * 1.5) return 'positive';
  if (negativeCount > positiveCount * 1.5) return 'negative';
  return 'neutral';
};

export const extractThemes = (text) => {
  // Simple theme extraction based on frequent meaningful words
  const stopWords = new Set(['the', 'and', 'but', 'for', 'with', 'this', 'that', 'was', 'were', 'have', 'has', 'had']);
  const words = text.toLowerCase().split(/\W+/);
  
  const wordFreq = {};
  words.forEach(word => {
    if (word.length > 4 && !stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  return Object.keys(wordFreq)
    .sort((a, b) => wordFreq[b] - wordFreq[a])
    .slice(0, 10);
};

export const detectWritingPatterns = (entries) => {
  const patterns = {
    frequentWords: [],
    commonMoods: [],
    timeOfDay: {},
    entryLengths: []
  };
  
  entries.forEach(entry => {
    if (entry.text) {
      const words = entry.text.split(' ');
      patterns.entryLengths.push(words.length);
    }
    
    if (entry.moodTag?.value) {
      patterns.commonMoods.push(entry.moodTag.value);
    }
  });
  
  return patterns;
};
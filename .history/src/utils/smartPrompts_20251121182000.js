// src/utils/smartPrompts.js

// Base prompt library organized by categories
const PROMPT_CATEGORIES = {
  gratitude: [
    "What's one small thing you're grateful for today?",
    "Who made you feel appreciated recently?",
    "What comfort are you thankful for right now?",
    "What beautiful moment stood out to you today?",
    "What skill or ability are you grateful to have?"
  ],
  
  reflection: [
    "What did you learn about yourself today?",
    "How have you grown recently?",
    "What would you tell your younger self?",
    "What's becoming clearer to you?",
    "What perspective has shifted for you?"
  ],
  
  mindfulness: [
    "What sensations are you experiencing right now?",
    "Where do you feel tension in your body?",
    "What sounds are around you?",
    "What's one breath like, from start to finish?",
    "What can you notice with your eyes closed?"
  ],
  
  relationships: [
    "Who inspired you recently?",
    "What conversation impacted you today?",
    "How did you connect with someone today?",
    "What kindness did you give or receive?",
    "Who do you feel understood by?"
  ],
  
  goals: [
    "What small step did you take toward your goals?",
    "What are you looking forward to?",
    "What would make tomorrow meaningful?",
    "What's one thing you want to remember?",
    "What intention would serve you right now?"
  ],
  
  challenges: [
    "What difficulty taught you something?",
    "How did you overcome a obstacle recently?",
    "What's feeling uncertain right now?",
    "What support do you need?",
    "What strength did you discover?"
  ],
  
  creativity: [
    "What inspired you today?",
    "What idea wants your attention?",
    "What would you create if time/money didn't matter?",
    "What color describes your day?",
    "What story is unfolding in your life?"
  ],
  
  self_care: [
    "What nourished you today?",
    "How did you honor your needs?",
    "What rest do you need?",
    "What brings you peace?",
    "How can you be kinder to yourself?"
  ]
};

// Mood-specific prompts
const MOOD_PROMPTS = {
  happy: [
    "What's contributing to this happiness?",
    "How can you carry this feeling forward?",
    "What made you smile today?",
    "Who would you share this joy with?",
    "What's beautiful about this moment?"
  ],
  
  grateful: [
    "What unexpected blessing appeared?",
    "Who helped you today?",
    "What simple pleasure are you thankful for?",
    "What challenge turned into a gift?",
    "What abundance do you see around you?"
  ],
  
  calm: [
    "What helps maintain this peace?",
    "Where do you feel most centered?",
    "What does this stillness tell you?",
    "How can you return to this calm later?",
    "What anchors you in the present?"
  ],
  
  anxious: [
    "What would help you feel more secure?",
    "What's within your control?",
    "What reassurance do you need?",
    "What has helped before in similar moments?",
    "What small step feels manageable?"
  ],
  
  tired: [
    "What rest do you truly need?",
    "What can you let go of?",
    "What replenishes your energy?",
    "What's one small comfort?",
    "How can you be gentle with yourself?"
  ],
  
  reflective: [
    "What's becoming clearer?",
    "What pattern do you notice?",
    "What wisdom have you gained?",
    "What question is living in you?",
    "What wants your attention?"
  ],
  
  motivated: [
    "What energizes you right now?",
    "What's possible today?",
    "What step feels exciting?",
    "What vision inspires you?",
    "How can you build on this momentum?"
  ]
};

// Time-based prompts
const TIME_PROMPTS = {
  morning: [
    "What intention would serve your day?",
    "What are you hopeful about today?",
    "What would make today meaningful?",
    "What energy do you want to bring today?",
    "What's one small win you can create?"
  ],
  
  evening: [
    "What moment from today will you carry forward?",
    "What are you releasing from today?",
    "How did you care for yourself today?",
    "What learned today?",
    "What peace can you find right now?"
  ]
};

export const generateSmartPrompt = (userData = {}) => {
  const {
    recentMoods = [],
    commonTopics = [],
    writingHistory = [],
    currentMood,
    timeOfDay,
    lastPrompts = []
  } = userData;

  // Avoid repeating recent prompts
  const usedPrompts = new Set(lastPrompts.slice(-10)); // Last 10 prompts

  // Strategy 1: Mood-matched prompts (highest priority)
  if (currentMood && MOOD_PROMPTS[currentMood]) {
    const moodPrompts = MOOD_PROMPTS[currentMood].filter(p => !usedPrompts.has(p));
    if (moodPrompts.length > 0) {
      return moodPrompts[Math.floor(Math.random() * moodPrompts.length)];
    }
  }

  // Strategy 2: Time-appropriate prompts
  if (timeOfDay && TIME_PROMPTS[timeOfDay]) {
    const timePrompts = TIME_PROMPTS[timeOfDay].filter(p => !usedPrompts.has(p));
    if (timePrompts.length > 0) {
      return timePrompts[Math.floor(Math.random() * timePrompts.length)];
    }
  }

  // Strategy 3: Expand on common topics (encourage depth)
  if (commonTopics.length > 0) {
    const favoriteTopic = commonTopics[0]; // Most common topic
    if (PROMPT_CATEGORIES[favoriteTopic]) {
      const topicPrompts = PROMPT_CATEGORIES[favoriteTopic].filter(p => !usedPrompts.has(p));
      if (topicPrompts.length > 0) {
        return topicPrompts[Math.floor(Math.random() * topicPrompts.length)];
      }
    }
  }

  // Strategy 4: Explore less-used topics (encourage variety)
  const allTopics = Object.keys(PROMPT_CATEGORIES);
  const lessUsedTopics = allTopics.filter(topic => !commonTopics.includes(topic));
  
  if (lessUsedTopics.length > 0) {
    const randomTopic = lessUsedTopics[Math.floor(Math.random() * lessUsedTopics.length)];
    const explorationPrompts = PROMPT_CATEGORIES[randomTopic].filter(p => !usedPrompts.has(p));
    if (explorationPrompts.length > 0) {
      return explorationPrompts[Math.floor(Math.random() * explorationPrompts.length)];
    }
  }

  // Strategy 5: Fallback to random prompt from any category
  const allPrompts = Object.values(PROMPT_CATEGORIES).flat();
  const availablePrompts = allPrompts.filter(p => !usedPrompts.has(p));
  
  if (availablePrompts.length > 0) {
    return availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
  }

  // Ultimate fallback
  return "What's present for you right now?";
};

// Analyze user data to prepare for smart prompt generation
export const analyzeForSmartPrompts = (entries, currentTime = new Date()) => {
  if (!entries || entries.length === 0) {
    return {
      recentMoods: [],
      commonTopics: [],
      writingHistory: entries || [],
      timeOfDay: getTimeOfDay(currentTime),
      lastPrompts: []
    };
  }

  // Get recent moods (last 7 entries)
  const recentMoods = entries
    .slice(0, 7)
    .map(entry => entry.mood?.value?.toLowerCase())
    .filter(Boolean);

  // Get current mood from most recent entry if available
  const currentMood = entries[0]?.mood?.value?.toLowerCase();

  // Analyze common topics (simplified version)
  const topicCounts = {};
  entries.forEach(entry => {
    if (entry.text) {
      const text = entry.text.toLowerCase();
      Object.keys(PROMPT_CATEGORIES).forEach(topic => {
        PROMPT_CATEGORIES[topic].forEach(prompt => {
          if (text.includes(topic) || prompt.toLowerCase().includes(topic)) {
            topicCounts[topic] = (topicCounts[topic] || 0) + 1;
          }
        });
      });
    }
  });

  const commonTopics = Object.entries(topicCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic);

  // Get last used prompts
  const lastPrompts = entries
    .slice(0, 5)
    .map(entry => entry.prompt?.text)
    .filter(Boolean);

  // Determine time of day
  const timeOfDay = getTimeOfDay(currentTime);

  return {
    recentMoods,
    commonTopics,
    writingHistory: entries,
    currentMood,
    timeOfDay,
    lastPrompts
  };
};

// Helper function to determine time of day
const getTimeOfDay = (date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

// Get explanation for why a particular prompt was chosen
export const getPromptExplanation = (prompt, userData) => {
  const { currentMood, commonTopics, timeOfDay } = userData;

  // Check if it's a mood-matched prompt
  if (currentMood && MOOD_PROMPTS[currentMood]?.includes(prompt)) {
    return `This prompt matches your current ${currentMood} mood`;
  }

  // Check if it's time-appropriate
  if (timeOfDay && TIME_PROMPTS[timeOfDay]?.includes(prompt)) {
    return `Good for ${timeOfDay} reflection`;
  }

  // Check if it expands on common topics
  if (commonTopics.length > 0) {
    const matchingTopic = commonTopics.find(topic => 
      PROMPT_CATEGORIES[topic]?.includes(prompt)
    );
    if (matchingTopic) {
      return `Expands on your interest in ${matchingTopic}`;
    }
  }

  return "New perspective to explore";
};
import { JournalEntry } from "../stores/entriesStore";

interface UserAnalysis {
  recentMoods: string[];
  wordCountTrend: 'up' | 'down' | 'stable';
  lastTopics: string[];
}

export function analyzeForSmartPrompts(entries: JournalEntry[]): UserAnalysis {
  // Use last 10 entries for a broader mood context
  const recent = entries.slice(0, 10);
  const moods = recent.map(e => e.moodTag?.value || '').filter(Boolean);
  
  return {
    recentMoods: moods,
    wordCountTrend: 'stable',
    lastTopics: []
  };
}

// --------------------------------------------------
// PROMPT POOLS
// --------------------------------------------------
const PROMPTS = {
  stressed: [
    "What is one thing within your control right now?",
    "What is occupying your mind, and can you let it go for 5 minutes?",
    "Describe your stress as a physical object. What does it look like?",
    "What is a small boundary you can set today to protect your peace?",
    "If a friend felt this way, what would you tell them?",
    "What is the worst case scenario, and can you handle it?",
    "List 3 things that are going *right* despite the stress.",
    "What would the 'calm version' of you do in this situation?",
    "Is this stress coming from the past, present, or future?",
    "What is one task you can delete or delegate today?",
    "Write down your worries, then physically cross out the ones you can't control.",
    "What does your body need right now? (Water, stretch, rest?)",
    "If you paused for 10 minutes, would the world fall apart?",
    "What is the noise in your head saying? Write it out to silence it.",
    "Imagine you are looking back at this moment a year from now. Does it still matter?"
  ],
  happy: [
    "How can you carry this positive energy into tomorrow?",
    "What specifically triggered this joy?",
    "Who would you like to share this happiness with?",
    "Capture this moment: what are you grateful for right now?",
    "How does this happiness feel in your body?",
    "What is a recent win you are proud of?",
    "If you could bottle this feeling, what would the label say?",
    "What is something you did today that you want to do again?",
    "Who helped make your day better?",
    "Describe your perfect day using today as inspiration.",
    "What is a strength you used today?",
    "How can you treat yourself to celebrate this mood?",
    "Write a short thank-you note to the universe (or yourself).",
    "What color is your mood today and why?",
    "How does it feel to be exactly where you are right now?"
  ],
  sad: [
    "What is a small kindness you can show yourself today?",
    "It's okay not to be okay. What do you need right now?",
    "If your sadness could speak, what would it say?",
    "What is one tiny thing that might bring a little comfort?",
    "Recall a time you overcame a difficult feeling. How did you do it?",
    "Write a letter to your future self about this moment.",
    "What feels heavy right now? meaningful? or just draining?",
    "Imagine wrapping yourself in a warm blanket. What does safety feel like?",
    "Who can you reach out to, even just to say 'hi'?",
    "What is one thing you can forgive yourself for today?",
    "If you could cry it all out, what would be left behind?",
    "What is a song that understands how you feel?",
    "Describe a place where you feel safe and calm.",
    "You are resilient. List 3 times you proved that.",
    "Just breathe. Write 'I am enough' three times."
  ],
  generic: [
    "What is on your mind right now?",
    "What is the most interesting thing that happened today?",
    "What are you looking forward to?",
    "Describe your surroundings in detail.",
    "What is a goal you are working towards?",
    "Who has inspired you recently and why?",
    "What is a habit you want to build?",
    "If you could change one thing about today, what would it be?",
    "What is a book, movie, or song that stuck with you recently?",
    "If you had an extra hour today, how would you spend it?",
    "What is a core memory from your childhood?",
    "Describe your dream home.",
    "What is a skill you wish you had?",
    "If you could travel anywhere right now, where would you go?",
    "What does 'success' mean to you today?",
    "Write about a coincidence that happened recently.",
    "What is the best advice you've ever received?"
  ]
};

export function generateSmartPrompt(analysis: UserAnalysis): string {
  const { recentMoods } = analysis;
  
  // 1. Determine the pool based on mood dominance
  // We mix specific prompts with generic ones to ensure variety even if the mood stays the same.
  let pool = PROMPTS.generic;

  if (recentMoods.some(m => ['Stressed', 'Anxious', 'Angry', 'Frustrated', 'Overwhelmed'].includes(m))) {
    pool = [...PROMPTS.stressed, ...PROMPTS.generic];
  } 
  else if (recentMoods.some(m => ['Happy', 'Excited', 'Grateful', 'Energetic', 'Proud', 'Calm'].includes(m))) {
    pool = [...PROMPTS.happy, ...PROMPTS.generic];
  } 
  else if (recentMoods.some(m => ['Sad', 'Lonely', 'Depressed', 'Tired', 'Grief', 'Bored'].includes(m))) {
    pool = [...PROMPTS.sad, ...PROMPTS.generic];
  }

  // 2. Pick a random prompt from the pool
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function getPromptExplanation(prompt: string, analysis: UserAnalysis): string {
  if (analysis.recentMoods.some(m => ['Stressed', 'Anxious', 'Overwhelmed'].includes(m))) {
    return "Based on your recent feelings of stress. Grounding yourself can help.";
  }
  if (analysis.recentMoods.some(m => ['Happy', 'Excited'].includes(m))) {
    return "We noticed you're feeling good! Let's build on that.";
  }
  if (analysis.recentMoods.some(m => ['Sad', 'Lonely'].includes(m))) {
    return "A gentle prompt for a tough time.";
  }
  
  return "A reflection question based on your recent journal history.";
}
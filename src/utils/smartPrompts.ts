import { JournalEntry } from "../stores/entriesStore";

interface UserAnalysis {
  recentMoods: string[];
  wordCountTrend: 'up' | 'down' | 'stable';
  lastTopics: string[];
}

export function analyzeForSmartPrompts(entries: JournalEntry[]): UserAnalysis {
  // Simple mock analysis for now
  const recent = entries.slice(0, 5);
  const moods = recent.map(e => e.moodTag?.value || '').filter(Boolean);
  
  return {
    recentMoods: moods,
    wordCountTrend: 'stable',
    lastTopics: []
  };
}

export function generateSmartPrompt(analysis: UserAnalysis): string {
  const { recentMoods } = analysis;
  
  if (recentMoods.includes('Stressed') || recentMoods.includes('Anxious')) {
    return "What is one thing within your control right now?";
  }
  
  if (recentMoods.includes('Happy') || recentMoods.includes('Excited')) {
    return "How can you carry this positive energy into tomorrow?";
  }
  
  if (recentMoods.includes('Sad') || recentMoods.includes('Lonely')) {
    return "What is a small kindness you can show yourself today?";
  }

  return "What is on your mind right now?";
}

export function getPromptExplanation(prompt: string, analysis: UserAnalysis): string {
  if (analysis.recentMoods.includes('Stressed')) {
    return "We noticed you've been feeling stressed. Grounding yourself can help.";
  }
  return "Based on your recent entries.";
}
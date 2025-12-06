// Define strict structure
export interface MoodOption {
  value: string;
  label: string;
}

export interface MoodCategory {
  id: string;
  name: string;
  color: string;
  moods: MoodOption[];
}

export const MOOD_CATEGORIES: Record<string, string[]> = {
  // Added Optimistic
  "High Energy Pleasant": ["Excited", "Happy", "Motivated", "Grateful", "Confident", "Energetic", "Optimistic"],
  // Added Focused, Reflective
  "Low Energy Pleasant": ["Calm", "Relaxed", "Content", "Peaceful", "Thoughtful", "Balanced", "Focused", "Reflective"],
  "High Energy Unpleasant": ["Anxious", "Stressed", "Frustrated", "Angry", "Overwhelmed", "Restless"],
  "Low Energy Unpleasant": ["Sad", "Tired", "Lonely", "Bored", "Disappointed", "Exhausted"]
};

export const MOOD_COLORS: Record<string, string> = {
  // High Energy Pleasant (Yellows/Oranges)
  Excited: '#F59E0B', Happy: '#FBBF24', Motivated: '#D97706',
  Grateful: '#FCD34D', Confident: '#B45309', Energetic: '#F59E0B',
  Optimistic: '#F59E0B', // New

  // Low Energy Pleasant (Greens)
  Calm: '#10B981', Relaxed: '#34D399', Content: '#059669',
  Peaceful: '#6EE7B7', Thoughtful: '#047857', Balanced: '#10B981',
  Focused: '#059669', Reflective: '#047857', // New

  // High Energy Unpleasant (Reds)
  Anxious: '#EF4444', Stressed: '#DC2626', Frustrated: '#B91C1C',
  Angry: '#991B1B', Overwhelmed: '#F87171', Restless: '#EF4444',

  // Low Energy Unpleasant (Blues)
  Sad: '#3B82F6', Tired: '#60A5FA', Lonely: '#2563EB',
  Bored: '#93C5FD', Disappointed: '#1D4ED8', Exhausted: '#3B82F6',
  
  // Default
  Neutral: '#94A3B8',
};

// Helper for Dropdowns
export const getMoodCategories = (isDark: boolean): MoodCategory[] => [
  {
    id: 'all',
    name: 'All Entries',
    color: isDark ? '#374151' : '#E5E7EB',
    moods: [{ value: 'all', label: 'All Entries' }]
  },
  {
    id: 'high_pleasant',
    name: 'Energetic & Positive',
    color: '#F59E0B',
    moods: MOOD_CATEGORIES["High Energy Pleasant"].map(m => ({ value: m, label: m }))
  },
  {
    id: 'low_pleasant',
    name: 'Calm & Positive',
    color: '#10B981',
    moods: MOOD_CATEGORIES["Low Energy Pleasant"].map(m => ({ value: m, label: m }))
  },
  {
    id: 'high_unpleasant',
    name: 'High Energy Difficult',
    color: '#EF4444',
    moods: MOOD_CATEGORIES["High Energy Unpleasant"].map(m => ({ value: m, label: m }))
  },
  {
    id: 'low_unpleasant',
    name: 'Low Energy Difficult',
    color: '#3B82F6',
    moods: MOOD_CATEGORIES["Low Energy Unpleasant"].map(m => ({ value: m, label: m }))
  },
];
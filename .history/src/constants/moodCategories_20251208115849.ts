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
  // Added Optimistic, Determined
  "High Energy Pleasant": ["Excited", "Happy", "Motivated", "Grateful", "Confident", "Energetic", "Optimistic", "Determined"],
  // Added Focused, Reflective, Hopeful, Nostalgic
  "Low Energy Pleasant": ["Calm", "Relaxed", "Content", "Peaceful", "Thoughtful", "Balanced", "Focused", "Reflective", "Hopeful", "Nostalgic"],
  "High Energy Unpleasant": ["Anxious", "Stressed", "Frustrated", "Angry", "Overwhelmed", "Restless"],
  "Low Energy Unpleasant": ["Sad", "Tired", "Lonely", "Bored", "Disappointed", "Exhausted"]
};

export const MOOD_COLORS: Record<string, string> = {
  // High Energy Pleasant (Yellows/Oranges)
  Excited: '#F59E0B', Happy: '#FBBF24', Motivated: '#D97706',
  Grateful: '#FCD34D', Confident: '#B45309', Energetic: '#F59E0B',
  Optimistic: '#F59E0B', Determined: '#EA580C', // New

  // Low Energy Pleasant (Greens/Teals)
  Calm: '#10B981', Relaxed: '#34D399', Content: '#059669',
  Peaceful: '#6EE7B7', Thoughtful: '#047857', Balanced: '#10B981',
  Focused: '#059669', Reflective: '#047857', 
  Hopeful: '#2DD4BF', Nostalgic: '#0D9488', // New

  // High Energy Unpleasant (Reds)
  Anxious: '#EF4444', Stressed: '#DC2626', Frustrated: '#B91C1C',
  Angry: '#991B1B', Overwhelmed: '#F87171', Restless: '#EF4444',

  // Low Energy Unpleasant (Blues)
  Sad: '#3B82F6', Tired: '#60A5FA', Lonely: '#2563EB',
  Bored: '#93C5FD', Disappointed: '#1D4ED8', Exhausted: '#3B82F6',
  
  // Default
  Neutral: '#94A3B8',
};
// Maps specific moods to Spotify Playlist URLs (Generic Mood Playlists)
export const MOOD_PLAYLISTS: Record<string, { url: string; label: string }> = {
  // High Energy Pleasant
  Excited: { url: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC', label: 'Happy Hits' },
  Happy: { url: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC', label: 'Happy Hits' },
  Motivated: { url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO', label: 'Peaceful Piano' },
  Energetic: { url: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP', label: 'Beast Mode' },
  
  // Low Energy Pleasant
  Calm: { url: 'https://open.spotify.com/playlist/37i9dQZF1DWV7EzJMK2FUI', label: 'Calming Acoustic' },
  Relaxed: { url: 'https://open.spotify.com/playlist/37i9dQZF1DWV7EzJMK2FUI', label: 'Calming Acoustic' },
  Focused: { url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO', label: 'Deep Focus' },
  Reflective: { url: 'https://open.spotify.com/playlist/37i9dQZF1DWV7EzJMK2FUI', label: 'Quiet Moments' },

  // High Energy Unpleasant (Shift state -> Calming)
  Anxious: { url: 'https://open.spotify.com/playlist/37i9dQZF1DWV7EzJMK2FUI', label: 'Calming Acoustic' },
  Stressed: { url: 'https://open.spotify.com/playlist/37i9dQZF1DWU0ScTcjJBdj', label: 'Relax & Unwind' },
  Angry: { url: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP', label: 'Workout/Release' },

  // Low Energy Unpleasant (Match or Shift)
  Sad: { url: 'https://open.spotify.com/playlist/37i9dQZF1DWSqBruwoIXkA', label: 'Sad Songs' },
  Tired: { url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO', label: 'Peaceful Piano' },
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
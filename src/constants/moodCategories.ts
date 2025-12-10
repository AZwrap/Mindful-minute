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
  "High Energy Pleasant": ["Excited", "Happy", "Motivated", "Grateful", "Confident", "Energetic", "Optimistic", "Determined"],
  "Low Energy Pleasant": ["Calm", "Relaxed", "Content", "Peaceful", "Thoughtful", "Balanced", "Focused", "Reflective", "Hopeful", "Nostalgic"],
  "High Energy Unpleasant": ["Anxious", "Stressed", "Frustrated", "Angry", "Overwhelmed", "Restless"],
  "Low Energy Unpleasant": ["Sad", "Tired", "Lonely", "Bored", "Disappointed", "Exhausted"]
};

export const MOOD_COLORS: Record<string, string> = {
  // High Energy Pleasant
  Excited: '#F59E0B', Happy: '#FBBF24', Motivated: '#D97706',
  Grateful: '#FCD34D', Confident: '#B45309', Energetic: '#F59E0B',
  Optimistic: '#F59E0B', Determined: '#EA580C',

  // Low Energy Pleasant
  Calm: '#10B981', Relaxed: '#34D399', Content: '#059669',
  Peaceful: '#6EE7B7', Thoughtful: '#047857', Balanced: '#10B981',
  Focused: '#059669', Reflective: '#047857', 
  Hopeful: '#2DD4BF', Nostalgic: '#0D9488',

  // High Energy Unpleasant
  Anxious: '#EF4444', Stressed: '#DC2626', Frustrated: '#B91C1C',
  Angry: '#991B1B', Overwhelmed: '#F87171', Restless: '#EF4444',

  // Low Energy Unpleasant
  Sad: '#3B82F6', Tired: '#60A5FA', Lonely: '#2563EB',
  Bored: '#93C5FD', Disappointed: '#1D4ED8', Exhausted: '#3B82F6',
  
  // Default
  Neutral: '#94A3B8',
};

// --- 1. SEARCH TERMS ---
// Optimized search queries that work across most platforms
export const MOOD_SEARCH_TERMS: Record<string, string> = {
  // High Energy Pleasant
  Excited: 'Upbeat Pop Hits',
  Happy: 'Feel Good Songs',
  Motivated: 'Motivational Workout',
  Confident: 'Confidence Boost',
  Energetic: 'High Energy Hits',
  Optimistic: 'Sunny Day Vibes',
  Determined: 'Epic Cinematic',
  Grateful: 'Acoustic Soul',

  // Low Energy Pleasant
  Calm: 'Calming Acoustic',
  Relaxed: 'Chill Lo-Fi',
  Content: 'Coffee Shop Jazz',
  Peaceful: 'Nature Sounds Piano',
  Focused: 'Deep Focus Instrumental',
  Reflective: 'Melancholy Piano',
  Hopeful: 'Uplifting Instrumental',
  Nostalgic: '80s 90s Throwback',
  Balanced: 'Yoga Flow',
  Thoughtful: 'Indie Folk',

  // High Energy Unpleasant (Shift State)
  Anxious: 'Stress Relief Frequencies',
  Stressed: 'Ambient Relaxation',
  Frustrated: 'Rock Anthems',
  Angry: 'Intense Metal Workout',
  Overwhelmed: 'Deep Breathing Music',
  Restless: 'Rhythmic Drumming',

  // Low Energy Unpleasant (Comfort)
  Sad: 'Sad Songs Acoustic',
  Tired: 'Gentle Wake Up',
  Lonely: 'Comforting Indie',
  Bored: 'Discover Weekly',
  Disappointed: 'Soul and Blues',
  Exhausted: 'Deep Sleep Waves',
};

// --- 2. PROVIDER SUPPORT ---
export type MusicProvider = 
  | 'spotify' 
  | 'apple' 
  | 'youtube' 
  | 'deezer' 
  | 'tidal' 
  | 'amazon' 
  | 'qobuz' 
  | 'soundcloud' 
  | 'pandora';

export const getMusicLink = (term: string, provider: MusicProvider): string => {
  const encoded = encodeURIComponent(term);
  
  switch (provider) {
    case 'spotify':
      return `spotify:search:${encoded}`;
      
    case 'apple':
      return `https://music.apple.com/us/search?term=${encoded}`;
      
    case 'youtube':
      return `https://music.youtube.com/search?q=${encoded}`;
      
    case 'deezer':
      // Deezer Universal Link
      return `https://www.deezer.com/search/${encoded}`;
      
    case 'tidal':
      // Tidal Web Search (redirects to app)
      return `https://listen.tidal.com/search?q=${encoded}`;
      
    case 'amazon':
      // Amazon Music Search
      return `https://music.amazon.com/search/${encoded}`;
      
    case 'qobuz':
      return `https://open.qobuz.com/search?q=${encoded}`;
      
    case 'soundcloud':
      return `https://soundcloud.com/search?q=${encoded}`;
      
    case 'pandora':
      return `https://www.pandora.com/search/${encoded}`;
      
    default:
      // Fallback to Spotify web if provider is unknown
      return `https://open.spotify.com/search/${encoded}`;
  }
};

// --- 3. MAIN HELPER ---
export const getRecommendedPlaylist = (mood: string, provider: MusicProvider = 'spotify') => {
  if (!mood) return null;
  const normalized = mood.toLowerCase();

  // Find term by key
  const exactKey = Object.keys(MOOD_SEARCH_TERMS).find(k => k.toLowerCase() === normalized);
  let term = exactKey ? MOOD_SEARCH_TERMS[exactKey] : null;

  // Fallback heuristics if no exact match
  if (!term) {
    if (normalized.includes('tired') || normalized.includes('sleep')) term = 'Deep Sleep';
    else if (normalized.includes('stress') || normalized.includes('anxious')) term = 'Calming Piano';
    else if (normalized.includes('happy') || normalized.includes('good')) term = 'Feel Good Hits';
    else term = 'Relaxing Music'; // Ultimate fallback
  }

  return {
    label: term,
    url: getMusicLink(term, provider)
  };
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
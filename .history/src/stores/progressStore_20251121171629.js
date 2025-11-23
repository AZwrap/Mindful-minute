import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'progress_state_v1';

const computeLevel = (xp) => Math.floor(xp / 100) + 1;
const computeTier = (lvl) =>
  lvl <= 3 ? 'seed' : lvl <= 6 ? 'sprout' : lvl <= 9 ? 'bloom' : lvl <= 12 ? 'grove' : 'aurora';

// Achievement definitions
const ACHIEVEMENTS = {
  // CONSISTENCY ACHIEVEMENTS (4 total)
  first_entry: {
    id: 'first_entry',
    name: 'First Reflection',
    description: 'Write your first journal entry',
    icon: '📝',
    category: 'consistency',
    tier: 'bronze'
  },
  three_day_streak: {
    id: 'three_day_streak', 
    name: 'Building Routine',
    description: 'Write for 3 consecutive days',
    icon: '🔥',
    category: 'consistency',
    tier: 'bronze'
  },
  weekly_rhythm: {
    id: 'weekly_rhythm',
    name: 'Weekly Rhythm', 
    description: 'Write 7 days in a month',
    icon: '📅',
    category: 'consistency',
    tier: 'silver'
  },
  month_streak: {
    id: 'month_streak',
    name: 'Dedicated Practice',
    description: 'Write for 30 consecutive days',
    icon: '🌟',
    category: 'consistency',
    tier: 'gold'
  },

  // DEPTH ACHIEVEMENTS (3 total)
  thoughtful: {
    id: 'thoughtful',
    name: 'Thoughtful',
    description: 'Write 100+ words in an entry',
    icon: '💭',
    category: 'depth',
    tier: 'bronze'
  },
  storyteller: {
    id: 'storyteller',
    name: 'Storyteller',
    description: 'Write 500+ words total',
    icon: '📖',
    category: 'depth',
    tier: 'silver'
  },
  word_master: {
    id: 'word_master',
    name: 'Word Master',
    description: 'Write 1000+ words total',
    icon: '✍️',
    category: 'depth',
    tier: 'gold'
  },

  // RANGE ACHIEVEMENTS (3 total)
  emotional_explorer: {
    id: 'emotional_explorer',
    name: 'Emotional Explorer',
    description: 'Use 5 different moods',
    icon: '🎭',
    category: 'range',
    tier: 'silver'
  },
  mood_master: {
    id: 'mood_master',
    name: 'Mood Master',
    description: 'Use all predefined moods',
    icon: '🌈',
    category: 'range',
    tier: 'gold'
  },
  balanced_perspective: {
    id: 'balanced_perspective',
    name: 'Balanced Perspective',
    description: 'Write in both positive and challenging moods',
    icon: '⚖️',
    category: 'range',
    tier: 'bronze'
  },

  // MINDFULNESS ACHIEVEMENTS (3 total)
  mindful_starter: {
    id: 'mindful_starter',
    name: 'Mindful Starter',
    description: 'Complete your first timed session',
    icon: '⏱️',
    category: 'mindfulness',
    tier: 'bronze'
  },
  present_moment: {
    id: 'present_moment',
    name: 'Present Moment',
    description: 'Use timer 10 times',
    icon: '🧘',
    category: 'mindfulness',
    tier: 'silver'
  },
  meditation_master: {
    id: 'meditation_master',
    name: 'Meditation Master',
    description: 'Use timer 25 times',
    icon: '🙏',
    category: 'mindfulness',
    tier: 'gold'
  },

  // PATTERNS ACHIEVEMENTS (3 total)
  morning_person: {
    id: 'morning_person',
    name: 'Morning Person',
    description: 'Write 5 morning entries (5am-12pm)',
    icon: '🌅',
    category: 'patterns',
    tier: 'silver'
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Write 5 evening entries (9pm-5am)',
    icon: '🌙',
    category: 'patterns',
    tier: 'silver'
  },
  weekend_writer: {
    id: 'weekend_writer',
    name: 'Weekend Writer',
    description: 'Write entries on both Saturday and Sunday',
    icon: '📆',
    category: 'patterns',
    tier: 'bronze'
  }
};

const defaultState = {
  totalXP: 0,
  level: 1,
  tier: 'seed',
  lastEntryDate: null,
  streak: 0,
  // Achievement state
  achievements: {
    unlocked: [],
    progress: {
      totalEntries: 0,
      differentMoods: [],
      morningEntries: 0,
      eveningEntries: 0,
      timedSessions: 0,
      entriesThisMonth: 0,
      currentMonth: new Date().getMonth()
    },
    // ADD MASTERY TRACKING
    mastery: {
      consistency: { unlocked: false, progress: 0, total: 0 },
      depth: { unlocked: false, progress: 0, total: 0 },
      range: { unlocked: false, progress: 0, total: 0 },
      mindfulness: { unlocked: false, progress: 0, total: 0 },
      patterns: { unlocked: false, progress: 0, total: 0 }
    }
  }
};

async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : defaultState;
  } catch {
    return defaultState;
  }
}

async function saveState(state) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

export const useProgress = create((set, get) => ({
  ...defaultState,
  init: async () => { const s = await loadState(); set(s); },
  reset: async () => { await saveState(defaultState); set(defaultState); },
  
  applyDailySave: ({ date, moodTagged, force = false, wordCount = 0, mood = null, usedTimer = false, entryHour = null }) => {
    const s = { ...get() };
    
    // Reset monthly counter if new month
    const currentMonth = new Date().getMonth();
    if (currentMonth !== s.achievements.progress.currentMonth) {
      s.achievements.progress.entriesThisMonth = 0;
      s.achievements.progress.currentMonth = currentMonth;
    }

    // If we already finalized today AND not forcing, skip XP
    if (!force && s.lastEntryDate === date) {
      return { xpGained: 0, levelUp: false, tierChanged: null, streakNow: s.streak, newAchievements: [] };
    }

    const last = s.lastEntryDate ? new Date(`${s.lastEntryDate}T00:00:00`) : null;
    const cur = new Date(`${date}T00:00:00`);
    let nextStreak = s.streak;
    if (!last) nextStreak = 1;
    else {
      const diffDays = Math.round((cur - last) / 86400000);
      nextStreak = diffDays === 1 ? s.streak + 1 : 1;
    }

    let xp = 10;
    if (moodTagged) xp += 2;
    if (nextStreak >= 4 && nextStreak <= 6) xp += 2;
    else if (nextStreak >= 7) xp += 5;

    const totalXP = s.totalXP + xp;
    const level   = Math.floor(totalXP / 100) + 1;
    const tier    = level <= 3 ? 'seed' : level <= 6 ? 'sprout' : level <= 9 ? 'bloom' : level <= 12 ? 'grove' : 'aurora';
    const levelUp = level > s.level;
    const tierChanged = tier !== s.tier ? { from: s.tier, to: tier } : null;

    // Update achievement progress
    const newProgress = {
      ...s.achievements.progress,
      totalEntries: s.achievements.progress.totalEntries + 1,
      entriesThisMonth: s.achievements.progress.entriesThisMonth + 1
    };

    // Track mood diversity
    if (mood && !s.achievements.progress.differentMoods.includes(mood)) {
      newProgress.differentMoods = [...s.achievements.progress.differentMoods, mood];
    }

    // Track time patterns
    if (entryHour !== null) {
      if (entryHour >= 5 && entryHour < 12) {
        newProgress.morningEntries = s.achievements.progress.morningEntries + 1;
      } else if (entryHour >= 21 || entryHour < 5) {
        newProgress.eveningEntries = s.achievements.progress.eveningEntries + 1;
      }
    }

    // Track timer usage
    if (usedTimer) {
      newProgress.timedSessions = s.achievements.progress.timedSessions + 1;
    }

    // Check for new achievements
    const newAchievements = checkNewAchievements(s.achievements.unlocked, newProgress, wordCount, nextStreak);

    const updated = { 
      totalXP, 
      level, 
      tier, 
      lastEntryDate: date, 
      streak: nextStreak,
      achievements: {
        unlocked: [...s.achievements.unlocked, ...newAchievements],
        progress: newProgress
      }
    };
    
applyDailySave: ({ date, moodTagged, force = false, wordCount = 0, mood = null, usedTimer = false, entryHour = null }) => {
  const s = { ...get() };
  
  // Reset monthly counter if new month
  const currentMonth = new Date().getMonth();
  if (currentMonth !== s.achievements.progress.currentMonth) {
    s.achievements.progress.entriesThisMonth = 0;
    s.achievements.progress.currentMonth = currentMonth;
  }

  // If we already finalized today AND not forcing, skip XP
  if (!force && s.lastEntryDate === date) {
    return { xpGained: 0, levelUp: false, tierChanged: null, streakNow: s.streak, newAchievements: [] };
  }

  const last = s.lastEntryDate ? new Date(`${s.lastEntryDate}T00:00:00`) : null;
  const cur = new Date(`${date}T00:00:00`);
  let nextStreak = s.streak;
  if (!last) nextStreak = 1;
  else {
    const diffDays = Math.round((cur - last) / 86400000);
    nextStreak = diffDays === 1 ? s.streak + 1 : 1;
  }

  let xp = 10;
  if (moodTagged) xp += 2;
  if (nextStreak >= 4 && nextStreak <= 6) xp += 2;
  else if (nextStreak >= 7) xp += 5;

  const totalXP = s.totalXP + xp;
  const level   = Math.floor(totalXP / 100) + 1;
  const tier    = level <= 3 ? 'seed' : level <= 6 ? 'sprout' : level <= 9 ? 'bloom' : level <= 12 ? 'grove' : 'aurora';
  const levelUp = level > s.level;
  const tierChanged = tier !== s.tier ? { from: s.tier, to: tier } : null;

  // Update achievement progress
  const newProgress = {
    ...s.achievements.progress,
    totalEntries: s.achievements.progress.totalEntries + 1,
    entriesThisMonth: s.achievements.progress.entriesThisMonth + 1
  };

  // Track mood diversity
  if (mood && !s.achievements.progress.differentMoods.includes(mood)) {
    newProgress.differentMoods = [...s.achievements.progress.differentMoods, mood];
  }

  // Track time patterns
  if (entryHour !== null) {
    if (entryHour >= 5 && entryHour < 12) {
      newProgress.morningEntries = s.achievements.progress.morningEntries + 1;
    } else if (entryHour >= 21 || entryHour < 5) {
      newProgress.eveningEntries = s.achievements.progress.eveningEntries + 1;
    }
  }

  // Track timer usage
  if (usedTimer) {
    newProgress.timedSessions = s.achievements.progress.timedSessions + 1;
  }

  // Check for new achievements
  const newAchievements = checkNewAchievements(s.achievements.unlocked, newProgress, wordCount, nextStreak);

  const updated = { 
    totalXP, 
    level, 
    tier, 
    lastEntryDate: date, 
    streak: nextStreak,
    achievements: {
      unlocked: [...s.achievements.unlocked, ...newAchievements],
      progress: newProgress
    }
  };
  
  // Save without await (fire and forget)
  saveState(updated);
  set(updated);

  return { 
    xpGained: xp, 
    levelUp, 
    tierChanged, 
    streakNow: nextStreak,
    newAchievements: newAchievements.map(id => ACHIEVEMENTS[id])
  };
},
    set(updated);

    return { 
      xpGained: xp, 
      levelUp, 
      tierChanged, 
      streakNow: nextStreak,
      newAchievements: newAchievements.map(id => ACHIEVEMENTS[id])
    };
  },

  // Get achievement data for display
  getAchievements: () => {
  const state = get();
  
  // Calculate mastery progress
  const mastery = {
    consistency: { unlocked: false, progress: 0, total: 0 },
    depth: { unlocked: false, progress: 0, total: 0 },
    range: { unlocked: false, progress: 0, total: 0 },
    mindfulness: { unlocked: false, progress: 0, total: 0 },
    patterns: { unlocked: false, progress: 0, total: 0 }
  };

  // Count achievements per category
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    if (mastery[achievement.category]) {
      mastery[achievement.category].total++;
      if (state.achievements.unlocked.includes(achievement.id)) {
        mastery[achievement.category].progress++;
      }
    }
  });

  // Check if mastery is unlocked (all achievements in category)
  Object.keys(mastery).forEach(category => {
    mastery[category].unlocked = mastery[category].progress === mastery[category].total;
  });

  return {
    unlocked: state.achievements.unlocked.map(id => ACHIEVEMENTS[id]),
    progress: state.achievements.progress,
    allAchievements: ACHIEVEMENTS,
    mastery: mastery
  };
}
}));

// Achievement checking logic
function checkNewAchievements(unlocked, progress, wordCount, streak) {
  const newAchievements = [];

  // First entry
  if (progress.totalEntries >= 1 && !unlocked.includes('first_entry')) {
    newAchievements.push('first_entry');
  }

  // 3-day streak
  if (streak >= 3 && !unlocked.includes('three_day_streak')) {
    newAchievements.push('three_day_streak');
  }

  // Weekly rhythm (7 entries this month)
  if (progress.entriesThisMonth >= 7 && !unlocked.includes('weekly_rhythm')) {
    newAchievements.push('weekly_rhythm');
  }

  // Thoughtful writing (100+ words)
  if (wordCount >= 100 && !unlocked.includes('thoughtful')) {
    newAchievements.push('thoughtful');
  }

  // Emotional explorer (5 different moods)
  if (progress.differentMoods.length >= 5 && !unlocked.includes('emotional_explorer')) {
    newAchievements.push('emotional_explorer');
  }

  // Mindful starter (first timer session)
  if (progress.timedSessions >= 1 && !unlocked.includes('mindful_starter')) {
    newAchievements.push('mindful_starter');
  }

  // Morning person
  if (progress.morningEntries >= 5 && !unlocked.includes('morning_person')) {
    newAchievements.push('morning_person');
  }

  // Night owl  
  if (progress.eveningEntries >= 5 && !unlocked.includes('night_owl')) {
    newAchievements.push('night_owl');
  }

  return newAchievements;
}
import { JournalEntry } from "../stores/entriesStore";

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface WeekBoundaries {
  start: Date;
  end: Date;
}

interface RecapStats {
  totalEntries: number;
  totalWords: number;
  averageWords: number;
  moodFrequency: Record<string, number>;
  mostCommonMood: string | null;
  mostActiveDay: string | null;
  insights: string[];
}

interface WeeklyRecapResult {
  hasData: boolean;
  message: string;
  stats: RecapStats;
}

// --------------------------------------------------
// LOGIC
// --------------------------------------------------
export const generateWeeklyRecap = (
  entries: JournalEntry[], 
  startDate: Date, 
  endDate: Date
): WeeklyRecapResult => {
  const weekEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });

  if (weekEntries.length === 0) {
    return {
      hasData: false,
      message: "No entries this week. Start writing to see your weekly recap!",
      stats: {
        totalEntries: 0,
        totalWords: 0,
        averageWords: 0,
        moodFrequency: {},
        mostCommonMood: null,
        mostActiveDay: null,
        insights: []
      }
    };
  }

  // Calculate basic stats
  const totalWords = weekEntries.reduce((sum, entry) => 
    sum + (entry.text?.split(/\s+/).length || 0), 0
  );
  const totalEntries = weekEntries.length;
  const averageWords = Math.round(totalWords / totalEntries);
  
  // Mood analysis
  const moodFrequency: Record<string, number> = {};
  weekEntries.forEach(entry => {
    if (entry.moodTag?.value) {
      const mood = entry.moodTag.value.toLowerCase();
      moodFrequency[mood] = (moodFrequency[mood] || 0) + 1;
    }
  });

  const mostCommonMood = Object.keys(moodFrequency).length > 0 
    ? Object.keys(moodFrequency).reduce((a, b) => moodFrequency[a] > moodFrequency[b] ? a : b)
    : null;

  // Writing patterns
  const dayCounts: Record<string, number> = {};
  weekEntries.forEach(entry => {
    // Note: Creating date from YYYY-MM-DD string is usually local time in JS, 
    // but explicit parsing is safer if timezone issues arise. 
    // For now, standard Date parsing works for this format.
    const day = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const mostActiveDay = Object.keys(dayCounts).length > 0
    ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b)
    : null;

  // Generate insights
  const insights = generateInsights({
    totalEntries,
    averageWords,
    moodFrequency,
    mostActiveDay
  });

  return {
    hasData: true,
    message: generateRecapMessage({
      totalWords,
      totalEntries,
      averageWords,
      mostCommonMood,
      mostActiveDay
    }),
    stats: {
      totalWords,
      totalEntries,
      averageWords,
      moodFrequency,
      mostCommonMood,
      mostActiveDay,
      insights
    }
  };
};

const generateRecapMessage = (stats: { 
  totalWords: number; 
  totalEntries: number; 
  averageWords: number; 
  mostCommonMood: string | null; 
  mostActiveDay: string | null; 
}): string => {
  const { totalWords, totalEntries, averageWords, mostCommonMood, mostActiveDay } = stats;
  
  let message = `This week you wrote ${totalWords} words across ${totalEntries} ${totalEntries === 1 ? 'entry' : 'entries'}.`;
  
  if (averageWords > 0) {
    message += ` Your average entry was ${averageWords} words.`;
  }
  
  if (mostCommonMood) {
    message += ` Your most common mood was ${mostCommonMood}.`;
  }
  
  if (mostActiveDay) {
    message += ` You wrote most often on ${mostActiveDay}s.`;
  }
  
  return message;
};

const generateInsights = (stats: { 
  totalEntries: number; 
  averageWords: number; 
  moodFrequency: Record<string, number>; 
  mostActiveDay: string | null; 
}): string[] => {
  const insights: string[] = [];
  const { totalEntries, averageWords, moodFrequency, mostActiveDay } = stats;

  // Entry frequency insights
  if (totalEntries >= 5) {
    insights.push("Great consistency! You wrote almost every day this week.");
  } else if (totalEntries >= 3) {
    insights.push("Good writing rhythm! You maintained regular journaling.");
  } else if (totalEntries === 1) {
    insights.push("Every entry counts! Consider adding one more next week.");
  }

  // Writing depth insights
  if (averageWords > 100) {
    insights.push("You're writing deeply reflective entries. Keep it up!");
  } else if (averageWords > 50) {
    insights.push("Your entries show good depth and thoughtfulness.");
  } else if (averageWords > 20) {
    insights.push("You're capturing meaningful moments concisely.");
  }

  // Mood diversity insights
  const uniqueMoods = Object.keys(moodFrequency).length;
  if (uniqueMoods >= 3) {
    insights.push(`You expressed ${uniqueMoods} different moods this week.`);
  }

  // Writing pattern insights
  if (mostActiveDay === 'Saturday' || mostActiveDay === 'Sunday') {
    insights.push("You prefer weekend reflection time.");
  } else if (mostActiveDay) {
    insights.push(`Your most productive writing day was ${mostActiveDay}.`);
  }

  return insights.slice(0, 3); // Return top 3 insights
};

// Get week boundaries for any date
export const getWeekBoundaries = (date = new Date()): WeekBoundaries => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// Get previous week boundaries
export const getPreviousWeekBoundaries = (): WeekBoundaries => {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  return getWeekBoundaries(lastWeek);
};
import { analyzeSentiment } from './smartPrompts';

export const generateWeeklyRecap = (entries, startDate, endDate) => {
  const weekEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });

  if (weekEntries.length === 0) {
    return {
      hasData: false,
      message: "No entries this week. Start writing to see your weekly recap!",
      stats: {}
    };
  }

  // Calculate basic stats
  const totalWords = weekEntries.reduce((sum, entry) => 
    sum + (entry.text?.split(/\s+/).length || 0), 0
  );
  const totalEntries = weekEntries.length;
  const averageWords = Math.round(totalWords / totalEntries);
  
  // Mood analysis
  const moodFrequency = {};
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
  const dayCounts = {};
  weekEntries.forEach(entry => {
    const day = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  const mostActiveDay = Object.keys(dayCounts).length > 0
    ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b)
    : null;

  // Sentiment analysis
  const allText = weekEntries.map(entry => entry.text || '').join(' ');
  const sentiment = analyzeSentiment(allText);

  // Generate insights
  const insights = generateInsights({
    totalWords,
    totalEntries,
    averageWords,
    moodFrequency,
    mostCommonMood,
    mostActiveDay,
    sentiment
  });

  return {
    hasData: true,
    message: generateRecapMessage({
      totalWords,
      totalEntries,
      averageWords,
      mostCommonMood,
      mostActiveDay,
      sentiment
    }),
    stats: {
      totalWords,
      totalEntries,
      averageWords,
      moodFrequency,
      mostCommonMood,
      mostActiveDay,
      sentiment,
      insights
    }
  };
};

const generateRecapMessage = (stats) => {
  const { totalWords, totalEntries, averageWords, mostCommonMood, mostActiveDay, sentiment } = stats;
  
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
  
  if (sentiment === 'positive') {
    message += ` Your writing had a positive tone this week.`;
  } else if (sentiment === 'negative') {
    message += ` Your writing reflected some challenges this week.`;
  } else {
    message += ` Your writing showed balanced emotions this week.`;
  }
  
  return message;
};

const generateInsights = (stats) => {
  const insights = [];
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
export const getWeekBoundaries = (date = new Date()) => {
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
export const getPreviousWeekBoundaries = () => {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  return getWeekBoundaries(lastWeek);
};
// src/utils/moodAnalysis.js
import { analyzeSentiment } from './smartPrompts';

// Analyze correlations between moods, writing patterns, and timing
export const analyzeMoodCorrelations = (entries) => {
  console.log('analyzeMoodCorrelations called with entries:', entries?.length);
  
  if (!entries || entries.length < 5) {
    return {
      moodPatterns: {},
      timeCorrelations: {},
      writingCorrelations: {},
      insights: ["Write a few more entries to see mood patterns emerge"]
    };
  }

  const recentEntries = entries.slice(0, 50);
  const moodPatterns = {};
  const timeCorrelations = {};
  const writingCorrelations = {
    moodToLength: {},
    moodToSentiment: {},
    moodToThemes: {}
  };

  recentEntries.forEach((entry, index) => {
    if (entry.moodTag?.value) {
      const mood = entry.moodTag.value.toLowerCase();
      
      moodPatterns[mood] = moodPatterns[mood] || { count: 0, entries: [] };
      moodPatterns[mood].count++;
      moodPatterns[mood].entries.push(entry);

      const hour = new Date(entry.createdAt).getHours();
      const timeOfDay = getTimeOfDay(hour);
      timeCorrelations[timeOfDay] = timeCorrelations[timeOfDay] || {};
      timeCorrelations[timeOfDay][mood] = (timeCorrelations[timeOfDay][mood] || 0) + 1;

      if (entry.text) {
        const wordCount = entry.text.split(' ').length;
        const sentiment = analyzeSentiment(entry.text);
        
        writingCorrelations.moodToLength[mood] = writingCorrelations.moodToLength[mood] || [];
        writingCorrelations.moodToLength[mood].push(wordCount);
        
        writingCorrelations.moodToSentiment[mood] = writingCorrelations.moodToSentiment[mood] || {};
        writingCorrelations.moodToSentiment[mood][sentiment] = (writingCorrelations.moodToSentiment[mood][sentiment] || 0) + 1;
      }
    }
  });

  const insights = generateMoodInsights(moodPatterns, timeCorrelations, writingCorrelations, recentEntries);
  
  return {
    moodPatterns: calculateMoodStatistics(moodPatterns),
    timeCorrelations: calculateTimeStatistics(timeCorrelations),
    writingCorrelations: calculateWritingStatistics(writingCorrelations),
    insights,
    moodTransitions: analyzeMoodTransitions(recentEntries)
  };
};

export const getMoodCorrelationSummary = (entries) => {
  const analysis = analyzeMoodCorrelations(entries);
  return {
    totalMoodsTracked: Object.keys(analysis.moodPatterns).length,
    mostCommonMood: Object.keys(analysis.moodPatterns).sort((a, b) => 
      analysis.moodPatterns[b].frequency - analysis.moodPatterns[a].frequency
    )[0] || 'None',
    strongestPattern: analysis.insights[0] || 'No patterns yet',
    timePatterns: analysis.timeCorrelations
  };
};

// Helper functions (keep these as regular functions, not exported)
const getTimeOfDay = (hour) => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
};

const calculateMoodStatistics = (moodPatterns) => {
  const stats = {};
  Object.keys(moodPatterns).forEach(mood => {
    const entries = moodPatterns[mood].entries;
    const wordCounts = entries.map(e => e.text?.split(' ').length || 0);
    const avgLength = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    
    stats[mood] = {
      frequency: moodPatterns[mood].count,
      averageLength: Math.round(avgLength),
      mostCommonTime: findMostCommonTime(entries)
    };
  });
  return stats;
};

const calculateTimeStatistics = (timeCorrelations) => {
  const stats = {};
  Object.keys(timeCorrelations).forEach(time => {
    const moods = timeCorrelations[time];
    const total = Object.values(moods).reduce((a, b) => a + b, 0);
    const dominantMood = Object.keys(moods).reduce((a, b) => moods[a] > moods[b] ? a : b);
    
    stats[time] = {
      totalEntries: total,
      dominantMood,
      moodDistribution: moods
    };
  });
  return stats;
};

const calculateWritingStatistics = (writingCorrelations) => {
  const stats = {};
  
  Object.keys(writingCorrelations.moodToLength).forEach(mood => {
    const lengths = writingCorrelations.moodToLength[mood];
    const average = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    stats[mood] = {
      averageLength: Math.round(average),
      sentimentPattern: writingCorrelations.moodToSentiment[mood]
    };
  });
  
  return stats;
};

const analyzeMoodTransitions = (entries) => {
  const transitions = {};
  const moodEntries = entries.filter(e => e.moodTag?.value);
  
  for (let i = 1; i < moodEntries.length; i++) {
    const prevMood = moodEntries[i-1].moodTag.value.toLowerCase();
    const currentMood = moodEntries[i].moodTag.value.toLowerCase();
    const key = `${prevMood}→${currentMood}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }
  
  return transitions;
};

const findMostCommonTime = (entries) => {
  const timeCounts = {};
  entries.forEach(entry => {
    const hour = new Date(entry.createdAt).getHours();
    const time = getTimeOfDay(hour);
    timeCounts[time] = (timeCounts[time] || 0) + 1;
  });
  
  return Object.keys(timeCounts).reduce((a, b) => timeCounts[a] > timeCounts[b] ? a : b, 'unknown');
};

const generateMoodInsights = (moodPatterns, timeCorrelations, writingCorrelations, entries) => {
  const insights = [];
  
  const moodFrequencies = Object.keys(moodPatterns)
    .map(mood => ({ mood, count: moodPatterns[mood].count }))
    .sort((a, b) => b.count - a.count);
  
  if (moodFrequencies.length > 0) {
    insights.push(`Your most common mood is ${moodFrequencies[0].mood}`);
  }
  
  Object.keys(timeCorrelations).forEach(time => {
    const data = timeCorrelations[time];
    if (Object.keys(data).length > 0) {
      const dominantMood = Object.keys(data).reduce((a, b) => data[a] > data[b] ? a : b);
      insights.push(`You often feel ${dominantMood} in the ${time}`);
    }
  });
  
  Object.keys(writingCorrelations.moodToLength).forEach(mood => {
    const avgLength = writingCorrelations.moodToLength[mood].reduce((a, b) => a + b, 0) / writingCorrelations.moodToLength[mood].length;
    if (avgLength > 80) {
      insights.push(`You write longer entries when feeling ${mood}`);
    } else if (avgLength < 30) {
      insights.push(`Your ${mood} entries tend to be more concise`);
    }
  });
  
  const moodEntries = entries.filter(e => e.moodTag?.value);
  if (moodEntries.length >= 10) {
    const commonTransitions = analyzeCommonTransitions(moodEntries);
    if (commonTransitions.length > 0) {
      insights.push(`You often move from ${commonTransitions[0].from} to ${commonTransitions[0].to}`);
    }
  }
  
  return insights.slice(0, 5);
};

const analyzeCommonTransitions = (moodEntries) => {
  const transitions = {};
  for (let i = 1; i < moodEntries.length; i++) {
    const from = moodEntries[i-1].moodTag.value.toLowerCase();
    const to = moodEntries[i].moodTag.value.toLowerCase();
    const key = `${from}→${to}`;
    transitions[key] = (transitions[key] || 0) + 1;
  }
  
  return Object.keys(transitions)
    .map(key => ({
      from: key.split('→')[0],
      to: key.split('→')[1],
      count: transitions[key]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
};
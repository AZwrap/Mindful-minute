// src/utils/moodAnalysis.js - SUPER SIMPLE VERSION
export const analyzeMoodCorrelations = (entries) => {
  console.log('analyzeMoodCorrelations called with entries:', entries?.length);
  
  // Return simple data structure for now
  return {
    moodPatterns: {},
    timeCorrelations: {},
    writingCorrelations: {},
    insights: ["Write a few more entries to see mood patterns emerge"],
    moodTransitions: {}
  };
};

export const getMoodCorrelationSummary = (entries) => {
  const analysis = analyzeMoodCorrelations(entries);
  return {
    totalMoodsTracked: 0,
    mostCommonMood: 'None',
    strongestPattern: 'No patterns yet',
    timePatterns: {}
  };
};
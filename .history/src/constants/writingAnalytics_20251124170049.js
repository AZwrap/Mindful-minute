export const analyzeWritingAnalytics = (entries) => {
  if (!entries || !entries.length) return null;
  
  let totalWords = 0;
  let totalCharacters = 0;
  const wordCounts = [];
  const entryTimes = [];
  let longestEntry = { wordCount: 0, date: '' };
  let shortestEntry = { wordCount: Infinity, date: '' };

  entries.forEach(entry => {
    if (entry.text) {
      const wordCount = entry.text.split(/\s+/).filter(word => word.length > 0).length;
      const charCount = entry.text.length;
      
      totalWords += wordCount;
      totalCharacters += charCount;
      wordCounts.push(wordCount);
      
      // Track longest/shortest entries
      if (wordCount > longestEntry.wordCount) {
        longestEntry = { wordCount, date: entry.date };
      }
      if (wordCount < shortestEntry.wordCount && wordCount > 0) {
        shortestEntry = { wordCount, date: entry.date };
      }
      
      // Analyze writing times if available
      if (entry.createdAt) {
        const hour = new Date(entry.createdAt).getHours();
        entryTimes.push(hour);
      }
    }
  });

  const averageWords = totalWords / entries.length;
  const averageChars = totalCharacters / entries.length;
  
  // Time of day analysis
  const timeStats = analyzeWritingTimes(entryTimes);
  
  // Writing consistency
  const consistency = analyzeWritingConsistency(entries);

  return {
    totalWords,
    totalCharacters,
    averageWords: averageWords.toFixed(1),
    averageChars: averageChars.toFixed(0),
    longestEntry,
    shortestEntry: shortestEntry.wordCount === Infinity ? null : shortestEntry,
    wordCounts,
    timeStats,
    consistency
  };
};

const analyzeWritingTimes = (entryTimes) => {
  if (!entryTimes.length) return null;
  
  const timeSlots = {
    Morning: 0,    // 5am - 12pm
    Afternoon: 0,  // 12pm - 5pm
    Evening: 0,    // 5pm - 9pm
    Night: 0       // 9pm - 5am
  };
  
  entryTimes.forEach(hour => {
    if (hour >= 5 && hour < 12) timeSlots.Morning++;
    else if (hour >= 12 && hour < 17) timeSlots.Afternoon++;
    else if (hour >= 17 && hour < 21) timeSlots.Evening++;
    else timeSlots.Night++;
  });
  
  const mostActiveSlot = Object.entries(timeSlots).reduce((a, b) => 
    a[1] > b[1] ? a : b
  );
  
  return {
    slots: timeSlots,
    mostActive: mostActiveSlot[0],
    mostActiveCount: mostActiveSlot[1]
  };
};

const analyzeWritingConsistency = (entries) => {
  if (entries.length < 2) return null;
  
  const dates = entries.map(entry => new Date(entry.date));
  dates.sort((a, b) => a - b);
  
  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    const gap = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24); // days
    gaps.push(gap);
  }
  
  const averageGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const consistencyScore = Math.max(0, 100 - (averageGap * 10)); // Lower gap = higher score
  
  return {
    averageGap: averageGap.toFixed(1),
    consistencyScore: Math.round(consistencyScore),
    totalGaps: gaps.length
  };
};
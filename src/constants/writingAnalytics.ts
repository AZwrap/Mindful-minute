import { JournalEntry } from "../stores/entriesStore";

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface TimeSlotStats {
  slots: Record<string, number>; // e.g. { "Morning": 5, "Evening": 2 }
  mostActive: string;
  mostActiveCount: number;
}

interface WritingAnalytics {
  totalWords: number;
  averageWords: number;
  timeStats: TimeSlotStats | null;
}

// --------------------------------------------------
// LOGIC
// --------------------------------------------------
export const analyzeWritingAnalytics = (entries: JournalEntry[]): WritingAnalytics | null => {
  if (!entries || entries.length === 0) return null;

  // 1. Word Counts
  const totalWords = entries.reduce((sum, entry) => {
    return sum + (entry.text?.trim().split(/\s+/).filter(w => w.length > 0).length || 0);
  }, 0);

  const averageWords = Math.round(totalWords / entries.length);

  // 2. Time of Day Analysis
  const slots: Record<string, number> = {
    "Morning": 0,   // 5 - 11
    "Afternoon": 0, // 11 - 17
    "Evening": 0,   // 17 - 22
    "Night": 0      // 22 - 5
  };

  entries.forEach(entry => {
    const date = new Date(entry.createdAt || entry.date); // Handle ISO string or timestamp
    // Fallback if date is invalid
    if (isNaN(date.getTime())) return;
    
    const hour = date.getHours();

    if (hour >= 5 && hour < 11) slots["Morning"]++;
    else if (hour >= 11 && hour < 17) slots["Afternoon"]++;
    else if (hour >= 17 && hour < 22) slots["Evening"]++;
    else slots["Night"]++;
  });

  // Find most active slot
  let mostActive = "Morning";
  let mostActiveCount = 0;

  Object.entries(slots).forEach(([slot, count]) => {
    if (count > mostActiveCount) {
      mostActiveCount = count;
      mostActive = slot;
    }
  });

  return {
    totalWords,
    averageWords,
    timeStats: {
      slots,
      mostActive,
      mostActiveCount
    }
  };
};
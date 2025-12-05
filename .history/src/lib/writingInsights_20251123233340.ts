
// src/lib/writingInsights.js

const GRATITUDE_KEYWORDS = ['grateful', 'gratitude', 'thankful', 'appreciate'];

/**
 * Analyzes journal entries to find patterns and generate insights.
 * @param {Array<Object>} entries - A list of entry objects.
 * @returns {Array<string>} A list of insight strings.
 */
export function generateInsights(entries) {
  const insights = [];

  // Insight: "You often write about gratitude on Mondays."
  const mondayGratitudeCount = entries.filter(entry => {
    const d = new Date(entry.date);
    const dayOfWeek = d.getUTCDay(); // Sunday = 0, Monday = 1
    if (dayOfWeek !== 1) return false;

    const text = entry.text.toLowerCase();
    return GRATITUDE_KEYWORDS.some(keyword => text.includes(keyword));
  }).length;

  if (mondayGratitudeCount > 2) {
    insights.push(`You often write about gratitude on Mondays.`);
  }

  // Add more insight-generating logic here in the future.

  return insights;
}

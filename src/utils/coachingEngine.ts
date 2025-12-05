// src/utils/coachingEngine.ts

interface Encouragement {
  min: number;
  max: number;
  text: string;
}

const ENCOURAGEMENTS: Encouragement[] = [
  { min: 0, max: 5, text: "The blank page is a safe space. Just one word." },
  { min: 5, max: 20, text: "Great start. Let the thoughts flow." },
  { min: 20, max: 50, text: "You're finding your rhythm. Keep going." },
  { min: 50, max: 100, text: "This is great progress. How does that make you feel?" },
  { min: 100, max: 200, text: "You're doing meaningful work today." },
  { min: 200, max: 1000, text: "Incredible depth. Remember to breathe." },
];

const KEYWORD_TRIGGERS: Record<string, string[]> = {
  stress: ["anxious", "stress", "overwhelmed", "panic", "scared"],
  sadness: ["sad", "lonely", "hurt", "cry", "grief"],
  joy: ["happy", "excited", "grateful", "love", "proud"],
  insight: ["realize", "understand", "learned", "now i see"],
};

export function getCoachingTip(text: string, lastTip: string | null): string | null {
  const cleanText = text.toLowerCase();
  const words = text.trim().split(/\s+/).length;

  // 1. Check for Keyword Triggers (High Priority)
  if (KEYWORD_TRIGGERS.stress.some(w => cleanText.includes(w))) {
    return "It's brave to face these feelings. You're safe here.";
  }
  if (KEYWORD_TRIGGERS.sadness.some(w => cleanText.includes(w))) {
    return "Be gentle with yourself. It's okay to let it out.";
  }
  if (KEYWORD_TRIGGERS.joy.some(w => cleanText.includes(w))) {
    return "Hold onto this feeling. It's yours to keep.";
  }

  // 2. Check for Word Count Milestones
  const milestone = ENCOURAGEMENTS.find(e => words >= e.min && words < e.max);
  if (milestone && milestone.text !== lastTip) {
    return milestone.text;
  }

  return null;
}
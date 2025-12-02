import AsyncStorage from '@react-native-async-storage/async-storage';

export const GRATITUDE_PROMPTS = [
  "What's one small thing you're grateful for today?",
  "Who made a positive impact on your day and how?",
  "What personal strength are you thankful for right now?",
  "What beauty or kindness did you notice recently?",
  "What comfort or convenience made your day better?",
  "What lesson are you grateful to have learned?",
  "What memory brought you joy when you recalled it?",
  "What about your surroundings are you appreciating today?",
  "What opportunity are you grateful came your way?",
  "What relationship are you particularly thankful for?",
];

export const POSITIVE_PROMPTS = [
  "What energized you today?",
  "What surprised you—in a good way?",
  "What made you smile?",
  "Describe a moment of pure joy you've experienced.",
  "What’s a talent or skill you're proud of?",
  "Who is someone who inspires you to be better? Why?",
  "What’s one beautiful thing you saw today?",
];

export const NEUTRAL_PROMPTS = [
  "If today had a theme, what would it be? Why?",
  "Describe a moment using all five senses.",
  "What do you want to remember about today?",
  "What do you want to learn more about?",
  "What is a small delight within reach?",
  "If you could travel anywhere right now, where would you go?",
  "What book, movie, or song has stuck with you recently?",
  "What’s a simple pleasure you enjoyed this week?",
];

export const CHALLENGING_PROMPTS = [
  "Name a tension in your body. Breathe into it for 30 seconds—what changed?",
  "What is one tiny thing you can let go of today?",
  "What would a kinder version of you say to you now?",
  "Where could you choose ‘good enough’ over perfect?",
  "What boundary could protect your energy this week?",
  "What are you avoiding that would take <5 minutes?",
  "What did you say ‘no’ to (or wish you did)?",
  "Where can you ask for help?",
  "What do you forgive yourself for today?",
  "If you could re-do one moment, what would you try differently?",
  "A tiny act of courage available today?",
  "What’s a helpful question to carry tomorrow?",
];

export const ALL_PROMPTS = [
  ...GRATITUDE_PROMPTS,
  ...POSITIVE_PROMPTS,
  ...NEUTRAL_PROMPTS,
  ...CHALLENGING_PROMPTS,
];

// Custom prompt storage
const CUSTOM_PROMPT_KEY = 'custom_prompt';
const LIBRARY_KEY = 'prompt_library'; // <--- NEW KEY

// Save custom prompt for a specific date (One-time use)
export async function setCustomPrompt(date, promptText) {
  try {
    const customPrompts = await loadCustomPrompts();
    customPrompts[date] = { text: promptText, used: true };
    await AsyncStorage.setItem(CUSTOM_PROMPT_KEY, JSON.stringify(customPrompts));
  } catch (error) {
    console.log('Error saving custom prompt:', error);
  }
}

// Load all custom prompts map
async function loadCustomPrompts() {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_PROMPT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Clear custom prompt for a date
export async function clearCustomPrompt(date) {
  try {
    const customPrompts = await loadCustomPrompts();
    delete customPrompts[date];
    await AsyncStorage.setItem(CUSTOM_PROMPT_KEY, JSON.stringify(customPrompts));
  } catch (error) {
    console.log('Error clearing custom prompt:', error);
  }
}

export const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function promptOfDay(isoDate) {
  // Check for custom prompt first
  const customPrompts = await loadCustomPrompts();
  const customPrompt = customPrompts[isoDate];
  
  if (customPrompt && customPrompt.used) {
    return { id: 'custom', text: customPrompt.text, isCustom: true };
  }
  
  // Fall back to regular prompt
  const d = new Date(`${isoDate}T00:00:00`);
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const idx = seed % ALL_PROMPTS.length;
  return { id: idx, text: ALL_PROMPTS[idx], isCustom: false };
}

// -------------------------------------------------------
// NEW: PROMPT LIBRARY FUNCTIONS
// -------------------------------------------------------

export async function getPromptLibrary() {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveToLibrary(text) {
  try {
    const list = await getPromptLibrary();
    if (!list.includes(text)) {
      const newList = [text, ...list]; // Add to top
      await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(newList));
      return newList;
    }
    return list;
  } catch {
    return [];
  }
}

export async function removeFromLibrary(text) {
  try {
    const list = await getPromptLibrary();
    const newList = list.filter(item => item !== text);
    await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(newList));
    return newList;
  } catch {
    return [];
  }
}
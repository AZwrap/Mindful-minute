import AsyncStorage from "@react-native-async-storage/async-storage";

// Static list of prompts
export const STATIC_PROMPTS = [
  "What is one small win you had today?",
  "How did you care for yourself today?",
  "What is a challenge you are currently facing?",
  "Describe a moment that made you smile.",
  "What are three things you are grateful for?",
  "How are you feeling right now, really?",
  "What is one thing you can let go of?",
  "Who is someone you appreciate and why?",
  "What is a goal you want to focus on tomorrow?",
  "Reflect on a recent mistake and what you learned.",
];

export interface PromptData {
  id: string | number;
  text: string;
  isCustom: boolean;
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// Get or rotate prompt for the day
export async function promptOfDay(date: string): Promise<PromptData> {
  const key = `prompt_${date}`;
  
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }

    // Generate deterministic prompt based on date hash
    const dateInt = date.split('-').join('');
    const index = parseInt(dateInt) % STATIC_PROMPTS.length;
    
    const newPrompt: PromptData = {
      id: index,
      text: STATIC_PROMPTS[index],
      isCustom: false
    };

    return newPrompt;
  } catch (e) {
    return { id: 0, text: STATIC_PROMPTS[0], isCustom: false };
  }
}

export async function saveCustomPrompt(date: string, text: string): Promise<void> {
  const key = `prompt_${date}`;
  const data: PromptData = {
    id: `custom_${Date.now()}`,
    text,
    isCustom: true
  };
  await AsyncStorage.setItem(key, JSON.stringify(data));
}
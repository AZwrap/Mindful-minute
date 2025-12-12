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
  // New Prompts
  "What is a habit you want to start or stop?",
  "Describe a place where you feel most at peace.",
  "What is something you are looking forward to?",
  "How have you changed in the last year?",
  "What is a boundary you need to set?",
  "Who brings out the best in you?",
  "What would you do if you knew you couldn't fail?",
  "Write about a song that moves you.",
  "What is a fear you would like to overcome?",
  "Describe your perfect morning.",
  "What are three qualities you like about yourself?",
  "What does 'success' mean to you right now?",
  "Write a letter to your future self.",
  "What is draining your energy lately?",
  "What is fueling your energy lately?",
  "Identify a stressor you can control and one you cannot.",
  "What is the best advice you've ever received?",
  // Expanded Prompts
  "What is a value you refuse to compromise on?",
  "Describe a time you felt truly heard.",
  "What is a distraction you want to minimize?",
  "If you could talk to your younger self, what would you say?",
  "What makes you feel most alive?",
  "What is a compliment you received that stuck with you?",
  "How do you recharge after a long day?",
  "What is a skill you would like to learn?",
  "When did you last step out of your comfort zone?",
  "What is a decision you made that you are proud of?",
  "Reflect on a time you showed resilience.",
  "What is a relationship you want to nurture?",
  "What is something you often take for granted?",
  "Describe a favorite childhood memory.",
  "What does your ideal day look like from start to finish?",
  "Who do you need to forgive, and why?",
  "What is a book or movie that changed your perspective?",
  "How do you handle criticism?",
  "What is a creative outlet you enjoy?",
  "Describe the space where you feel most productive.",
  "What is a 'no' that felt like a 'yes' to yourself?",
  "What is a lesson you learned the hard way?",
  "How do you want to be remembered?",
  "What is a small act of kindness you witnessed recently?",
  "What part of your life needs more balance?",
  "Identify a limiting belief you are holding onto.",
  "What are three things you love about your home?",
  "How do you show love to others?",
  "What is a risk you are glad you took?",
  "What are you currently postponing?",
  "What is a rule you live by?",
  "Describe a sound that brings you comfort.",
  "What is the most generous thing you have done recently?",
  "Who in your life needs more of your attention?",
  "What is a fear that turned out to be unfounded?",
  "Write about a serendipitous moment.",
  "What is one thing you would change about your routine?",
  "Describe your relationship with technology right now.",
  "What is a texture or scent you love?",
  "When do you feel most authentic?",
  "What is a misunderstanding you want to clear up?",
  "Reflect on a time you asked for help.",
  "What is a dream you have let go of, and how does that feel?",
  "What is something you are curious about right now?",
  "Who has influenced your work ethic the most?",
  "What is a boundary you successfully maintained recently?",
  "Describe a meal that holds special meaning for you.",
  "What is an assumption people often make about you?",
  "Where do you go when you need to think?",
  "What is a joyful memory involving water (rain, ocean, lake)?",
  "What is one thing you are doing just for yourself?",
  "Reflect on a moment of pure luck.",
  "What is a piece of art or music that defines a period of your life?",
  "How do you define 'friendship' today versus 5 years ago?",
  "What is a small daily ritual you cherish?",
  "If you had an extra hour every day, how would you spend it?",
  "What is the hardest 'goodbye' you have ever said?",
  "What creates a sense of awe in you?",
  "Write about a teacher or mentor who shaped you.",
  "What is your favorite way to waste time?"
];

export interface PromptData {
  id: string | number;
  text: string;
  isCustom: boolean;
}

export function todayISO(): string {
  // Use local system time instead of UTC
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

export function getRandomPrompt(excludeText?: string): PromptData {
  // Filter out the current prompt so we don't get the same one
  const available = STATIC_PROMPTS.filter(p => p !== excludeText);
  const randomIndex = Math.floor(Math.random() * available.length);
  const text = available[randomIndex];
  
  return {
    id: `random_${Date.now()}`,
    text,
    isCustom: false
  };
}

export async function resetToDailyPrompt(date: string): Promise<void> {
  const key = `prompt_${date}`;
  await AsyncStorage.removeItem(key);
}
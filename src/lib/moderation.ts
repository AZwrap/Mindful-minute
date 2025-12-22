import { Alert } from 'react-native';

// 1. REGEX: Strict "No Links" Policy
// Matches http://, https://, www., or typical domain patterns like .com, .net
const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|io|xyz|info)\b)/i;

// 2. OPENAI CONFIG (Re-using your likely existing setup or needing a key)
// NOTE: Ideally, store this in your .env or use the same source as your smartPrompts.
// For now, you can paste your key here or import it if you have a centralized config.
const OPENAI_API_KEY = "YOUR_OPEN_AI_KEY_HERE"; 

export async function moderateContent(text: string): Promise<boolean> {
  
  // A. Check for Links (Local & Fast)
  if (LINK_REGEX.test(text)) {
    Alert.alert("Moderation Blocked", "To keep this space safe, external links are not allowed.");
    return false; // Blocked
  }

  // B. Check for Nudity/Violence/Hate (OpenAI API)
  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: text }),
    });

    const data = await response.json();
    const result = data.results?.[0];

    if (result?.flagged) {
      // It failed moderation
      const categories = Object.keys(result.categories)
        .filter((key) => result.categories[key])
        .join(", ");

      Alert.alert(
        "Content Removed", 
        `Your post contains content flagged as: ${categories}. Please revise.`
      );
      return false; // Blocked
    }

    return true; // Passed

  } catch (error) {
    console.warn("Moderation check failed:", error);
    // FALLBACK: If API fails (offline), do we block or allow?
    // Safe option: Allow, but warn user. Or strict: Block.
    // We'll allow it to avoid locking users out due to bad internet.
    return true; 
  }
}
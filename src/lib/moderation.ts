import { useUIStore } from '../stores/uiStore';
import * as FileSystem from 'expo-file-system/legacy';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../firebaseConfig';

// 1. REGEX: Strict "No Links" Policy
const LINK_REGEX = /((https?:\/\/)|(www\.))[^\s]+|([a-zA-Z0-9-]+\.(com|net|org|io|xyz|info|co|uk|us|ai|app))/i;

export async function moderateContent(text: string, silent: boolean = false): Promise<boolean> {
  
  // A. Check for Links (Local & Fast)
  // We keep this local to save money and speed up checks
  if (LINK_REGEX.test(text)) {
    if (!silent) useUIStore.getState().showAlert("Moderation Blocked", "To keep this space safe, external links are not allowed.");
    return false; // Blocked
  }

  // B. Check for Nudity/Violence/Hate (Cloud Function)
  try {
// DEBUG: Ensure we are actually logged in
    if (!auth.currentUser) {
       console.error("Moderation Aborted: No User Logged In");
       useUIStore.getState().showAlert("Error", "You must be logged in to post.");
       return false;
    }

// FIX: Force a token refresh to ensure the Functions SDK picks up the credentials
    try {
      const token = await auth.currentUser.getIdToken(true);
      console.log("✅ Fresh Token Generated. Length:", token.length);
    } catch (e: any) {
      console.error("❌ Token Generation Failed:", e);
      useUIStore.getState().showAlert("Auth Error", "Could not verify your identity. Please log out and back in.");
      return false;
    }
    
    console.log("Calling Moderation as:", auth.currentUser.uid); 

const moderateFn = httpsCallable(functions, 'moderateContent');
    // Pass the token explicitly in the data object
    const response = await moderateFn({ text, token });
    const data = response.data as any;

    if (data.flagged) {
      if (!silent) {
        useUIStore.getState().showAlert(
          "Content Removed", 
          `Your post contains content flagged as: ${data.categories || 'Restricted Content'}. Please revise.`
        );
      }
      return false; // Blocked
    }

    return true; // Passed

} catch (error: any) {
    console.warn("Moderation check failed:", error);
    // DEBUG: Show specific error on screen
    useUIStore.getState().showAlert("System Error", `Moderation Failed: ${error.message}`);
    return false; // <--- FAIL SECURE (Block content if system fails)
  }
}

export async function moderateImage(imageUri: string, silent: boolean = false): Promise<boolean> {
  // BETA: Disabled for testing
  return true;

  // 1. Basic Check
  if (!imageUri) return true;

  try {
// 2. Convert Image to Base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64', // <--- Fixed: Use string literal
    });
    
    // 3. Send to OpenAI Vision (GPT-4o)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Must use a vision-capable model
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Is this image safe for a general audience? It must NOT contain nudity, sexual content, severe violence, or gore. Reply strictly with 'SAFE' or 'UNSAFE'." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 10,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("Vision API Error:", data);
        return true; // Fail safe (allow) if API is down, or return false to be strict
    }

    const answer = data.choices?.[0]?.message?.content?.trim().toUpperCase();

    if (answer?.includes("UNSAFE")) {
        if (!silent) {
            useUIStore.getState().showAlert("Image Blocked", "This image contains content that violates our community safety guidelines.");
        }
        return false;
    }

    return true;

  } catch (e) {
    console.error("Image Moderation Failed:", e);
    return true; // Allow on technical error
  }
}

export async function moderateAudio(audioUri: string): Promise<{ safe: boolean; text: string }> {
  // BETA: Disabled for testing
  return { safe: true, text: "" };

  try {
    // 1. Prepare FormData
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a', // Expo AV default
      name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');

    // 2. Send to OpenAI Whisper
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Whisper API Error:", data);
        // Fail-safe: If API fails, we allow it but log error, OR you can block it.
        // For now, we allow it to avoid blocking legitimate users due to network errors.
        return { safe: true, text: "" };
    }

    const transcribedText = data.text;
    console.log("Transcribed:", transcribedText);

    // 3. Moderate the Transcribed Text
    // We pass 'true' for silent because we want to handle the alert ourselves if needed
    const isSafe = await moderateContent(transcribedText, true);

    if (!isSafe) {
        useUIStore.getState().showAlert("Audio Blocked", "Your recording contains restricted content.");
    }

    return { safe: isSafe, text: transcribedText };

  } catch (e) {
    console.error("Audio Moderation Failed:", e);
    return { safe: true, text: "" };
  }
}
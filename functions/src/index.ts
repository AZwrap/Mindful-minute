import { onCall, HttpsError } from "firebase-functions/v2/https";
// Remove defineString since we use secrets directly now
import OpenAI from "openai";
import * as admin from "firebase-admin"; 

// 1. Initialize Admin SDK
admin.initializeApp();

// FIX: explicitly bind the secret to this function (v2)
export const moderateContent = onCall({ secrets: ["OPENAI_API_KEY"] }, async (request) => {
  const data = request.data;
  let uid = request.auth?.uid;

  // 2. FALLBACK: If automatic auth failed, check for manual token
  let authError = "";
  if (!uid && data.token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(data.token);
      uid = decodedToken.uid;
      console.log("✅ Manual Token Verification Successful for:", uid);
    } catch (e: any) {
      console.warn("❌ Manual Token Verification Failed:", e);
      authError = e.message || "Unknown Verify Error";
    }
  }

// 3. Final Security Check
  if (!uid) {
    console.error("Auth Failed. Context Auth:", !!request.auth, "UID:", uid);
    throw new HttpsError(
      "unauthenticated",
      `DEBUG: Auth Failed. Manual Verify Error: ${authError || "None"}. Context: ${request.auth ? "Yes" : "No"}`
    );
  }

// Access the secret directly via process.env
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const text = data.text;
  if (!text) return {flagged: false};

  try {
    const response = await openai.moderations.create({input: text});
    const result = response.results[0];

    if (result.flagged) {
      const categories = Object.keys(result.categories)
        .filter((key) => (result.categories as any)[key])
        .join(", ");
      
      return {flagged: true, categories};
    }

    return {flagged: false};

  } catch (error) {
    console.error("OpenAI Error:", error);
    return {flagged: false};
  }
});
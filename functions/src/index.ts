import * as functions from "firebase-functions";
import { defineString } from "firebase-functions/params";
import OpenAI from "openai";
import * as admin from "firebase-admin"; // <--- Import Admin SDK

// 1. Initialize Admin SDK (For manual token verification)
admin.initializeApp();

const openAiKey = defineString("OPENAI_API_KEY");

export const moderateContent = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  let uid = context.auth?.uid;

  // 2. FALLBACK: If automatic auth failed, check for manual token
  if (!uid && data.token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(data.token);
      uid = decodedToken.uid;
      console.log("✅ Manual Token Verification Successful for:", uid);
    } catch (e) {
      console.warn("❌ Manual Token Verification Failed:", e);
    }
  }

  // 3. Final Security Check
  if (!uid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to post."
    );
  }

  const openai = new OpenAI({ apiKey: openAiKey.value() });
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
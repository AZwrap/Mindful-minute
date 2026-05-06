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
    const response = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });
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

// ============================================================================
// Account-deletion cleanup: wipes Firestore + Storage for the calling user.
// Must be invoked from the client BEFORE calling deleteUser() in Firebase Auth.
//
// For shared journals where the user was a member (not sole owner), we
// anonymize their authored entries and comments so other members can still
// read history. Reports are left intact for moderation audit trail.
// ============================================================================
const DELETED_AUTHOR_LABEL = "Deleted user";

export const cleanupUserData = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to delete your account data.",
    );
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();
  const FieldValue = admin.firestore.FieldValue;

  console.log(`[cleanup] starting for uid=${uid}`);

  // 1. Delete all user-private data (users/{uid} + all subcollections)
  try {
    await db.recursiveDelete(db.collection("users").doc(uid));
    console.log(`[cleanup] deleted users/${uid}`);
  } catch (e) {
    console.error(`[cleanup] failed users/${uid}:`, e);
  }

  // 2. Handle shared journals where the user is involved
  try {
    const journalsSnap = await db
      .collection("journals")
      .where("memberIds", "array-contains", uid)
      .get();

    for (const j of journalsSnap.docs) {
      const data = j.data();

      if (data.owner === uid) {
        // User was owner → delete the whole journal (other members lose access)
        await db.recursiveDelete(j.ref);
        console.log(`[cleanup] deleted journal ${j.id} (user was owner)`);
        continue;
      }

      // User was a non-owner member → anonymize their content, then remove
      // membership / denormalized references.

      // 2a. Anonymize entries + comments + reactions in this journal
      try {
        const entriesSnap = await j.ref.collection("entries").get();

        const results: number[] = await Promise.all(
          entriesSnap.docs.map(async (e): Promise<number> => {
            const eData = e.data();
            const updates: Record<string, any> = {};

            // Author scrub on the entry itself
            if (eData.userId === uid) {
              updates.authorName = DELETED_AUTHOR_LABEL;
              updates.userId = null;
            }

            // Entry-level reactions: drop deleted UID from each list
            const reactions = eData.reactions || {};
            let reactionsChanged = false;
            const newReactions: Record<string, string[]> = {};
            for (const [type, list] of Object.entries(reactions)) {
              if (Array.isArray(list) && list.includes(uid)) {
                newReactions[type] = (list as string[]).filter((u) => u !== uid);
                reactionsChanged = true;
              } else {
                newReactions[type] = list as string[];
              }
            }
            if (reactionsChanged) updates.reactions = newReactions;

            // Comments are stored as an array on the entry doc; walk and scrub
            const comments = (eData.comments || []) as any[];
            let commentsChanged = false;
            const newComments = comments.map((c) => {
              let modified = c;

              if (c.userId === uid) {
                modified = {
                  ...modified,
                  userId: null,
                  authorName: DELETED_AUTHOR_LABEL,
                };
                commentsChanged = true;
              }

              const cReactions = (c.reactions || {}) as Record<string, string[]>;
              let cReactionsChanged = false;
              const newCReactions: Record<string, string[]> = {};
              for (const [type, list] of Object.entries(cReactions)) {
                if (Array.isArray(list) && list.includes(uid)) {
                  newCReactions[type] = (list as string[]).filter((u) => u !== uid);
                  cReactionsChanged = true;
                } else {
                  newCReactions[type] = list as string[];
                }
              }
              if (cReactionsChanged) {
                modified = { ...modified, reactions: newCReactions };
                commentsChanged = true;
              }

              return modified;
            });
            if (commentsChanged) updates.comments = newComments;

            if (Object.keys(updates).length > 0) {
              await e.ref.update(updates);
              return 1;
            }
            return 0;
          })
        );

        const anonymized = results.reduce((a, b) => a + b, 0);
        console.log(
          `[cleanup] anonymized ${anonymized}/${entriesSnap.size} entries in journal ${j.id}`
        );
      } catch (err) {
        console.error(
          `[cleanup] entry anonymization failed for journal ${j.id}:`,
          err
        );
      }

      // 2b. Membership cleanup + scrub denormalized lastEntry preview
      try {
        const journalUpdates: Record<string, any> = {
          memberIds: FieldValue.arrayRemove(uid),
          [`membersMap.${uid}`]: FieldValue.delete(),
          [`memberPhotos.${uid}`]: FieldValue.delete(),
          [`nicknames.${uid}`]: FieldValue.delete(),
          [`roles.${uid}`]: FieldValue.delete(),
        };

        if (data.lastEntry?.userId === uid) {
          journalUpdates["lastEntry.author"] = DELETED_AUTHOR_LABEL;
          journalUpdates["lastEntry.userId"] = null;
        }

        await j.ref.update(journalUpdates);
        console.log(`[cleanup] removed uid=${uid} from journal ${j.id}`);
      } catch (err) {
        console.error(
          `[cleanup] membership cleanup failed for journal ${j.id}:`,
          err
        );
      }
    }
  } catch (e) {
    console.error(`[cleanup] shared journals failed for uid=${uid}:`, e);
  }

  // 3. Delete all user's Storage files (audio, photos)
  try {
    await bucket.deleteFiles({ prefix: `users/${uid}/` });
    console.log(`[cleanup] deleted Storage users/${uid}/`);
  } catch (e) {
    console.error(`[cleanup] Storage failed for uid=${uid}:`, e);
  }

  console.log(`[cleanup] complete for uid=${uid}`);
  return { success: true };
});
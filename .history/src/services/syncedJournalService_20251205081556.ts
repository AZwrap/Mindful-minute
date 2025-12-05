// src/services/syncedJournalService.js
import { db } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  deleteField,
} from "firebase/firestore";

import { useJournalStore } from "../stores/journalStore";
import { useEntriesStore } from "../stores/entriesStore";
import { v4 as uuidv4 } from "uuid";


// ─────────────────────────────────────────────
//  CREATE SHARED JOURNAL
// ─────────────────────────────────────────────
export async function createSharedJournal(name, userId) {
  const journalId = uuidv4(); // Fixed

  const journalRef = doc(db, "journals", journalId);

  const metadata = {
    journalId,
    name,
    owner: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isShared: true,
    members: {
      [userId]: "owner",
    },
  };

  await setDoc(journalRef, metadata);

  // Also add locally
  useJournalStore.getState().addJournal({
    journalId,
    name,
    isShared: true,
    members: metadata.members,
  });

  return journalId;
}

// ─────────────────────────────────────────────
//  CREATE INVITE LINK
//  (creates an invite document + returns URL)
// ─────────────────────────────────────────────
export async function createInviteLink(journalId, userId, role = "editor") {
  const inviteId = uuidv4(); // Fixed

  const inviteRef = doc(db, "journals", journalId, "invites", inviteId);

  await setDoc(inviteRef, {
    inviteId,
    journalId,
    createdAt: Date.now(),
    creator: userId,
    status: "active",
    role,
    uses: 0,
    maxUses: 50,
  });

  const url = `mindfulminute://invite?journal=${journalId}&invite=${inviteId}`;
  return url;
}

// ─────────────────────────────────────────────
//  JOIN SHARED JOURNAL FROM INVITE LINK
// ─────────────────────────────────────────────
export async function joinSharedJournal(url) {
  try {
    if (!url) return;

    const query = extractParams(url);
    const { journal, invite } = query;

    const inviteRef = doc(db, "journals", journal, "invites", invite);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      console.log("Invite not found.");
      return;
    }

    const inviteData = inviteSnap.data();
    if (inviteData.status !== "active") return;

    const journalRef = doc(db, "journals", journal);
    const journalSnap = await getDoc(journalRef);

    if (!journalSnap.exists()) return;

    const journalData = journalSnap.data();
    const userId = useJournalStore.getState().currentUser;

    // Add user to members
    await updateDoc(journalRef, {
      [`members.${userId}`]: inviteData.role,
      updatedAt: Date.now(),
    });

    // Increment uses
    await updateDoc(inviteRef, {
      uses: inviteData.uses + 1,
    });

    // Add journal locally
    useJournalStore.getState().addJournal({
      journalId: journalData.journalId,
      name: journalData.name,
      isShared: true,
      members: {
        ...journalData.members,
        [userId]: inviteData.role,
      },
    });

    // Start syncing entries
    startJournalSync(journal);

    console.log("Joined journal:", journal);
  } catch (err) {
    console.log("joinSharedJournal error:", err);
  }
}


// ─────────────────────────────────────────────
//  SYNC METADATA + ENTRIES IN REAL TIME
// ─────────────────────────────────────────────
export function startJournalSync(journalId) {
  const journalRef = doc(db, "journals", journalId);

  // ───────────── METADATA LISTENER ─────────────
onSnapshot(journalRef, (snap) => {
  if (!snap.exists()) return;

  const data = snap.data();

  // Update metadata only (name, members, etc.)
  queueMicrotask(() => {
    useJournalStore.getState().updateJournalMeta(journalId, data);
  });
});



  // ───────────── ENTRIES LISTENER ─────────────
  const entriesRef = collection(db, "journals", journalId, "entries");

onSnapshot(entriesRef, (snap) => {
  const entries = [];
  snap.forEach((doc) => entries.push(doc.data()));

  const prev = useJournalStore.getState().sharedEntries?.[journalId] || [];

  const changed =
    prev.length !== entries.length ||
    JSON.stringify(prev) !== JSON.stringify(entries);

  if (changed) {
    queueMicrotask(() => {
      useJournalStore
        .getState()
        .addSharedEntryList(journalId, entries);
    });
  }
});

}


// ─────────────────────────────────────────────
//  ADD / UPDATE ENTRY IN SHARED JOURNAL
// ─────────────────────────────────────────────
export async function addSharedEntry(journalId, entry) {
  const entryRef = doc(
    db,
    "journals",
    journalId,
    "entries",
    entry.entryId
  );

  await setDoc(entryRef, {
    ...entry,
    updatedAt: Date.now(),
  });
}

// ─────────────────────────────────────────────
//  Helper: Extract params from invite URL
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  LEAVE SHARED JOURNAL
// ─────────────────────────────────────────────
export async function leaveSharedJournal(journalId, userId) {
  try {
    const journalRef = doc(db, "journals", journalId);
    
    // Remove user from the Firestore members map
    await updateDoc(journalRef, {
      [`members.${userId}`]: deleteField()
    });

    // Remove locally
    useJournalStore.getState().removeJournal(journalId);
    
    console.log(`User ${userId} left journal ${journalId}`);
  } catch (error) {
    console.error("Error leaving journal:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
//  Helper: Extract params from invite URL
// ─────────────────────────────────────────────
function extractParams(url) {
  const query = url.split("?")[1];
  const parts = new URLSearchParams(query);
  return {
    journal: parts.get("journal"),
    invite: parts.get("invite"),
  };
}

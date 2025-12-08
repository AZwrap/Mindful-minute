// src/services/syncedJournalService.ts
import { db } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
updateDoc,
  collection,
  onSnapshot,
  deleteField,
  arrayUnion, // Added for atomic array updates
  DocumentData,
} from "firebase/firestore";

import { useJournalStore, JournalMeta } from "../stores/journalStore";
import { v4 as uuidv4 } from "uuid";

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface InviteParams {
  journal?: string | null;
  invite?: string | null;
}

// --------------------------------------------------
// ACTIONS
// --------------------------------------------------

// 1. Create Shared Journal
export async function createSharedJournal(name: string, userId: string): Promise<string> {
  const journalId = uuidv4();

  // SCHEMA: Root 'journals' collection
  const journalRef = doc(db, "journals", journalId);

  const metadata: JournalMeta = {
    id: journalId,
    name,
    owner: userId,
    createdAt: Date.now(),
    members: [userId], // Store specific roles in a separate map if needed, but array for UI
  };
  
  // For Firestore security rules, we might want a map of roles too
  const firestoreData = {
    ...metadata,
    membersMap: { [userId]: 'owner' }, // Helper for security rules
    updatedAt: Date.now(),
    isShared: true,
  };

  await setDoc(journalRef, firestoreData);

  // Also add locally
  useJournalStore.getState().addJournal(metadata);

  return journalId;
}
// 2. Join Shared Journal
export async function joinSharedJournal(journalId: string, userId: string): Promise<JournalMeta> {
  const journalRef = doc(db, "journals", journalId);
  const journalSnap = await getDoc(journalRef);

  if (!journalSnap.exists()) {
    throw new Error("Journal not found. Check the invite code.");
  }

  const data = journalSnap.data();
  const members = data.members || [];

  if (members.includes(userId)) {
    // Already a member, just return meta to ensure local store is updated
    return { ...data, id: journalId } as JournalMeta;
  }

  // Atomically add user to members list
  await updateDoc(journalRef, {
    members: arrayUnion(userId),
    [`membersMap.${userId}`]: 'member'
  });

  const newMeta = {
    ...data,
    id: journalId,
    members: [...members, userId]
  } as JournalMeta;

  // Add to local store immediately
  useJournalStore.getState().addJournal(newMeta);

  return newMeta;
}
// 2. Create Invite Link
export async function createInviteLink(journalId: string, userId: string, role: string = "editor"): Promise<string> {
  const inviteId = uuidv4();
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

  // Construct deep link
  const url = `mindfulminute://invite?journal=${journalId}&invite=${inviteId}`;
  return url;
}

// 3. Join Shared Journal
export async function joinSharedJournal(url: string): Promise<void> {
  try {
    if (!url) return;

    const { journal, invite } = extractParams(url);

    // Guard against missing params
    if (!journal || !invite) {
        console.log("Invalid invite link format");
        return;
    }

    const inviteRef = doc(db, "journals", journal, "invites", invite);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      console.log("Invite not found.");
      return;
    }

    const inviteData = inviteSnap.data();
    if (inviteData.status !== "active") {
        console.log("Invite is no longer active.");
        return;
    }

    const journalRef = doc(db, "journals", journal);
    const journalSnap = await getDoc(journalRef);

    if (!journalSnap.exists()) {
        console.log("Journal does not exist.");
        return;
    }

    const journalData = journalSnap.data();
    const currentUser = useJournalStore.getState().currentUser;

    if (!currentUser) {
        console.log("No user logged in.");
        return;
    }

    // Add user to members map and array
    await updateDoc(journalRef, {
      [`membersMap.${currentUser}`]: inviteData.role,
      // We cannot easily arrayUnion a name if we don't have it, 
      // so we rely on the real-time sync to update the 'members' array list later
      updatedAt: Date.now(),
    });

    // Increment invite uses
    await updateDoc(inviteRef, {
      uses: (inviteData.uses || 0) + 1,
    });

    // Add journal locally immediately for UI responsiveness
    useJournalStore.getState().addJournal({
      id: journalData.id || journalData.journalId,
      name: journalData.name,
      members: journalData.members || [],
      owner: journalData.owner
    });

    // Start syncing entries
    startJournalSync(journal);

    console.log("Joined journal:", journal);
  } catch (err) {
    console.log("joinSharedJournal error:", err);
  }
}

// 4. Sync Real-time (Metadata + Entries)
export function startJournalSync(journalId: string): void {
  const journalRef = doc(db, "journals", journalId);

  // Metadata Listener
  onSnapshot(journalRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    
    // Use queueMicrotask to avoid state update clashes
    queueMicrotask(() => {
      useJournalStore.getState().updateJournalMeta(journalId, data);
    });
  });

  // Entries Listener
  const entriesRef = collection(db, "journals", journalId, "entries");

  onSnapshot(entriesRef, (snap) => {
    const entries: any[] = [];
    snap.forEach((doc) => entries.push(doc.data()));

    const prev = useJournalStore.getState().sharedEntries?.[journalId] || [];

    // Simple deep check to avoid loops
    const changed =
      prev.length !== entries.length ||
      JSON.stringify(prev) !== JSON.stringify(entries);

    if (changed) {
      queueMicrotask(() => {
        useJournalStore.getState().addSharedEntryList(journalId, entries);
      });
    }
  });
}

// 5. Add Entry
export async function addSharedEntry(journalId: string, entry: any): Promise<void> {
  // Delegate to store, or handle here if specific logic needed
  await useJournalStore.getState().addSharedEntry(entry);
}

// 6. Leave Journal
export async function leaveSharedJournal(journalId: string, userId: string): Promise<void> {
  try {
    const journalRef = doc(db, "journals", journalId);
    
    // Remove user from the Firestore members map
    await updateDoc(journalRef, {
      [`membersMap.${userId}`]: deleteField()
    });

    // Remove locally
    useJournalStore.getState().removeJournal(journalId);
    
    console.log(`User ${userId} left journal ${journalId}`);
  } catch (error) {
    console.error("Error leaving journal:", error);
    throw error;
  }
}

// --------------------------------------------------
// HELPER
// --------------------------------------------------
function extractParams(url: string): InviteParams {
  if (!url || !url.includes('?')) return {};
  
  try {
    const query = url.split("?")[1];
    const parts = new URLSearchParams(query);
    return {
      journal: parts.get("journal"),
      invite: parts.get("invite"),
    };
  } catch (e) {
    console.error("Param extraction error:", e);
    return {};
  }
}
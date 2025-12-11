// src/services/syncedJournalService.ts
import { db } from "../firebaseConfig";
import * as Linking from 'expo-linking'; // <--- Add this
import {
doc,
  setDoc,
  deleteDoc, // <--- Added
  getDoc,
updateDoc,
  collection,
  onSnapshot,
deleteField,
  arrayUnion, 
  arrayRemove, // <--- Added this
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


// 5. Add Entry
export async function addSharedEntry(journalId: string, entry: any): Promise<void> {
  // Delegate to store, or handle here if specific logic needed
  await useJournalStore.getState().addSharedEntry(entry);
}

// 5.5 Create Invite Link (New)
export async function createInviteLink(journalId: string, user?: any): Promise<string> {
  // 1. Generate deep link (matches config: 'join/:journalId')
  const url = Linking.createURL(`join/${journalId}`);
  
  // 2. Create message
  const name = user?.displayName || "A friend";
  return `${name} invited you to a Shared Journal on Mindful Minute!\n\nTap to join:\n${url}`;
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
// 7. Manage Members (Admin)
export async function kickMember(journalId: string, userId: string): Promise<void> {
  const journalRef = doc(db, "journals", journalId);
  await updateDoc(journalRef, {
    members: arrayRemove(userId),
    [`membersMap.${userId}`]: deleteField()
  });
}

export async function updateMemberRole(journalId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
  const journalRef = doc(db, "journals", journalId);
  await updateDoc(journalRef, {
    [`membersMap.${userId}`]: role
  });
}
// 8. Delete Entire Journal (Owner Only)
export async function deleteSharedJournal(journalId: string): Promise<void> {
  try {
    const journalRef = doc(db, "journals", journalId);
    await deleteDoc(journalRef); // Deletes the meta document
    
    // Note: Firestore does not auto-delete subcollections (entries). 
    // In a production app, you'd use a Cloud Function for this.
    // For now, we clean up the local store reference.
    useJournalStore.getState().removeJournal(journalId);
  } catch (error) {
    console.error("Error deleting journal:", error);
    throw error;
  }
}
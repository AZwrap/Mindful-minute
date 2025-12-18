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
  arrayRemove, 
  addDoc, // <--- Added this
  DocumentData,
} from "firebase/firestore";

import { useJournalStore, JournalMeta } from "../stores/journalStore";
import { v4 as uuidv4 } from "uuid";
import { JournalService } from "./journalService";

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
    members: [userId], 
    memberIds: [userId], // <--- CRITICAL: Required for Security Rules
  };
  
  const firestoreData = {
    ...metadata,
    membersMap: { [userId]: 'owner' },
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
    memberIds: arrayUnion(userId), // <--- Added
    [`membersMap.${userId}`]: 'member'
  });

  const newMeta = {
    ...data,
    id: journalId,
    members: [...members, userId],
    memberIds: [...(data.memberIds || []), userId] // <--- Added
  } as JournalMeta;

  // Add to local store immediately
  useJournalStore.getState().addJournal(newMeta);

  return newMeta;
}


// 5. Add Entry
export async function addSharedEntry(journalId: string, entry: any): Promise<void> {
  // 1. Sanitize: Remove 'undefined' values which crash Firestore
  const cleanEntry = JSON.parse(JSON.stringify(entry));
  
  // 2. Delegate to Store: This ensures the "Tombstone" is cleared before saving
  // We manually attach journalId so the store knows where to put it
  await useJournalStore.getState().addSharedEntry({ ...cleanEntry, journalId });
}


// 5.5 Create Invite Link (New)
export async function createInviteLink(journalId: string, user?: any): Promise<string> {
  // 1. Generate deep link (matches config: 'join/:journalId')
  const url = Linking.createURL(`join/${journalId}`);
  
  // 2. Create message
  const name = user?.displayName || "A friend";
  return `${name} invited you to a Shared Journal on Micro Muse!\n\nTap to join:\n${url}`;
}

// 6. Leave Journal (With Ownership Transfer)
export async function leaveSharedJournal(journalId: string, userId: string): Promise<void> {
  try {
    const journalRef = doc(db, "journals", journalId);
    const snap = await getDoc(journalRef);
    
    if (!snap.exists()) return;

    const data = snap.data();
    const members = (data.members || []) as string[];
    const membersMap = data.membersMap || {};
    const remainingMembers = members.filter(id => id !== userId);

    // If no one is left, delete the journal
    if (remainingMembers.length === 0) {
      await deleteDoc(journalRef);
      useJournalStore.getState().removeJournal(journalId);
      return;
    }

const updates: any = {
      members: arrayRemove(userId),
      memberIds: arrayRemove(userId), // <--- Added
      [`membersMap.${userId}`]: deleteField()
    };

    // Check if the leaving user was the Owner or the last Admin
    const isOwner = data.owner === userId;
    // Check if there are any other admins/owners left
    const hasOtherAdmin = remainingMembers.some(id => 
      membersMap[id] === 'owner' || membersMap[id] === 'admin'
    );

    // Transfer Authority Logic:
    // If Owner leaves OR (Admin leaves AND no other admins exist)
    if (isOwner || (!hasOtherAdmin && membersMap[userId] === 'admin')) {
        const newAdminId = remainingMembers[0]; // Next oldest member
        
        // If owner left, transfer ownership completely
        if (isOwner) {
            updates.owner = newAdminId;
            updates[`membersMap.${newAdminId}`] = 'owner';
        } else {
            // Otherwise just make them admin to ensure someone is in charge
            updates[`membersMap.${newAdminId}`] = 'admin';
        }
    }

    await updateDoc(journalRef, updates);

    // Remove locally
    useJournalStore.getState().removeJournal(journalId);
    
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

// 9. Report Content
export async function reportContent(
  journalId: string, 
  entryId: string, 
  type: 'entry' | 'comment', 
  contentId: string, // entryId or commentId
  reason: string, 
  reportedBy: string,
  contentAuthorId?: string,
  textSnippet?: string
): Promise<void> {
  await addDoc(collection(db, "reports"), {
    journalId,
    entryId,
    type,
    contentId,
    contentAuthorId,
    textSnippet: textSnippet || '',
    reason,
    reportedBy,
    createdAt: Date.now(),
    status: 'pending'
  });
}
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
  addDoc,
  query,      // <--- Added
  where,      // <--- Added
  getDocs,    // <--- Added
  DocumentData,
} from "firebase/firestore";

import { useJournalStore, JournalMeta } from "../stores/journalStore";
// Removed uuid import to prevent RN crash
import { JournalService } from "./journalService";

// Helper: Generate ID without needing polyfills
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
export async function createSharedJournal(name: string, userId: string, userName?: string, userPhoto?: string | null): Promise<string> {
  const journalId = generateUUID();

  // SCHEMA: Root 'journals' collection
  const journalRef = doc(db, "journals", journalId);

  const metadata: JournalMeta = {
    id: journalId,
    name,
    owner: userId,
    createdAt: Date.now(),
    members: [userId], 
    memberIds: [userId],
    membersMap: { [userId]: userName || "Founder" },
    memberPhotos: userPhoto ? { [userId]: userPhoto } : {}, // <--- Save Photo
  };
  
const firestoreData = {
    ...metadata,
    roles: { [userId]: 'owner' }, // <--- Changed from membersMap
    updatedAt: Date.now(),
    isShared: true,
  };

  await setDoc(journalRef, firestoreData);

  // Also add locally
  useJournalStore.getState().addJournal(metadata);

  return journalId;
}
// 2. Join Shared Journal
export async function joinSharedJournal(journalId: string, userId: string, userName?: string, userPhoto?: string | null): Promise<JournalMeta> {
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
const updates: any = {
    members: arrayUnion(userId),
    memberIds: arrayUnion(userId),
    [`roles.${userId}`]: 'member',
    [`membersMap.${userId}`]: userName || "Member"
};
if (userPhoto) {
    updates[`memberPhotos.${userId}`] = userPhoto;
}

await updateDoc(journalRef, updates);

const newMeta = {
    ...data,
    id: journalId,
    members: [...members, userId],
    memberIds: [...(data.memberIds || []), userId],
    // Ensure local state has the new user's name and photo immediately
    membersMap: { ...(data.membersMap || {}), [userId]: userName || "Member" },
    memberPhotos: { ...(data.memberPhotos || {}), [userId]: userPhoto || null }
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

const roles = data.roles || data.membersMap || {}; // Fallback for legacy
    
    const updates: any = {
      members: arrayRemove(userId),
      memberIds: arrayRemove(userId),
      [`roles.${userId}`]: deleteField() // <--- Changed
    };

    // Check if the leaving user was the Owner or the last Admin
    const isOwner = data.owner === userId;
    // Check if there are any other admins/owners left
    const hasOtherAdmin = remainingMembers.some(id => 
      roles[id] === 'owner' || roles[id] === 'admin'
    );

    // Transfer Authority Logic:
    // If Owner leaves OR (Admin leaves AND no other admins exist)
    if (isOwner || (!hasOtherAdmin && roles[userId] === 'admin')) {
        const newAdminId = remainingMembers[0]; // Next oldest member
        
        // If owner left, transfer ownership completely
        if (isOwner) {
            updates.owner = newAdminId;
            updates[`roles.${newAdminId}`] = 'owner'; // <--- Changed
        } else {
            // Otherwise just make them admin to ensure someone is in charge
            updates[`roles.${newAdminId}`] = 'admin'; // <--- Changed
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
  
  // 1. Update Firestore (Use roles)
  await updateDoc(journalRef, {
    members: arrayRemove(userId),
    memberIds: arrayRemove(userId),
    [`roles.${userId}`]: deleteField() // <--- Changed
  });

  // 2. Update Local Store
  const store = useJournalStore.getState();
  const journal = store.journals[journalId];
  if (journal) {
      const newMembers = (journal.members || []).filter(m => m !== userId);
      const newMemberIds = (journal.memberIds || []).filter(id => id !== userId);
      const newRoles = { ...(journal.roles || {}) };
      delete newRoles[userId];
      
      store.updateJournalMeta(journalId, { 
          members: newMembers, 
          memberIds: newMemberIds, 
          roles: newRoles 
      });
  }
}

export async function updateMemberRole(journalId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
  const journalRef = doc(db, "journals", journalId);
  
  // 1. Update Firestore (Use roles)
  await updateDoc(journalRef, {
    [`roles.${userId}`]: role // <--- Changed
  });

  // 2. Update Local Store (Instant UI Refresh)
  const store = useJournalStore.getState();
  const journal = store.journals[journalId];
  if (journal) {
      const newRoles = { ...(journal.roles || {}), [userId]: role };
      store.updateJournalMeta(journalId, { roles: newRoles });
  }
}

// 7.5 Update Journal Name (Admin/Owner)
export async function updateJournalName(journalId: string, newName: string): Promise<void> {
  if (!newName.trim()) return;
  
  const journalRef = doc(db, "journals", journalId);

  // 1. Update Firestore
  await updateDoc(journalRef, {
    name: newName.trim()
  });

  // 2. Update Local Store
  const store = useJournalStore.getState();
  store.updateJournalMeta(journalId, { name: newName.trim() });
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
  // 1. Check if user already reported this content
  const q = query(
    collection(db, "journals", journalId, "reports"),
    where("contentId", "==", contentId),
    where("reportedBy", "==", reportedBy)
  );
  
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error("You have already reported this content.");
  }

  // 2. Store report INSIDE the journal
  await addDoc(collection(db, "journals", journalId, "reports"), {
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

// 10. Sync Profile Photo to Journals
export async function updateUserPhotoInJournals(userId: string, photoUrl: string): Promise<void> {
  // Update Cloud Only (Local update will be handled by the Screen to avoid loops)
  const q = query(collection(db, "journals"), where("memberIds", "array-contains", userId));
  const snapshot = await getDocs(q);
  
  const batchUpdates = snapshot.docs.map(docSnap => {
     return updateDoc(docSnap.ref, {
         [`memberPhotos.${userId}`]: photoUrl
     });
  });
  
  await Promise.all(batchUpdates);
}

// 11. Sync Profile Name to Journals
export async function updateUserNameInJournals(userId: string, newName: string): Promise<void> {
  // Find all journals where this user is a member
  const q = query(collection(db, "journals"), where("memberIds", "array-contains", userId));
  const snapshot = await getDocs(q);
  
  // Update the name in all found journals
  const batchUpdates = snapshot.docs.map(docSnap => {
     return updateDoc(docSnap.ref, {
         [`membersMap.${userId}`]: newName
     });
  });
  
  await Promise.all(batchUpdates);
}
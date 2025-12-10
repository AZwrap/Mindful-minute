import { db, auth } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  onSnapshot,
  arrayUnion,
  DocumentChange,
  Unsubscribe
} from "firebase/firestore";

export interface JournalMeta {
  id: string;
  name: string;
  members: string[]; 
  memberIds?: string[];
  createdAt?: any;
  owner?: string;
  updatedAt?: number;
  lastEntry?: {
    text: string;
    author: string;
    createdAt: number;
  };
}

export const JournalService = {
  // Generate ID helper
  generateId() {
    return "jid_" + Math.random().toString(36).slice(2, 10);
  },

  // Create
  async createJournal(journalName: string, ownerName: string) {
    const journalId = this.generateId();
    const uid = auth.currentUser?.uid;
    
    const newJournal: JournalMeta = {
      id: journalId,
      name: journalName || "Shared Journal",
      members: [ownerName],
      memberIds: uid ? [uid] : [],
      owner: uid,
      createdAt: Date.now(),
    };

    const ref = doc(db, "journals", journalId);
    await setDoc(ref, newJournal);
    return newJournal;
  },

  // Join
  async joinJournal(journalId: string, memberName: string) {
    const ref = doc(db, "journals", journalId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error("Journal does not exist");
    }

    const updates: any = { members: arrayUnion(memberName) };
    if (auth.currentUser?.uid) {
      updates.memberIds = arrayUnion(auth.currentUser.uid);
    }

    await updateDoc(ref, updates);
    return snap.data() as JournalMeta;
  },

  // Restore
  async getUserJournals(uid: string) {
    const q = query(collection(db, "journals"), where("memberIds", "array-contains", uid));
    const snapshot = await getDocs(q);
    
    const journals: Record<string, JournalMeta> = {};
    snapshot.forEach((doc) => {
      journals[doc.id] = doc.data() as JournalMeta;
    });
    return journals;
  },

// Subscribe (Listener) - Defaults to last 20
  subscribeToEntries(
    journalId: string, 
    limitCount: number = 20,
    onUpdate: (entries: any[], changes: DocumentChange[], isLocal: boolean) => void, 
    onError: (error: any) => void
  ): Unsubscribe {
    const entriesRef = collection(db, "journals", journalId, "entries");
    const q = query(entriesRef, orderBy("createdAt", "desc"), limit(limitCount));

    return onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({
        entryId: doc.id,
        ...doc.data(),
      }));
      
      onUpdate(entries, snapshot.docChanges(), snapshot.metadata.hasPendingWrites);
    }, onError);
  },

  // Pagination
  async fetchOlderEntries(journalId: string, lastTimestamp: number, limitCount: number = 20) {
    const entriesRef = collection(db, "journals", journalId, "entries");
    const q = query(
      entriesRef, 
      orderBy("createdAt", "desc"), 
      startAfter(lastTimestamp), 
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      entryId: doc.id,
      ...doc.data(),
    }));
  },

  // CRUD Actions
  async addEntry(journalId: string, entry: any) {
    const timestamp = Date.now();
    const entriesCol = collection(db, "journals", journalId, "entries");
    const journalRef = doc(db, "journals", journalId);

    await addDoc(entriesCol, { ...entry, createdAt: timestamp });
    
    // Update meta
    await updateDoc(journalRef, {
      lastEntry: {
        text: entry.text.substring(0, 50),
        author: entry.authorName,
        createdAt: timestamp
      },
      updatedAt: timestamp
    });
  },

  async deleteEntry(journalId: string, entryId: string) {
    const ref = doc(db, "journals", journalId, "entries", entryId);
    await deleteDoc(ref);
  },

async updateEntry(journalId: string, entryId: string, newText: string, imageUri?: string | null) {
    const ref = doc(db, "journals", journalId, "entries", entryId);
    const updates: any = { text: newText, updatedAt: Date.now() };
    
    // Only update image if explicitly passed (null means delete, string means update)
    if (imageUri !== undefined) {
      updates.imageUri = imageUri;
    }
    
    await updateDoc(ref, updates);
  }
};

// Helper for getDocs inside this file to avoid extra imports in Store if we missed it
import { getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig"; // your firestore config
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { useJournalStore } from "../stores/journalStore";

export const syncSharedJournal = async (journalId) => {
  const journal = useJournalStore.getState().journals.find(
    (j) => j.id === journalId
  );

  if (!journal || journal.type !== "shared") return;

  const ref = doc(db, "sharedJournals", journalId);

  // Upload local version
  await setDoc(ref, journal, { merge: true });

  // Listen for updates
  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    useJournalStore.getState().mergeSharedJournal(snap.data());
  });
};

export const joinSharedJournal = async (journalId) => {
  const ref = doc(db, "sharedJournals", journalId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error("Invite link invalid");

  // Merge remote journal into local storage
  useJournalStore.getState().mergeSharedJournal(snap.data());

  return snap.data();
};

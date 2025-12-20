import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Unsubscribe } from "firebase/firestore";
import { auth } from "../firebaseConfig";
import { JournalService, JournalMeta } from "../services/journalService";
import { sendImmediateNotification } from "../lib/notifications";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export interface JournalMeta {
  id: string;
  name: string;
  members: string[]; 
  memberIds?: string[];
membersMap?: Record<string, string>; // Maps UID -> Display Name
  memberPhotos?: Record<string, string>; // Maps UID -> Photo URL
  nicknames?: Record<string, string>; // Maps UID -> Local Nickname (Private) <--- Added
  photoUrl?: string;
  createdAt?: any;
  owner?: string;
  updatedAt?: number;
lastEntry?: {
    text: string;
    author: string;
    createdAt: number;
    userId?: string; // <--- Added userId
  };
}

interface JournalState {
  currentJournalId: string | null;
  sharedEntries: Record<string, any[]>;
  journalInfo: JournalMeta | null;
  isLoading: boolean;
  _unsubscribes: Record<string, Unsubscribe>; // <--- UPDATED: Track multiple listeners
  journals: Record<string, JournalMeta>;
  currentUser: string | null;
  lastRead: Record<string, number>;
  deletedDocDates: string[];
}

interface JournalActions {
  createJournal: (ownerName: string) => Promise<string>;
  joinJournal: (journalId: string, memberName?: string) => Promise<boolean>;
  restoreJournals: () => Promise<number>;
  subscribeToJournal: (journalId: string) => void;
  subscribeToAllJournals: () => void; // <--- ADDED: Missing function
  deleteSharedEntry: (journalId: string, entryId: string) => Promise<void>;
  toggleCommentReaction: (journalId: string, entryId: string, commentId: string, userId: string, emoji: string) => Promise<void>;
  setSharedEntries: (journalId: string, entries: any[]) => void; 
  addSharedEntry: (entry: any) => Promise<void>; 
  updateJournalMeta: (journalId: string, data: any) => void;
  setMemberNickname: (journalId: string, userId: string, nickname: string) => void; // <--- Added
  addJournal: (journal: JournalMeta) => void;
  removeJournal: (journalId: string) => void;
  setCurrentUser: (userId: string) => void;
  markAsRead: (journalId: string) => void;
leaveJournal: () => void;
  reset: () => void;
  deleteComment: (journalId: string, entryId: string, comment: any) => Promise<void>;
}

type JournalStore = JournalState & JournalActions;

// --------------------------------------------------
// STORE
// --------------------------------------------------
export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      // STATE
      currentJournalId: null,
      journals: {},
      sharedEntries: {},
      journalInfo: null,
      isLoading: false,
      _unsubscribes: {}, // <--- Initial State
      currentUser: null,
      lastRead: {},
      deletedDocDates: [],

      // ACTIONS
      setCurrentUser: (userId) => set({ currentUser: userId }),
      
      markAsRead: (journalId: string) => 
        set((state) => ({
          lastRead: { ...(state.lastRead || {}), [journalId]: Date.now() }
        })),

      createJournal: async (journalName: string, ownerName: string) => {
        const newJournal = await JournalService.createJournal(journalName, ownerName);
        const journalId = newJournal.id;

        set((state) => ({
          currentJournalId: journalId,
          journalInfo: newJournal,
          journals: { ...(state.journals || {}), [journalId]: newJournal }
        }));

        get().subscribeToJournal(journalId);
        return journalId;
      },

      joinJournal: async (journalId, memberName = "User") => {
        const info = await JournalService.joinJournal(journalId, memberName);

        set((state) => ({
          currentJournalId: journalId,
          journalInfo: info,
          journals: { ...(state.journals || {}), [journalId]: info }
        }));

        get().subscribeToJournal(journalId);
        return true;
      },

      restoreJournals: async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) throw new Error("Must be logged in to restore journals.");

        set({ isLoading: true });
        try {
          const restored = await JournalService.getUserJournals(uid);
          
          set((state) => ({
            // SAFEGUARD: Ensure we don't crash on undefined
            journals: { ...(state.journals || {}), ...(restored || {}) },
            isLoading: false
          }));
          
          return Object.keys(restored || {}).length;
        } catch (error) {
          console.error("Restore failed:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      // NEW: Listen to one journal (Idempotent)
      subscribeToJournal: (journalId) => {
        // Prevent duplicate listeners for the same journal
        if (get()._unsubscribes?.[journalId]) return;

        set({ isLoading: true });
        let isFirstRun = true;

        const unsub = JournalService.subscribeToEntries(
          journalId,
          20,
          (recents, changes, isLocal) => {
// Check for NEW arrivals (Notification Trigger)
            if (!isLocal && !isFirstRun) {
              changes.forEach((change) => {
                if (change.type === "added") {
                  const data = change.doc.data();
                  
                  // Handle both Number and Firestore Timestamp
                  const createdAt = typeof data.createdAt === 'number' 
                    ? data.createdAt 
                    : (data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now());

                  // 1 Hour Window: More robust against clock skew between devices
                  const diff = Date.now() - createdAt;
                  const isRecent = diff < 3600000 && diff > -300000; // allow 1h old, or 5m into 'future' (clock drift)
                  
                  const isOthers = data.owner !== get().currentUser && data.userId !== get().currentUser;

                  if (isRecent && isOthers) {
                    const author = data.authorName || "Someone";
                    const journalName = get().journals?.[journalId]?.name || "Journal";
                    sendImmediateNotification(
                      `New Entry in ${journalName}`, 
                      `${author} just posted.`,
                      { journalId }
                    );
                  }
                }
              });
            }

            set((state) => {
              const currentList = state.sharedEntries?.[journalId] || [];
              const rawRecentMap = new Map(recents.map(e => [e.entryId, e]));

              // Deduplicate
              const validHistory = currentList.filter(e => {
                 if (rawRecentMap.has(e.entryId)) return false;
                 if (e.originalDate) {
                     const serverEntryForDate = recents.find(r => r.originalDate === e.originalDate);
                     if (serverEntryForDate) return false;
                 }
                 return true;
              });
              
              const merged = [...recents, ...validHistory];
              
              // Update Preview in Journal List
              let updatedJournals = state.journals || {};
              const currentJournal = updatedJournals[journalId];

              if (currentJournal) {
                  const latest = merged.length > 0 ? merged[0] : null;
                  const newMeta = { ...currentJournal };
if (latest) {
                      newMeta.lastEntry = {
                          text: latest.text || "",
                          author: latest.authorName || "Anonymous",
                          createdAt: latest.createdAt,
                          userId: latest.userId // <--- Save User ID
                      };
                      newMeta.updatedAt = latest.createdAt;
                  }
                  updatedJournals = { ...updatedJournals, [journalId]: newMeta };
              }

              return {
                sharedEntries: { ...(state.sharedEntries || {}), [journalId]: merged },
                journals: updatedJournals,
                isLoading: false,
              };
            });
            
            isFirstRun = false;
          },
          (error) => {
            console.error("Shared Journal Sync Error:", error);
            set({ isLoading: false });
          }
        );

        // Save listener
        set((state) => ({
            _unsubscribes: { ...(state._unsubscribes || {}), [journalId]: unsub }
        }));
      },

      // NEW: Listen to ALL journals (called on App Start)
      subscribeToAllJournals: () => {
          const state = get();
          const journals = state.journals || {};
          // Safe check for undefined
          if (!journals) return;

          Object.keys(journals).forEach(id => {
              get().subscribeToJournal(id);
          });
      },

      addSharedEntry: async (entry) => {
        const targetId = entry.journalId || get().currentJournalId;
        if (!targetId) return;

        // Whitelist date to prevent "Zombie Killer"
        if (entry.originalDate) {
            set((state) => ({
                deletedDocDates: (state.deletedDocDates || []).filter(d => d !== entry.originalDate)
            }));
        }

        await JournalService.addEntry(targetId, entry);
      },

      deleteSharedEntry: async (journalId, entryId) => {
        const prevState = get();
        const entryToDelete = prevState.sharedEntries?.[journalId]?.find(e => e.entryId === entryId);

        set((state) => {
            const currentEntries = state.sharedEntries?.[journalId] || [];
            const newEntries = currentEntries.filter(e => e.entryId !== entryId);
            
            // Recalculate Preview
            const sorted = [...newEntries].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const latest = sorted.length > 0 ? sorted[0] : null;

            const updatedJournals = { ...(state.journals || {}) };
            if (updatedJournals[journalId]) {
                const updatedMeta = { ...updatedJournals[journalId] };
if (latest) {
                    updatedMeta.lastEntry = {
                        text: latest.text || "",
                        author: latest.authorName || "Anonymous",
                        createdAt: latest.createdAt,
                        userId: latest.userId // <--- Save User ID
                    };
                } else {
                    delete updatedMeta.lastEntry;
                }
                updatedJournals[journalId] = updatedMeta;
            }

            return {
              sharedEntries: { ...(state.sharedEntries || {}), [journalId]: newEntries },
              journals: updatedJournals
            };
        });

        // Handle Temp/Local Deletion
        if (typeof entryId === 'string' && entryId.startsWith('temp_')) {
            if (entryToDelete?.originalDate) {
                set(s => ({ deletedDocDates: [...(s.deletedDocDates || []), entryToDelete.originalDate] }));
            }
            return;
        }

        try {
          await JournalService.deleteEntry(journalId, entryId);
        } catch (error) {
          console.error("Failed to delete entry, rolling back:", error);
          set({ 
            sharedEntries: prevState.sharedEntries, 
            journals: prevState.journals 
          });
          throw error;
        }
      },

toggleCommentReaction: async (journalId, entryId, commentId, userId, emoji) => {
        // 1. Optimistic Update (Update UI Immediately)
        set((state) => {
            const entries = state.sharedEntries?.[journalId] || [];
            const updatedEntries = entries.map(e => {
                if (e.entryId !== entryId) return e;
                
                // Find and update the specific comment
                const updatedComments = (e.comments || []).map((c: any) => {
                    if (c.id !== commentId) return c;
                    
                    const reactions = c.reactions || {};
                    const userList = reactions[emoji] || [];
                    let newUserList;
                    
                    if (userList.includes(userId)) {
                        newUserList = userList.filter((u: string) => u !== userId);
                    } else {
                        newUserList = [...userList, userId];
                    }
                    
                    const newReactions = { ...reactions, [emoji]: newUserList };
                    if (newUserList.length === 0) delete newReactions[emoji];
                    
                    return { ...c, reactions: newReactions };
                });
                
                return { ...e, comments: updatedComments };
            });
            
            return { sharedEntries: { ...(state.sharedEntries || {}), [journalId]: updatedEntries } };
        });

        // 2. Background Network Request
        try {
           await JournalService.toggleCommentReaction(journalId, entryId, commentId, userId, emoji);
        } catch (e) {
           console.error("Reaction failed:", e);
        }
      },

      // Helpers
      setSharedEntries: (journalId, entries) =>
        set((state) => ({
          sharedEntries: { ...(state.sharedEntries || {}), [journalId]: entries },
        })),

        updateJournalMeta: (journalId, data) =>
        set((state) => ({
          journalInfo: { ...(state.journalInfo || { id: journalId, name: 'Unknown', members: [] }), ...data },
          journals: {
            ...(state.journals || {}),
            [journalId]: { ...(state.journals?.[journalId] || {}), ...data }
          }
        })),

setMemberNickname: (journalId, userId, nickname) => {
        set((state) => {
          const journal = state.journals[journalId];
          if (!journal) return state;

          const newNicknames = { ...(journal.nicknames || {}), [userId]: nickname };
          
          return {
            journals: {
              ...state.journals,
              [journalId]: { ...journal, nicknames: newNicknames }
            }
          };
        });
      },

      addSharedEntryList: (journalId, entries) =>
        set((state) => ({
          sharedEntries: { ...(state.sharedEntries || {}), [journalId]: entries },
        })),
        
      addJournal: (journal) => 
        set((state) => ({
          journals: { ...(state.journals || {}), [journal.id]: journal }
        })),

      removeJournal: (journalId) =>
        set((state) => {
          const newJournals = { ...(state.journals || {}) };
          delete newJournals[journalId];
          
          // Also cleanup listener
          const unsub = state._unsubscribes?.[journalId];
          if (unsub) unsub();
          
          const newUnsubscribes = { ...(state._unsubscribes || {}) };
          delete newUnsubscribes[journalId];

          return { journals: newJournals, _unsubscribes: newUnsubscribes };
        }),

      // Cleanup
      leaveJournal: () => {
        // Stop all listeners
        const unsubs = get()._unsubscribes || {};
        Object.values(unsubs).forEach(u => u());

        set({
          currentJournalId: null,
          journals: {},
          sharedEntries: {},
          journalInfo: null,
          isLoading: false,
          _unsubscribes: {}, 
          currentUser: null,
          lastRead: {},
          deletedDocDates: [], 
        });
      },

reset: () => {
        get().leaveJournal();
      },

      deleteComment: async (journalId, entryId, comment) => {
         // 1. Optimistic Update (Remove from UI immediately)
         set((state) => {
            const entries = state.sharedEntries?.[journalId] || [];
            const updatedEntries = entries.map(e => {
                if (e.entryId !== entryId) return e;
// Filter out the specific comment (Use ID for safety)
                const newComments = (e.comments || []).filter((c: any) => c.id !== comment.id);
                return { ...e, comments: newComments };
            });
            return { sharedEntries: { ...(state.sharedEntries || {}), [journalId]: updatedEntries } };
         });

         // 2. Network Request
         try {
             await JournalService.deleteComment(journalId, entryId, comment);
         } catch (e) {
             console.error("Failed to delete comment:", e);
             // Optionally revert here if needed
         }
      }
    }),
    {
      name: "journal-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentJournalId: state.currentJournalId,
        journalInfo: state.journalInfo,
        journals: state.journals,
        sharedEntries: state.sharedEntries, 
        currentUser: state.currentUser,
        lastRead: state.lastRead, 
        deletedDocDates: state.deletedDocDates,
      }),
    }
  )
);
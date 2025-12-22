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


interface JournalState {
  currentJournalId: string | null;
  sharedEntries: Record<string, any[]>;
  journalInfo: JournalMeta | null;
  isLoading: boolean;
  _unsubscribes: Record<string, Unsubscribe>; 
  journals: Record<string, JournalMeta>;
  currentUser: string | null;
  lastRead: Record<string, number>;
  deletedDocDates: string[];
  blockedUsers: Record<string, string[]>; // <--- ADDED STATE
}

interface JournalActions {
  // Fix createJournal to take 2 args if needed, or keep 1 if your code expects 1
  createJournal: (journalName: string, ownerName: string) => Promise<string>; 
  joinJournal: (journalId: string, memberName?: string) => Promise<boolean>;
  
  // --- ADD THESE DEFINITIONS ---
blockUser: (currentUserId: string, targetUserId: string) => void;
  unblockUser: (currentUserId: string, targetUserId: string) => void;
  // -----------------------------

  restoreJournals: () => Promise<number>;
  subscribeToJournal: (journalId: string) => void;
  subscribeToAllJournals: () => void; 
  deleteSharedEntry: (journalId: string, entryId: string) => Promise<void>;
  updateSharedEntry: (journalId: string, entryId: string, updates: any) => Promise<void>;
  toggleCommentReaction: (journalId: string, entryId: string, commentId: string, userId: string, emoji: string) => Promise<void>;
  setSharedEntries: (journalId: string, entries: any[]) => void;
  addSharedEntry: (entry: any) => Promise<void>; 
  updateJournalMeta: (journalId: string, data: any) => void;
  setMemberNickname: (journalId: string, userId: string, nickname: string) => void;
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
      blockedUsers: {}, // <--- INITIALIZE STATE

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
                
                // --- NEW: Detect Comments (Modified Entries) ---
                if (change.type === "modified") {
                  const data = change.doc.data();
                  const currentUserId = get().currentUser;

                  // 1. Only care if *I* am the author of the entry
                  if (data.userId === currentUserId) {
                    
                    const comments = data.comments || [];
                    if (comments.length > 0) {
                      const latestComment = comments[comments.length - 1];

                      // 2. Check Recency (Last 60 seconds)
                      // Prevents spam when loading old data or syncing
                      const diff = Date.now() - (latestComment.createdAt || 0);
                      const isRecentComment = diff < 60000 && diff > -5000;

                      // 3. Ensure *I* didn't write the comment (No self-notification)
                      const isOthersComment = latestComment.userId !== currentUserId;

                      if (isRecentComment && isOthersComment) {
                        const commenter = latestComment.authorName || "Someone";
                        sendImmediateNotification(
                          "New Comment", 
                          `${commenter} commented on your entry.`,
                          { journalId, entryId: change.doc.id }
                        );
                      }
                    }
                  }
                }
                // -----------------------------------------------

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

// NEW: Handle Updates
      updateSharedEntry: async (journalId, entryId, updates) => {
        // 1. Optimistic Update
        set((state) => {
           const list = state.sharedEntries?.[journalId] || [];
           // Triple check the '...updates' part below:
           const updatedList = list.map(e => e.entryId === entryId ? { ...e, ...updates } : e);
           return {
              sharedEntries: { ...(state.sharedEntries || {}), [journalId]: updatedList }
           };
        });

        // 2. Network Request
        try {
           await JournalService.updateEntry(journalId, entryId, updates);
        } catch (e) {
           console.error("Update failed:", e);
           throw e; 
        }
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

// Add 'any' types to silence errors
      addSharedEntryList: (journalId: string, entries: any[]) =>
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

      // --- BLOCKING LOGIC ---
blockUser: (currentUserId, targetUserId) => set((state) => {
        const userBlocks = state.blockedUsers?.[currentUserId] || [];
        if (userBlocks.includes(targetUserId)) return state;
        return {
          blockedUsers: { ...state.blockedUsers, [currentUserId]: [...userBlocks, targetUserId] }
        };
      }),

unblockUser: (currentUserId, targetUserId) => set((state) => {
         const userBlocks = state.blockedUsers?.[currentUserId] || [];
         return {
           blockedUsers: { ...state.blockedUsers, [currentUserId]: userBlocks.filter(id => id !== targetUserId) }
         };
      }),
      // ----------------------

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
        blockedUsers: state.blockedUsers, // <--- SAVE TO DISK
      }),
    }
  )
);
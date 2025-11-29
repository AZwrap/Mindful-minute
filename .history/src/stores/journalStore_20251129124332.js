import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as Crypto from "expo-crypto";

export const useJournalStore = create(
  persist(
    (set, get) => ({
      journals: [], // All journals (private + shared)

      // Create new journal
      createJournal: (title, type = "private") => {
        const newJournal = {
          id: Crypto.randomUUID(),
          title,
          type, // "private" or "shared"
          owner: "local-user", 
          members: [], // emails or invite IDs
          lastUpdated: Date.now(),
        };

        set({ journals: [...get().journals, newJournal] });
        return newJournal.id;
      },

      // Update journal (rename, members, type, etc)
      updateJournal: (id, data) => {
        set({
          journals: get().journals.map((j) =>
            j.id === id ? { ...j, ...data, lastUpdated: Date.now() } : j
          ),
        });
      },

      // Add member to shared journal
      addMember: (journalId, email) => {
        set({
          journals: get().journals.map((j) =>
            j.id === journalId
              ? { ...j, members: [...j.members, email], type: "shared" }
              : j
          ),
        });
      },

      // Replace journal list from remote sync
      mergeSharedJournal: (remoteJournal) => {
        const local = get().journals.find(j => j.id === remoteJournal.id);

        // If journal doesn't exist, add it
        if (!local) {
          set({ journals: [...get().journals, remoteJournal] });
        } else {
          // Merge updates
          if (remoteJournal.lastUpdated > local.lastUpdated) {
            set({
              journals: get().journals.map(j =>
                j.id === remoteJournal.id ? remoteJournal : j
              ),
            });
          }
        }
      },
    }),
    {
      name: "journal-storage",
    }
  )
);

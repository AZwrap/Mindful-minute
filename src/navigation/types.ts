export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  MainTabs: undefined; 

  // Modals & Features
  Write: { date: string; prompt?: { text: string; isSmart?: boolean }; text?: string };
  FocusWrite: { date: string; prompt?: { text: string; isSmart?: boolean }; text?: string };
  MoodTag: { date: string; text: string; prompt?: string; savedFrom?: string };
  EntryDetail: { date: string; savedFrom?: string };
  WeeklyRecap: undefined;
  CustomPrompt: { date: string; currentPrompt: string; isCustom: boolean };
  Premium: undefined;
  Achievements: undefined;

  // Shared Journal Routes
  JournalDetails: { journalId: string };
JournalList: undefined; // <--- Add this back!
  SharedJournal: { journalId: string };
  SharedEntryDetail: { entry: any };
  SharedWrite: { journalId: string; entry?: any };
  Invite: undefined;
  GroupReports: { journalId: string };
};
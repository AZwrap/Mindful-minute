import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Screen Imports
import HomeScreen from "../screens/HomeScreen";
import WriteScreen from "../screens/WriteScreen";
import FocusWriteScreen from "../screens/FocusWriteScreen";
import MoodTagScreen from "../screens/MoodTagScreen";
import EntryDetailScreen from "../screens/EntryDetailScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PremiumScreen from "../screens/PremiumScreen";
import StatsScreen from "../screens/StatsScreen";
import CustomPromptScreen from "../screens/CustomPromptScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import WeeklyRecapScreen from "../screens/WeeklyRecapScreen";
import SharedJournalScreen from "../screens/SharedJournalScreen";
import SharedWriteScreen from "../screens/SharedWriteScreen";
import SharedEntryDetailScreen from "../screens/SharedEntryDetailScreen";
import InviteScreen from "../screens/InviteScreen";
import OnboardingScreen from '../screens/OnboardingScreen';
import TabNavigator from './TabNavigator';

import { useSettings } from '../stores/settingsStore';

// --------------------------------------------------
// DEFINE NAVIGATION TYPES
// --------------------------------------------------
export type RootStackParamList = {
  Onboarding: undefined;
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

  // Shared Journal
  Invite: undefined;
  SharedWrite: { journalId: string };
  SharedJournal: { journalId: string };
  SharedEntryDetail: { entry: any }; // We can refine 'any' later once we type the SharedEntry model
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  const hasOnboarded = useSettings((s) => s.hasOnboarded);
  const loaded = useSettings((s) => s.loaded);

  // ⛔ Block rendering until Zustand has hydrated
  if (!loaded) return null;

  return (
    <Stack.Navigator
      initialRouteName={hasOnboarded ? "MainTabs" : "Onboarding"}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      <Stack.Screen name="Write" component={WriteScreen} />
      <Stack.Screen name="FocusWrite" component={FocusWriteScreen} />
      <Stack.Screen name="MoodTag" component={MoodTagScreen} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="WeeklyRecap" component={WeeklyRecapScreen} />
      <Stack.Screen name="CustomPrompt" component={CustomPromptScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />

      <Stack.Screen name="Invite" component={InviteScreen} />
      <Stack.Screen name="SharedWrite" component={SharedWriteScreen} />
      <Stack.Screen name="SharedJournal" component={SharedJournalScreen} />
      <Stack.Screen name="SharedEntryDetail" component={SharedEntryDetailScreen} />

      <Stack.Screen name="Achievements" component={AchievementsScreen} />
    </Stack.Navigator>
  );
}

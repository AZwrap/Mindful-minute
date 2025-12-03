// src/navigation/RootStack.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

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
import { useTheme } from "../stores/themeStore";
import { useColorScheme } from "react-native";
import SharedJournalScreen from "../screens/SharedJournalScreen";
import SharedWriteScreen from "../screens/SharedWriteScreen";
import SharedEntryDetailScreen from "../screens/SharedEntryDetailScreen";
import InviteScreen from "../screens/InviteScreen";
import OnboardingScreen from '../screens/OnboardingScreen';
import { useSettings } from '../stores/settingsStore'; // Import store
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();

export default function RootStack() {
  const hasOnboarded = useSettings((s) => s.hasOnboarded);

return (
<Stack.Navigator
      initialRouteName={hasOnboarded ? "MainTabs" : "Onboarding"}
      screenOptions={{ headerShown: false }}
    >
      {/* 1. Onboarding (Independent) */}
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />

      {/* 2. MAIN APP (The Tab Bar) */}
      <Stack.Screen name="MainTabs" component={TabNavigator} />

      {/* 3. MODALS & DETAILS (Cover the tabs) */}
      <Stack.Screen name="Write" component={WriteScreen} />
      <Stack.Screen name="FocusWrite" component={FocusWriteScreen} />
      <Stack.Screen name="MoodTag" component={MoodTagScreen} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="WeeklyRecap" component={WeeklyRecapScreen} />
      <Stack.Screen name="CustomPrompt" component={CustomPromptScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
      
      {/* Shared Journal Flow */}
      <Stack.Screen name="Invite" component={InviteScreen} />
      <Stack.Screen name="SharedWrite" component={SharedWriteScreen} />
      <Stack.Screen name="SharedJournal" component={SharedJournalScreen} />
      <Stack.Screen name="SharedEntryDetail" component={SharedEntryDetailScreen} />
      
      {/* NOTE: 'Home', 'History', 'Stats', 'Settings' are removed here 
          because they are now inside 'MainTabs' */}
    </Stack.Navigator>
  );
}

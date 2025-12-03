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

const Stack = createNativeStackNavigator();

export default function RootStack() {
  const hasOnboarded = useSettings((s) => s.hasOnboarded);

  return (
    <Stack.Navigator
      // If user hasn't onboarded, show Onboarding. Otherwise, go to Home.
      initialRouteName={hasOnboarded ? "Home" : "Onboarding"}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      
      {/* ... keep all your other existing screens below ... */}
      <Stack.Screen name="Write" component={WriteScreen} />
      <Stack.Screen name="MoodTag" component={MoodTagScreen} />
      <Stack.Screen name="Stats" component={StatsScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
      <Stack.Screen name="WeeklyRecap" component={WeeklyRecapScreen} />
      <Stack.Screen name="CustomPrompt" component={CustomPromptScreen} />
      <Stack.Screen name="FocusWrite" component={FocusWriteScreen} />
      <Stack.Screen name="Invite" component={InviteScreen} />
      <Stack.Screen name="SharedWrite" component={SharedWriteScreen} />
      <Stack.Screen name="SharedJournal" component={SharedJournalScreen} />
      <Stack.Screen name="SharedEntryDetail" component={SharedEntryDetailScreen} />
    </Stack.Navigator>
  );
}

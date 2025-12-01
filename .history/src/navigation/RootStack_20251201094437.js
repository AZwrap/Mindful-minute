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




const Stack = createNativeStackNavigator();

export default function RootStack() {
  const system = useColorScheme();
  const { getCurrentTheme } = useTheme();
  const currentTheme = getCurrentTheme(system);
  const isDark = currentTheme === "dark";
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        animation: "fade",
        headerStyle: {
          backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
        },
        headerTintColor: isDark ? "#E5E7EB" : "#0F172A", // back button + title
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Write" component={WriteScreen} />
<Stack.Screen
  name="FocusWrite"
  component={FocusWriteScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="SharedJournal"
  component={SharedJournalScreen}
  options={{
    title: "Shared Journals",
  }}
/>





<Stack.Screen
  name="SharedWrite"
  component={SharedWriteScreen}
  options={{ title: "New Entry" }}
/>
<Stack.Screen
  name="SharedEntryDetail"
  component={SharedEntryDetailScreen}
  options={{ headerShown: false }}
/>
<Stack.Screen
  name="Invite"
  component={InviteScreen}
  options={{ headerShown: false }}
/>


      <Stack.Screen name="MoodTag" component={MoodTagScreen} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
  <Stack.Screen name="CustomPrompt" component={CustomPromptScreen} />
  <Stack.Screen name="Achievements" component={AchievementsScreen} />
  <Stack.Screen name="WeeklyRecap" component={WeeklyRecapScreen} />
    </Stack.Navigator>
  );
}

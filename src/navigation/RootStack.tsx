import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from './MainTabs'; 

// Screen Imports
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import WriteScreen from "../screens/WriteScreen";
import FocusWriteScreen from "../screens/FocusWriteScreen";
import MoodTagScreen from "../screens/MoodTagScreen";
import EntryDetailScreen from "../screens/EntryDetailScreen";
import WeeklyRecapScreen from "../screens/WeeklyRecapScreen";
import PremiumScreen from "../screens/PremiumScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import CustomPromptScreen from "../screens/CustomPromptScreen";
import SharedWriteScreen from "../screens/SharedWriteScreen";
import SharedEntryDetailScreen from "../screens/SharedEntryDetailScreen";
import InviteScreen from "../screens/InviteScreen";
import SharedJournalScreen from "../screens/SharedJournalScreen";
import EditEntryScreen from "../screens/EditEntryScreen";

// Import Types
import { RootStackParamList } from './types';
import { useSettings } from '../stores/settingsStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  const hasOnboarded = useSettings((s) => s.hasOnboarded);
  const loaded = useSettings((s) => s.loaded);

  if (!loaded) return null;

  return (
    <Stack.Navigator
      initialRouteName={hasOnboarded ? "MainTabs" : "Onboarding"}
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right', 
        animationDuration: 400,
      }}
    >
      {/* Base Screens */}
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen} 
        options={{ animation: 'fade' }} 
      />
      <Stack.Screen 
        name="Auth" 
        component={AuthScreen} 
        options={{ animation: 'slide_from_right' }} 
      />
      
      {/* Main Tabs (Dashboard) */}
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ animation: 'fade' }} 
      />

      {/* Creation Flows */}
      <Stack.Screen 
        name="Write" 
        component={WriteScreen} 
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
      />
      <Stack.Screen 
        name="FocusWrite" 
        component={FocusWriteScreen} 
        options={{ animation: 'fade' }} 
      />
      <Stack.Screen 
        name="MoodTag" 
        component={MoodTagScreen} 
        options={{ animation: 'slide_from_right' }} 
      />
      <Stack.Screen 
        name="CustomPrompt" 
        component={CustomPromptScreen} 
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
      />
      <Stack.Screen 
        name="SharedWrite" 
        component={SharedWriteScreen} 
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
      />
      <Stack.Screen 
        name="EditEntry" 
        component={EditEntryScreen} 
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
      />
      <Stack.Screen 
        name="Invite" 
        component={InviteScreen} 
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }} 
      />

      {/* Detail Views */}
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="WeeklyRecap" component={WeeklyRecapScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      
{/* Shared Journal Specifics */}
      {/* JournalList & SharedJournal moved to MainTabs/HomeStack */}
      <Stack.Screen name="SharedEntryDetail" component={SharedEntryDetailScreen} />
      
      <Stack.Screen name="JournalDetails" component={require('../screens/JournalDetailsScreen').default} />
      <Stack.Screen name="GroupReports" component={require('../screens/GroupReportsScreen').default} />
    </Stack.Navigator>
  );
}
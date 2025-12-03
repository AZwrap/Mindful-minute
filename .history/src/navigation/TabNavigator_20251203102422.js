import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSettings } from '../stores/settingsStore';

// 1. Import the new TabNavigator
import TabNavigator from './TabNavigator';

// Import standalone screens (Modals, Details, Onboarding)
import OnboardingScreen from '../screens/OnboardingScreen';
import WriteScreen from '../screens/WriteScreen';
import MoodTagScreen from '../screens/MoodTagScreen';
import EntryDetailScreen from '../screens/EntryDetailScreen';
import PremiumScreen from '../screens/PremiumScreen';
import WeeklyRecapScreen from '../screens/WeeklyRecapScreen';
import CustomPromptScreen from '../screens/CustomPromptScreen';
import FocusWriteScreen from '../screens/FocusWriteScreen';

// Shared Journal Screens
import InviteScreen from '../screens/InviteScreen';
import SharedWriteScreen from '../screens/SharedWriteScreen';
import SharedJournalScreen from '../screens/SharedJournalScreen';
import SharedEntryDetailScreen from '../screens/SharedEntryDetailScreen';

const Stack = createStackNavigator();

export default function RootStack() {
  const hasOnboarded = useSettings((s) => s.hasOnboarded);

  return (
    <Stack.Navigator
      initialRouteName={hasOnboarded ? "MainTabs" : "Onboarding"}
      // Default: Show headers globally (standard behavior)
      // We will hide them specifically for Tabs/Modals below
      screenOptions={{ headerShown: true }} 
    >
      {/* 1. ONBOARDING */}
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen} 
        options={{ headerShown: false }} 
      />

      {/* 2. MAIN APP (TABS) */}
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator} 
        options={{ headerShown: false }} // Hide stack header, let Tabs handle it
      />

      {/* 3. MODALS & STANDALONE SCREENS */}
      <Stack.Screen 
        name="Write" 
        component={WriteScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="FocusWrite" 
        component={FocusWriteScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="MoodTag" 
        component={MoodTagScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="CustomPrompt" 
        component={CustomPromptScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />
      <Stack.Screen 
        name="Premium" 
        component={PremiumScreen} 
        options={{ headerShown: false, presentation: 'modal' }} 
      />

      {/* Screens that keep the System Header */}
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="WeeklyRecap" component={WeeklyRecapScreen} options={{ title: 'Weekly Recap' }} />
      
      {/* Shared Journal Flow */}
      <Stack.Screen name="Invite" component={InviteScreen} options={{ title: 'Shared Journals' }} />
      <Stack.Screen name="SharedJournal" component={SharedJournalScreen} options={{ title: 'Shared Journal' }} />
      <Stack.Screen name="SharedEntryDetail" component={SharedEntryDetailScreen} options={{ title: '' }} />
      <Stack.Screen 
        name="SharedWrite" 
        component={SharedWriteScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}
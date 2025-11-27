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

const Stack = createNativeStackNavigator();

export default function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Write" component={WriteScreen} />
      <Stack.Screen name="FocusWrite" component={FocusWriteScreen} />
      <Stack.Screen name="MoodTag" component={MoodTagScreen} />
      <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
    </Stack.Navigator>
  );
}

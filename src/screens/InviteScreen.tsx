// src/screens/InviteScreen.tsx
import React, { useState, useRef , useEffect} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView, // <--- Added
  Platform,             // <--- Added
  ScrollView,           // <--- Added
  Keyboard,
} from "react-native";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useSharedPalette } from "../hooks/useSharedPalette";
import { useJournalStore } from "../stores/journalStore";
import { useUIStore } from "../stores/uiStore"; 
import { auth } from "../firebaseConfig";
import { createSharedJournal, joinSharedJournal } from "../services/syncedJournalService";
import * as Clipboard from 'expo-clipboard';

// --------------------------------------------------
// TYPES
// --------------------------------------------------
type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------
export default function InviteScreen({ navigation }: Props) {
  const palette = useSharedPalette();
  const { showAlert } = useUIStore();
  
  // 1. Initialize the Ref properly inside the component
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

// 2. Define the focus handler correctly
  const handleFocus = () => {
    // Increased delay to ensure keyboard is fully open (especially on Android) before scrolling
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 100 : 400); 
  };

const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      if (!auth.currentUser) throw new Error("Not logged in");
      const id = await createSharedJournal(name, auth.currentUser.uid);
      navigation.goBack();
      showAlert("Success", `Journal created! ID: ${id}`);
} catch (e) {
      console.error("Create Journal Error:", e);
      showAlert("Error", "Failed to create journal.");
    } finally {
      setIsCreating(false);
    }
  };

const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      if (!auth.currentUser) throw new Error("Not logged in");
      await joinSharedJournal(joinCode.trim(), auth.currentUser.uid);
      navigation.goBack();
      showAlert("Success", "Joined journal!");
} catch (e: any) {
      console.error("Join Journal Error:", e);
      showAlert("Error", e.message || "Failed to join journal.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView 
          ref={scrollRef} // <--- Assigned here
          contentContainerStyle={{ 
            flexGrow: 1, 
            padding: 24, 
            justifyContent: 'center',
            backgroundColor: palette.bg 
          }} 
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: palette.text }]}>Shared Journals</Text>

          {/* CREATE SECTION */}
          <Text style={[styles.sectionLabel, { color: palette.subtleText }]}>Create New</Text>
          <TextInput
            placeholder="Journal Name"
            placeholderTextColor={palette.subtleText}
            style={[
              styles.input,
              { backgroundColor: palette.card, color: palette.text, borderColor: palette.border },
            ]}
            value={name}
            onChangeText={setName}
          />
          <Pressable 
            onPress={handleCreate} 
            disabled={isCreating}
            style={[styles.button, { backgroundColor: palette.accent }]}
          >
            <Text style={styles.buttonText}>
              {isCreating ? "Creating..." : "Create Journal"}
            </Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* JOIN SECTION */}
          <Text style={[styles.sectionLabel, { color: palette.subtleText }]}>Join Existing</Text>
          <TextInput
            placeholder="Enter Journal ID / Code"
            placeholderTextColor={palette.subtleText}
            style={[
              styles.input,
              { backgroundColor: palette.card, color: palette.text, borderColor: palette.border },
            ]}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="none"
            onFocus={handleFocus} // <--- Calls the handler defined above
          />

          <Pressable 
            onPress={handleJoin} 
            disabled={isJoining}
            style={[styles.button, { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border }]}
          >
            <Text style={[styles.buttonText, { color: palette.text }]}>
              {isJoining ? "Joining..." : "Join Journal"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 32,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  codeBox: {
    marginTop: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 32,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
// src/screens/InviteScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  // Alert, // <--- Removed Native Alert
} from "react-native";
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useSharedPalette } from "../hooks/useSharedPalette";
import { useJournalStore } from "../stores/journalStore";
import { useUIStore } from "../stores/uiStore"; // <--- Added UI Store
import { auth } from "../firebaseConfig";
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
  const { showAlert } = useUIStore(); // <--- Hook for Global Alert

  const createJournal = useJournalStore((s) => s.createJournal);
  const joinJournal = useJournalStore((s) => s.joinJournal);

  const [journalName, setJournalName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreate = async () => {
    if (!journalName.trim()) {
      // Changed title to "Error" and used showAlert
      showAlert("Error", "Please enter a name for your shared journal.");
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      showAlert("Error", "You must be logged in to create a shared journal.");
      return;
    }

    setIsCreating(true);
    try {
      const ownerName = user.displayName || user.email?.split('@')[0] || "Anonymous";
      
      const newId = await createJournal(journalName, ownerName);
      setGeneratedCode(newId);
      showAlert("Success", "Journal created! Share the code below with your partner.");
    } catch (error) {
      showAlert("Error", "Failed to create journal.");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      showAlert("Error", "You must be logged in to join a journal.");
      return;
    }

    setIsJoining(true);
    try {
      const memberName = user.displayName || user.email?.split('@')[0] || "Member";
      await joinJournal(joinCode.trim(), memberName);
      
      showAlert("Welcome!", "You have joined the journal.");
      // Navigate to the list or specific journal
      navigation.navigate('JournalList'); 
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to join journal.");
    } finally {
      setIsJoining(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedCode) {
      await Clipboard.setStringAsync(generatedCode);
      showAlert("Copied", "Invite code copied to clipboard!");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.bg }]}>
      <Text style={[styles.title, { color: palette.text }]}>Shared Journals</Text>

      {/* CREATE SECTION */}
      <Text style={[styles.sectionLabel, { color: palette.subtleText }]}>Create New</Text>
      <TextInput
        placeholder="Journal Name (e.g. Family Trip)"
        placeholderTextColor={palette.subtleText}
        style={[
          styles.input,
          { backgroundColor: palette.card, color: palette.text, borderColor: palette.border },
        ]}
        value={journalName}
        onChangeText={setJournalName}
      />

      <Pressable 
        onPress={handleCreate} 
        disabled={isCreating}
        style={[styles.button, { backgroundColor: palette.accent, opacity: isCreating ? 0.7 : 1 }]}
      >
        <Text style={styles.buttonText}>
          {isCreating ? "Creating..." : "Create Shared Journal"}
        </Text>
      </Pressable>

      {generatedCode && (
        <Pressable onPress={copyToClipboard} style={[styles.codeBox, { borderColor: palette.accent, backgroundColor: palette.card }]}>
          <Text style={[styles.codeLabel, { color: palette.sub }]}>Tap to Copy Invite Code:</Text>
          <Text style={[styles.codeText, { color: palette.accent }]}>{generatedCode}</Text>
        </Pressable>
      )}

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
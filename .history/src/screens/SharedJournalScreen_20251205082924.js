import React, { useLayoutEffect, useEffect, useState } from "react"; 
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient'; // <--- Added
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // <--- NEW IMPORT
import { useNavigation, useRoute } from "@react-navigation/native";
import { useJournalStore } from "../stores/journalStore";
import { leaveSharedJournal } from "../services/syncedJournalService";
import { useSharedPalette } from "../hooks/useSharedPalette";
import ThemeFadeWrapper from "../components/ThemeFadeWrapper";
import ScreenLoader from "../components/ScreenLoader";

export default function SharedJournalScreen() {
const navigation = useNavigation();
  const route = useRoute();
  const palette = useSharedPalette();
  
  // 🟢 Theme & Gradient Setup (Matches WriteScreen)
  const { theme } = useTheme();
  const isDark = theme === 'dark'; // Simplified check

  const gradients = {
    dark: { primary: ['#0F172A', '#1E293B', '#334155'] },
    light: { primary: ['#F8FAFC', '#F1F5F9', '#E2E8F0'] },
  };
  const currentGradient = gradients[theme] || gradients.light;

  // Get the specific Journal ID passed from Home
  
  // Get the specific Journal ID passed from Home
  const { journalId } = route.params || {};

  const [showSettings, setShowSettings] = useState(false);

  // Helper to share the invite code
  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my Mindful Minute journal! Use code: ${currentJournal?.code}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  // Placeholder for leaving (Safety Check)
  const handleLeaveJournal = () => {
    Alert.alert(
      "Leave Journal",
      "Are you sure you want to leave? You will lose access to these entries.",
      [
        { text: "Cancel", style: "cancel" },
        { 
text: "Leave", 
          style: "destructive", 
          onPress: async () => {
            try {
              // Use the current user's ID (assuming you have a user ID stored, otherwise pass a dummy for now if using local-only)
              // For shared journals, you normally track a userId. 
              const userId = "current-user-id"; // TODO: Replace with actual auth ID from your auth store
              
              await leaveSharedJournal(journalId, userId);
              setShowSettings(false);
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", "Could not leave journal. Please try again.");
            }
          }
        }
      ]
    );
  };

  const { 
    sharedEntries, 
    journals, // <--- Need this to find the Invite Code
    createJournal, 
    subscribeToJournal,
    isLoading
  } = useJournalStore((s) => ({
    sharedEntries: s.sharedEntries,
    journals: s.journals,
    createJournal: s.createJournal,
    subscribeToJournal: s.subscribeToJournal,
    isLoading: s.isLoading,
  }));

  // Find the active journal object
  const currentJournal = journals.find(j => j.id === journalId);

  // STEP 1: Trigger Real-Time Sync on Mount
  useEffect(() => {
    if (journalId) {
      console.log("🔌 Subscribing to journal:", journalId);
      subscribeToJournal(journalId);
    }
  }, [journalId]);

  // Select entries ONLY for this journal ID
  const entries = sharedEntries[journalId] || [];

// 1. Set the Standard Navigation Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: currentJournal?.name || "Shared Journal",
      headerShown: true,
headerStyle: {
        backgroundColor: isDark ? '#0F172A' : '#F8FAFC', // Matches top of gradient
      },
      headerTintColor: palette.text,
      headerShadowVisible: false,
      // Settings Button
      headerRight: () => (
        <Pressable 
          onPress={() => setShowSettings(true)} 
          hitSlop={20}
          style={{ paddingRight: 16 }}
        >
          <Feather name="settings" size={24} color={palette.text} />
        </Pressable>
      ),
    });
  }, [navigation, palette, currentJournal]);

  // STEP 2: Show Loader
  if (isLoading && entries.length === 0) {
    return <ScreenLoader />;
  }

return (
    <ThemeFadeWrapper>
      {/* 🟢 Gradient Background */}
      <LinearGradient
        colors={currentGradient.primary}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <SafeAreaView 
          style={styles.container} 
          edges={['bottom', 'left', 'right']}
        >
        
        {/* LIST */}
        <FlatList
          data={entries}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("SharedEntryDetail", { entryId: item.id })
              }
              style={[
                styles.entryCard,
                { backgroundColor: palette.card, borderColor: palette.border },
              ]}
            >
              <Text style={[styles.entryTitle, { color: palette.text }]}>
                {item.title || "Untitled Entry"}
              </Text>

              <Text style={[styles.entryDate, { color: palette.subtleText }]}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Just now"}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.subtleText }]}>
              No entries yet. Write the first one!
            </Text>
          }
        />

        {/* CREATE NEW SHARED ENTRY BUTTON */}
<Pressable
          onPress={() => navigation.navigate("SharedWrite", { journalId })}
          style={[
            styles.createButton,
            { backgroundColor: palette.accent, shadowColor: palette.text },
          ]}
        >
          <Text style={styles.createButtonText}>Write New Entry</Text>
        </Pressable>

        {/* 🟢 Journal Settings Modal */}
        <Modal
          visible={showSettings}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSettings(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: palette.card }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>
                Journal Settings
              </Text>
              
              {/* Invite Code */}
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: palette.subtleText }]}>
                  Invite Code
                </Text>
                <Pressable 
                  onPress={handleShareCode} 
                  style={[styles.codeButton, { borderColor: palette.accent }]}
                >
                  <Text style={[styles.codeText, { color: palette.accent }]}>
                    {currentJournal?.code || 'LOADING...'}
                  </Text>
                  <Feather name="share" size={16} color={palette.accent} style={{ marginLeft: 8 }} />
                </Pressable>
              </View>

              {/* Members (Static for now) */}
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: palette.subtleText }]}>
                  Members
                </Text>
                <Text style={[styles.memberCount, { color: palette.text }]}>
                  {currentJournal?.members?.length || 1} active member(s)
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Actions */}
              <Pressable 
                onPress={handleLeaveJournal}
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              >
                <Text style={styles.actionButtonText}>Leave Journal</Text>
              </Pressable>

              <Pressable 
                onPress={() => setShowSettings(false)}
                style={[styles.actionButton, { backgroundColor: 'transparent', marginTop: 8 }]}
              >
                <Text style={[styles.actionButtonText, { color: palette.subtleText }]}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  </ThemeFadeWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor removed to let Gradient show
  },
  entryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  entryDate: {
    marginTop: 6,
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  createButton: {
    margin: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  // 🟢 Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(99,102,241,0.05)',
  },
  codeText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  memberCount: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.1)',
    marginVertical: 16,
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Trash2, Edit2 } from 'lucide-react-native';
import { useJournalStore } from '../stores/journalStore'; // Store access
import { auth } from '../firebaseConfig'; // Auth for permission check
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useSharedPalette } from '../hooks/useSharedPalette';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedEntryDetail'>;

export default function SharedEntryDetailScreen({ navigation, route }: Props) {
  const { entry } = route.params;
  const palette = useSharedPalette();
  const deleteSharedEntry = useJournalStore(s => s.deleteSharedEntry);

  // Check ownership
  const currentUser = auth.currentUser;
  const isAuthor = currentUser?.uid && entry.userId === currentUser.uid;

  const handleDelete = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              // Ensure we have the Journal ID. 
              // If it's not on the entry object, we might need to pass it from the previous screen.
              // For now, we assume entry contains journalId or we use the store's current.
              const journalId = entry.journalId || useJournalStore.getState().currentJournalId;
              
              if (journalId && entry.entryId) {
                await deleteSharedEntry(journalId, entry.entryId);
                navigation.goBack();
              }
            } catch (e) {
              Alert.alert("Error", "Could not delete entry.");
            }
          }
        }
      ]
    );
  };

  // Handle various date formats safely
  const dateStr = React.useMemo(() => {
    if (!entry.createdAt) return 'Unknown Date';
    if (typeof entry.createdAt?.toDate === 'function') {
      return entry.createdAt.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }
    return new Date(entry.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }, [entry.createdAt]);

  return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
           <PremiumPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
             <Text style={{ color: palette.accent, fontWeight: '600' }}>Back</Text>
           </PremiumPressable>

{/* ACTIONS (Author Only) */}
           {isAuthor && (
             <View style={{ flexDirection: 'row', gap: 12 }}>
               <PremiumPressable 
                 onPress={() => navigation.navigate('SharedWrite', { journalId: entry.journalId || 'default', entry })}
                 style={styles.actionBtn}
               >
                 <Edit2 size={20} color={palette.text} />
               </PremiumPressable>
               
               <PremiumPressable onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                 <Trash2 size={20} color="#EF4444" />
               </PremiumPressable>
             </View>
           )}
        </View>
        
        <ScrollView contentContainerStyle={styles.content}>
           <Text style={[styles.date, { color: palette.subtleText }]}>
             {dateStr}
           </Text>
           <Text style={[styles.author, { color: palette.accent }]}>
             Written by {entry.authorName || 'Anonymous'}
           </Text>
           <Text style={[styles.text, { color: palette.text }]}>
             {entry.text}
           </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  backBtn: { padding: 8 },
actionBtn: { 
    padding: 8, 
    backgroundColor: 'rgba(0,0,0,0.05)', 
    borderRadius: 8 
  },
  content: { padding: 24 },
  date: { fontSize: 14, marginBottom: 4 },
  author: { fontSize: 16, fontWeight: '700', marginBottom: 24 },
  text: { fontSize: 18, lineHeight: 28 },
});
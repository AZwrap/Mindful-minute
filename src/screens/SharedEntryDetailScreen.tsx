import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Trash2, Edit2, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { auth } from '../firebaseConfig';
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
              // Fallback to store's current ID if missing on entry object
              const journalId = entry.journalId || useJournalStore.getState().currentJournalId;
              
              if (journalId && entry.entryId) {
                await deleteSharedEntry(journalId, entry.entryId);
                navigation.goBack();
              } else {
                Alert.alert("Error", "Could not identify journal.");
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
    // Handle Firestore Timestamp
    if (typeof entry.createdAt?.toDate === 'function') {
      return entry.createdAt.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    }
    // Handle Number/String
    return new Date(entry.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }, [entry.createdAt]);

  return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* HEADER */}
        <View style={styles.header}>
           <PremiumPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
             <ChevronLeft size={24} color={palette.text} />
             <Text style={{ color: palette.text, fontWeight: '600', fontSize: 16 }}>Back</Text>
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

           {entry.imageUri && (
             <Image 
               source={{ uri: entry.imageUri }} 
               style={styles.image} 
               resizeMode="cover" 
             />
           )}

           <Text style={[styles.text, { color: palette.text }]}>
             {entry.text}
           </Text>
           
           <View style={{ height: 40 }} />
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
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4,
    padding: 4 
  },
  actionBtn: { 
    padding: 8, 
    backgroundColor: 'rgba(0,0,0,0.05)', 
    borderRadius: 8 
  },
  content: { padding: 24 },
  date: { fontSize: 14, marginBottom: 4 },
  author: { fontSize: 16, fontWeight: '700', marginBottom: 24 },
  text: { fontSize: 18, lineHeight: 28 },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 24,
  },
});
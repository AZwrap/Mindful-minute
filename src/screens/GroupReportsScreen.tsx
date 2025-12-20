import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, AlertTriangle } from 'lucide-react-native';
import PremiumPressable from '../components/PremiumPressable';
import { useUIStore } from '../stores/uiStore';
import { useJournalStore } from '../stores/journalStore';
import { JournalService } from '../services/journalService';
import GlobalAlert from '../components/GlobalAlert';

export default function GroupReportsScreen({ navigation, route }: any) {
  const { journalId } = route.params;
  const palette = useSharedPalette();
  const { showAlert } = useUIStore();
  const { deleteSharedEntry } = useJournalStore();
  
  const [reports, setReports] = useState<any[]>([]);

// Live Listen to Reports Subcollection (Grouped by Content)
  useEffect(() => {
    const q = query(collection(db, "journals", journalId, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const grouped: Record<string, any> = {};

      snap.docs.forEach((doc) => {
        const data = doc.data();
        const cid = data.contentId;

        // Initialize group if new
        if (!grouped[cid]) {
          grouped[cid] = {
            contentId: cid,
            entryId: data.entryId, // Ensure we have entryId for deletions
            type: data.type,
            textSnippet: data.textSnippet,
            latestAt: data.createdAt,
            reasons: new Set(), // Track unique reasons
            reportIds: [] // Track all report IDs for this content
          };
        }

        grouped[cid].reportIds.push(doc.id);
        grouped[cid].reasons.add(data.reason);
      });

      // Convert back to array for FlatList
      const results = Object.values(grouped).map(g => ({
        ...g,
        reason: Array.from(g.reasons).join(", "), // "spam, abusive"
        count: g.reportIds.length,
        id: g.reportIds[0] // Key for React List
      }));

      setReports(results);
    });
    return () => unsub();
  }, [journalId]);

// Batch delete all reports associated with this content
  const handleDismiss = async (reportIds: string[]) => {
    try {
      const batch = writeBatch(db);
      reportIds.forEach((id) => {
        const ref = doc(db, "journals", journalId, "reports", id);
        batch.delete(ref);
      });
      await batch.commit();
    } catch (e: any) {
      console.error("Delete Report Error:", e);
      showAlert("Delete Failed", "Could not dismiss reports.");
    }
  };

  const handleTakeAction = (item: any) => {
    showAlert(
      "Review Content",
      `Reported by ${item.count} user(s)\nReason: ${item.reason}\n\n"${item.textSnippet}"`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Content", 
          style: "destructive", 
          onPress: async () => {
            try {
              // 1. Delete the actual content (Entry or Comment)
              if (item.type === 'entry') {
                await deleteSharedEntry(journalId, item.contentId);
              } else {
                // For comments, we need the parent entryId, which we captured in grouping
                await JournalService.deleteComment(journalId, item.entryId, { id: item.contentId });
              }
              // 2. Clean up ALL reports for this item
              await handleDismiss(item.reportIds);
              showAlert("Success", "Content removed and reports resolved.");
            } catch (e) {
              console.log(e);
              showAlert("Error", "Content may already be deleted.");
              // Clean up reports anyway
              handleDismiss(item.reportIds);
            }
          }
        },
        { text: "Dismiss All", onPress: () => handleDismiss(item.reportIds) }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <PremiumPressable onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <ChevronLeft size={24} color={palette.text} />
          </PremiumPressable>
          <Text style={[styles.title, { color: palette.text }]}>Moderation Queue</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: palette.sub, fontSize: 16 }}>All good! No reports.</Text>
            </View>
          }
renderItem={({ item }) => (
            <PremiumPressable 
              onPress={() => handleTakeAction(item)}
              style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                   <AlertTriangle size={16} color="#F59E0B" />
                   <Text style={[styles.type, { color: palette.accent }]}>{item.type.toUpperCase()}</Text>
                </View>
                
                {/* URGENCY BADGE */}
                {item.count > 1 && (
                  <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>{item.count} REPORTS</Text>
                  </View>
                )}
              </View>
              
              <Text style={{ color: palette.sub, fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                 Last reported: {new Date(item.latestAt).toLocaleDateString()}
              </Text>
              
              <Text style={[styles.reason, { color: palette.text }]}>Reason: {item.reason}</Text>
              <Text numberOfLines={2} style={[styles.snippet, { color: palette.sub }]}>"{item.textSnippet}"</Text>
              
              <Text style={{ color: palette.accent, fontWeight: '700', marginTop: 8, fontSize: 12 }}>Tap to Review</Text>
            </PremiumPressable>
          )}
        />
      </SafeAreaView>
      <GlobalAlert />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  type: { fontSize: 12, fontWeight: '800' },
  reason: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  snippet: { fontSize: 14, fontStyle: 'italic' },
});
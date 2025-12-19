import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
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

  // Live Listen to Reports Subcollection
  useEffect(() => {
    const q = query(collection(db, "journals", journalId, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(data);
    });
    return () => unsub();
  }, [journalId]);

const handleDismiss = async (reportId: string) => {
    try {
      console.log(`Attempting to delete report: journals/${journalId}/reports/${reportId}`);
      await deleteDoc(doc(db, "journals", journalId, "reports", reportId));
      console.log("Delete success!");
    } catch (e: any) {
      console.error("Delete Report Error:", e);
      // Show the actual error message to help debug
      showAlert("Delete Failed", e.message || "Could not dismiss report.");
    }
  };

  const handleTakeAction = (report: any) => {
    showAlert(
      "Review Content",
      `Reported for: ${report.reason}\n\n"${report.textSnippet}"`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Content", 
          style: "destructive", 
          onPress: async () => {
            try {
              // 1. Delete the actual content
              if (report.type === 'entry') {
                await deleteSharedEntry(journalId, report.contentId);
              } else {
                await JournalService.deleteComment(journalId, report.entryId, { id: report.contentId });
              }
              // 2. Delete the report
              await deleteDoc(doc(db, "journals", journalId, "reports", report.id));
              showAlert("Success", "Content removed.");
            } catch (e) {
              console.log(e);
              showAlert("Error", "Content may already be deleted.");
              // Delete report anyway if content is gone
              handleDismiss(report.id);
            }
          }
        },
        { text: "Dismiss Report", onPress: () => handleDismiss(report.id) }
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
              <View style={styles.row}>
                <AlertTriangle size={16} color="#F59E0B" />
                <Text style={[styles.type, { color: palette.accent }]}>{item.type.toUpperCase()}</Text>
                <Text style={{ color: palette.sub, fontSize: 12 }}>• {new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              
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
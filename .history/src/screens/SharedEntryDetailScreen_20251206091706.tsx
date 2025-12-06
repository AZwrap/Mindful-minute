import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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

  // Handle various date formats safely
  const dateStr = typeof entry.createdAt?.toDate === 'function' 
    ? entry.createdAt.toDate().toLocaleString() 
    : new Date(entry.createdAt).toLocaleString();

  return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
           <PremiumPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
             <Text style={{ color: palette.accent, fontWeight: '600' }}>Back</Text>
           </PremiumPressable>
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
  header: { padding: 16 },
  backBtn: { padding: 8 },
  content: { padding: 24 },
  date: { fontSize: 14, marginBottom: 4 },
  author: { fontSize: 16, fontWeight: '700', marginBottom: 24 },
  text: { fontSize: 18, lineHeight: 28 },
});
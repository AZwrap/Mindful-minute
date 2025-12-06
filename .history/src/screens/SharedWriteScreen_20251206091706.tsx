import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedWrite'>;

export default function SharedWriteScreen({ navigation, route }: Props) {
  const { journalId } = route.params;
  const [text, setText] = useState('');
  const palette = useSharedPalette();
  const addSharedEntry = useJournalStore(s => s.addSharedEntry);
  
// Use the ID as fallback if no name system is set up yet
  const { currentUser } = useJournalStore();

  const handlePost = async () => {
    if (!text.trim()) return;
    
    // We don't send createdAt here; the store/service handles consistency
    await addSharedEntry({
      text,
      authorName: currentUser || 'Anonymous Member', 
      journalId
    });

    navigation.goBack();
  };

  return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.header}>
            <PremiumPressable onPress={() => navigation.goBack()}>
                <Text style={{ color: palette.subtleText, fontWeight: '600' }}>Cancel</Text>
            </PremiumPressable>
            <PremiumPressable onPress={handlePost} style={[styles.postBtn, { backgroundColor: palette.accent }]}>
                <Text style={styles.postText}>Post</Text>
            </PremiumPressable>
          </View>
          
          <TextInput
            style={[styles.input, { color: palette.text }]}
            placeholder="Write something for the group..."
            placeholderTextColor={palette.subtleText}
            multiline
            value={text}
            onChangeText={setText}
            autoFocus
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  postBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  postText: { color: 'white', fontWeight: '700' },
  input: { flex: 1, padding: 20, fontSize: 18, lineHeight: 28, textAlignVertical: 'top' },
});
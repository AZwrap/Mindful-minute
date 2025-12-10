import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform, Alert, Image, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, XCircle } from 'lucide-react-native'; // Icons
import * as ImagePicker from 'expo-image-picker'; // Image Picker

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { auth } from '../firebaseConfig';
import { useSharedPalette } from '../hooks/useSharedPalette';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedWrite'>;

export default function SharedWriteScreen({ navigation, route }: Props) {
  const { journalId, entry } = route.params;
  const isEditing = !!entry;
  
  // State
  const [text, setText] = useState(entry?.text || '');
  const [imageUri, setImageUri] = useState<string | null>(entry?.imageUri || null);
  
  const palette = useSharedPalette();
  const { addSharedEntry, updateSharedEntry } = useJournalStore();
  
  // --- IMAGE LOGIC (Base64 for Alpha) ---
  const pickImage = () => {
    Alert.alert(
      "Add Photo",
      "Capture a moment or choose from your gallery.",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert("Permission Required", "Camera access is needed.");
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.3, 
                base64: true,
              });
              if (!result.canceled && result.assets[0].base64) {
                setImageUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
              }
            } catch (e) { Alert.alert("Error", "Could not open camera."); }
          }
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.3,
                base64: true,
              });
              if (!result.canceled && result.assets[0].base64) {
                setImageUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
              }
            } catch (e) { Alert.alert("Error", "Could not pick image."); }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handlePost = async () => {
    if (!text.trim() && !imageUri) return;

    try {
if (isEditing) {
      // UPDATE MODE
      await updateSharedEntry(journalId, entry.entryId, text.trim(), imageUri);
    } else {
        // CREATE
        const user = auth.currentUser;
        const authorName = user?.displayName || user?.email?.split('@')[0] || 'Anonymous';

        await addSharedEntry({
          text: text.trim(),
          imageUri, // Add Image
          authorName,
          userId: user?.uid,
          journalId,
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to post entry.");
    }
  };

  return (
    <LinearGradient colors={[palette.bg, palette.bg]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <PremiumPressable onPress={() => navigation.goBack()}>
                <Text style={{ color: palette.subtleText, fontWeight: '600' }}>Cancel</Text>
            </PremiumPressable>
            <PremiumPressable onPress={handlePost} style={[styles.postBtn, { backgroundColor: palette.accent }]}>
                <Text style={styles.postText}>{isEditing ? "Update" : "Post"}</Text>
            </PremiumPressable>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Write something for the group..."
              placeholderTextColor={palette.subtleText}
              multiline
              value={text}
              onChangeText={setText}
              autoFocus={!imageUri}
            />

            {/* IMAGE PREVIEW */}
            {imageUri && (
              <View style={{ marginTop: 20 }}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <Pressable onPress={() => setImageUri(null)} style={[styles.removeImageBtn, { backgroundColor: palette.bg }]}>
                  <XCircle size={24} color="#EF4444" />
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* TOOLBAR */}
          <View style={[styles.toolbar, { borderTopColor: palette.border }]}>
            <PremiumPressable onPress={pickImage} style={[styles.mediaBtn, { backgroundColor: palette.card }]}>
              <Camera size={20} color={palette.accent} />
              <Text style={{ color: palette.accent, fontWeight: '600' }}>Add Photo</Text>
            </PremiumPressable>
          </View>

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
  toolbar: { padding: 12, borderTopWidth: 1 },
  mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, alignSelf: 'flex-start' },
  previewImage: { width: '100%', height: 250, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, borderRadius: 12 },
});
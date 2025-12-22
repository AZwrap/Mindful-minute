import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUIStore } from '../stores/uiStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, XCircle } from 'lucide-react-native'; // Icons
import * as ImagePicker from 'expo-image-picker'; // Image Picker
import * as FileSystem from 'expo-file-system/legacy';

import { RootStackParamList } from '../navigation/RootStack';
import { useJournalStore } from '../stores/journalStore';
import { auth } from '../firebaseConfig';
import { useEntriesStore } from '../stores/entriesStore';

import { useSettings } from '../stores/settingsStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import { Lock } from 'lucide-react-native';
import { sendImmediateNotification } from '../lib/notifications';
import { moderateContent, moderateImage, moderateAudio } from '../lib/moderation';
import AudioRecorder from '../components/AudioRecorder';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedWrite'>;

export default function SharedWriteScreen({ navigation, route }: Props) {
  const { journalId, entry } = route.params;
  const { showAlert } = useUIStore();
  const isEditing = !!entry;
  
// SAFEGUARD: Handle corrupted 'text' objects from database
  const rawText = typeof entry?.text === 'object' ? (entry.text?.text || '') : (entry?.text || '');
  const rawImage = entry?.imageUri || (typeof entry?.text === 'object' ? entry.text?.imageUri : null);

  // State
  const [text, setText] = useState(rawText);
  const [imageUri, setImageUri] = useState<string | null>(rawImage);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
const palette = useSharedPalette();
  const { addSharedEntry, updateSharedEntry } = useJournalStore();

  // --- QUOTA SETTINGS ---
  const { 
    isPremium, 
    freeImageCount, 
    freeAudioCount, 
    incrementImageCount, 
    incrementAudioCount 
  } = useSettings();
  const IMAGE_LIMIT = 5;
  const AUDIO_LIMIT = 5;
  
  // --- IMAGE LOGIC (Base64 for Alpha) ---
const pickImage = () => {
    // 1. CHECK QUOTA
    if (!isPremium && freeImageCount >= IMAGE_LIMIT) {
        showAlert("Premium Limit Reached", `You have used ${IMAGE_LIMIT}/${IMAGE_LIMIT} free photos. Upgrade to Premium to share unlimited moments!`);
        return;
    }

    showAlert(
      "Add Photo",
      "Capture a moment or choose from your gallery.",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                showAlert("Permission Required", "Camera access is needed.");
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // <--- Disabled cropping
                quality: 0.3, 
                base64: true,
              });
              if (!result.canceled && result.assets[0].base64) {
                setImageUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
              }
            } catch (e) { showAlert("Error", "Could not open camera."); }
          }
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false, // <--- Disabled cropping
                quality: 0.3,
                base64: true,
              });
              if (!result.canceled && result.assets[0].base64) {
                setImageUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
              }
            } catch (e) { showAlert("Error", "Could not pick image."); }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

const handlePost = async () => {
      // Check if we have *something* to post
    if ((!text.trim() && !imageUri && !audioUri) || isSubmitting) return;

    setIsSubmitting(true);

    // --- A. MODERATION ---
    // 1. Check Text
    const isTextSafe = await moderateContent(text);
    if (!isTextSafe) { setIsSubmitting(false); return; }

    // 2. Check Image
    if (imageUri) {
        const isImageSafe = await moderateImage(imageUri);
        if (!isImageSafe) { setIsSubmitting(false); return; }
    }

    // 3. Check Audio
    if (audioUri) {
        const { safe } = await moderateAudio(audioUri);
        if (!safe) { setIsSubmitting(false); return; }
    }
    // ---------------------

    // --- B. PREPARE DATA ---
    // Convert Audio to Base64 (so it can be saved in Firestore)
    let finalAudio = null;
// Only convert if it's a new recording (starts with file://)
    if (audioUri && audioUri.startsWith('file://')) {
        try {
            // FIX: Use 'base64' string directly
            const base64 = await FileSystem.readAsStringAsync(audioUri, { encoding: 'base64' });
            finalAudio = `data:audio/m4a;base64,${base64}`;
        } catch (e) {
            console.error("Audio conversion failed:", e);
        }
    }

    // 2. Optimistic Navigation
    navigation.goBack();

    try {
      const user = auth.currentUser;
      const authorName = user?.displayName || 'Anonymous';

      const entryData = {
          text: text.trim(),
          imageUri: imageUri, // Already Base64 from picker
          audioUri: finalAudio, // <--- SAVING AUDIO HERE
          authorName,
          userId: user?.uid,
          journalId,
      };

if (isEditing) {
        await updateSharedEntry(journalId, entry.entryId, entryData);
      } else {
        await addSharedEntry(entryData);
        
        // --- INCREMENT QUOTA (New Posts Only) ---
        if (imageUri) incrementImageCount();
        if (finalAudio) incrementAudioCount();
      }
      
    } catch (e) {
      console.error("Post failed:", e);
      sendImmediateNotification("Post Failed", "Could not save entry.");
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
            <PremiumPressable 
              onPress={handlePost} 
              disabled={isSubmitting}
              style={[styles.postBtn, { backgroundColor: palette.accent, opacity: isSubmitting ? 0.7 : 1 }]}
            >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.postText}>{isEditing ? "Update" : "Post"}</Text>
                )}
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

{/* 3. AUDIO PREVIEW OR LOCKED STATE */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16, marginTop: 16 }}>
              {(!isPremium && freeAudioCount >= AUDIO_LIMIT && !audioUri) ? (
                 <PremiumPressable 
                    onPress={() => showAlert("Premium Limit Reached", `You have used ${AUDIO_LIMIT}/${AUDIO_LIMIT} free voice notes. Upgrade to Premium to record more!`)}
                    style={{ 
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 16, borderRadius: 12, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border 
                    }}
                 >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={20} color="#EF4444" />
                    </View>
                    <View>
                        <Text style={{ color: palette.text, fontWeight: '600' }}>Voice Notes Locked</Text>
                        <Text style={{ color: palette.subtleText, fontSize: 12 }}>Free limit reached ({AUDIO_LIMIT}/{AUDIO_LIMIT})</Text>
                    </View>
                 </PremiumPressable>
              ) : (
                <AudioRecorder 
                  onRecordingComplete={setAudioUri} 
                  existingUri={audioUri}
                />
              )}
            </View>
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
  postBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, minWidth: 70, alignItems: 'center', justifyContent: 'center' },
  postText: { color: 'white', fontWeight: '700' },
  input: { flex: 1, padding: 20, fontSize: 18, lineHeight: 28, textAlignVertical: 'top' },
  toolbar: { padding: 12, borderTopWidth: 1 },
  mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, alignSelf: 'flex-start' },
  previewImage: { width: '100%', height: 250, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, borderRadius: 12 },
});
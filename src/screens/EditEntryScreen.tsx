import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, KeyboardAvoidingView, Platform, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useUIStore } from '../stores/uiStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, XCircle } from 'lucide-react-native'; 
import * as ImagePicker from 'expo-image-picker'; 

import { RootStackParamList } from '../navigation/RootStack';
import { useEntriesStore } from '../stores/entriesStore';
import { useSharedPalette } from '../hooks/useSharedPalette';
import PremiumPressable from '../components/PremiumPressable';

type Props = NativeStackScreenProps<RootStackParamList, any>;

export default function EditEntryScreen({ navigation, route }: Props) {
  const { date } = route.params as any;
  const { showAlert } = useUIStore();
  const palette = useSharedPalette();
  
  // Get existing local entry
  const entry = useEntriesStore(s => s.entries[date]);
  const upsert = useEntriesStore(s => s.upsert);

  // Initialize state
  const [text, setText] = useState(entry?.text || '');
  const [imageUri, setImageUri] = useState<string | null>(entry?.imageUri || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const pickImage = () => {
    showAlert(
      "Update Photo",
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
                allowsEditing: false, 
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
                allowsEditing: false, 
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

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Update Local Store (This will trigger the auto-sync in EntryDetailScreen)
      upsert({
        ...entry,
        date,
        text: text.trim(),
        imageUri: imageUri
      });
      
      navigation.goBack();
    } catch (e) {
      console.error("Failed to save entry:", e);
      setIsSubmitting(false);
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
            <Text style={{ fontWeight: '700', fontSize: 16, color: palette.text }}>Edit Entry</Text>
            <PremiumPressable 
              onPress={handleSave} 
              disabled={isSubmitting}
              style={[styles.saveBtn, { backgroundColor: palette.accent, opacity: isSubmitting ? 0.7 : 1 }]}
            >
                {isSubmitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
            </PremiumPressable>
          </View>
          
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="What's on your mind?"
              placeholderTextColor={palette.subtleText}
              multiline
              value={text}
              onChangeText={setText}
              autoFocus={false}
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
              <Text style={{ color: palette.accent, fontWeight: '600' }}>{imageUri ? "Change Photo" : "Add Photo"}</Text>
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
  saveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, minWidth: 70, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: 'white', fontWeight: '700' },
  input: { flex: 1, padding: 10, fontSize: 18, lineHeight: 28, textAlignVertical: 'top' },
  toolbar: { padding: 12, borderTopWidth: 1 },
  mediaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, alignSelf: 'flex-start' },
  previewImage: { width: '100%', height: 250, borderRadius: 12 },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, borderRadius: 12 },
});
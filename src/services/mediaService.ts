import * as FileSystem from 'expo-file-system/legacy';

export const MediaService = {
  async uploadImage(uri: string): Promise<string | null> {
    if (!uri) return null;
    
    // If it's already a remote URL, return it
    if (uri.startsWith('http')) return uri;

    try {
      // Strategy: Convert image to Base64 string to store directly in Firestore.
      // This bypasses the need for Firebase Storage configuration or rules.
const base64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: 'base64'
      });
      
      // Return the data URI that <Image /> can render
      return `data:image/jpeg;base64,${base64}`;

    } catch (error) {
      console.error("Image Conversion Failed:", error);
      throw error;
    }
  }
};
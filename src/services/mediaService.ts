import * as FileSystem from 'expo-file-system/legacy';

export const MediaService = {
  async uploadImage(uri: string): Promise<string | null> {
    if (!uri) return null;
    
    // If it's already a remote URL or existing Base64, return it
    if (uri.startsWith('http') || uri.startsWith('data:')) return uri;

try {
      console.log("Converting image to Base64...");
      // Strategy: Convert image to Base64 string to store directly in Firestore.
      // FIX: Use string 'base64' to avoid undefined Enum error
      const base64 = await FileSystem.readAsStringAsync(uri, { 
        encoding: 'base64'
      });
      
      // Return the data URI that <Image /> can render
      // This string is what gets saved to Firestore
      return `data:image/jpeg;base64,${base64}`;

    } catch (error) {
      console.error("Image Conversion Failed:", error);
      throw new Error("Failed to process image for upload.");
    }
  }
};
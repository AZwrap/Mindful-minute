import { storage, auth } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const MediaService = {
  async uploadImage(uri: string): Promise<string | null> {
    if (!uri) return null;
    
    // If it's already a remote URL, return it
    if (uri.startsWith('http')) return uri;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      // 1. Fetch the file logic for React Native
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2. Create Reference
      const filename = uri.split('/').pop() || `image-${Date.now()}`;
      const storageRef = ref(storage, `users/${user.uid}/journal_images/${filename}`);

      // 3. Upload
      await uploadBytes(storageRef, blob);

      // 4. Get URL
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;

    } catch (error) {
      console.error("Image Upload Failed:", error);
      throw error;
    }
  }
};
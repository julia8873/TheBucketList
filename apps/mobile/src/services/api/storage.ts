import { supabase } from '../supabase';
import { uriToBlob } from '@bucketlist/shared';

export const storageApi = {
  uploadPhoto: async (
    userId: string,
    bucketId: string,
    photoUri: string,
    thumbUri: string,
    onProgress?: (progress: number) => void
  ) => {
    try {
      // 1. Convert URIs to Blobs
      const photoBlob = await uriToBlob(photoUri);
      const thumbBlob = await uriToBlob(thumbUri);

      // Paths
      const timestamp = Date.now();
      const basePath = `${userId}/${bucketId}/${timestamp}`;
      const photoPath = `${basePath}.jpg`;
      const thumbPath = `${basePath}_thumb.jpg`;

      // 2. Upload Thumbnail
      // Note: Supabase JS client doesn't support progress events for standard uploads yet,
      // but we can fake a two-step progress or use XMLHttpRequest manually.
      // For now, we'll just report 50% after thumb, 100% after photo.
      
      const { error: thumbError } = await supabase.storage
        .from('photos')
        .upload(thumbPath, thumbBlob, { contentType: 'image/webp' });

      if (thumbError) throw thumbError;
      onProgress?.(0.3);

      // 3. Upload Original
      const { error: photoError } = await supabase.storage
        .from('photos')
        .upload(photoPath, photoBlob, { contentType: 'image/jpeg' });

      if (photoError) throw photoError;
      onProgress?.(0.9);

      return { photoPath, thumbPath };
    } catch (e) {
      console.error('Storage upload failed', e);
      throw e;
    }
  },

  getPublicUrl: (path: string) => {
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  }
};

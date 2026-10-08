import * as FileSystem from 'expo-file-system';
import { supabase } from '../supabase';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodifica base64 a bytes sin depender de librerías externas. */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const e1 = B64.indexOf(clean.charAt(i));
    const e2 = B64.indexOf(clean.charAt(i + 1));
    const e3 = i + 2 < clean.length ? B64.indexOf(clean.charAt(i + 2)) : -1;
    const e4 = i + 3 < clean.length ? B64.indexOf(clean.charAt(i + 3)) : -1;
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (e3 !== -1) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (e4 !== -1) bytes[p++] = ((e3 & 3) << 6) | e4;
  }
  return bytes.buffer.slice(0, p);
}

/**
 * Lee un archivo local y lo devuelve como ArrayBuffer.
 * En React Native, subir un Blob creado con XMLHttpRequest a Supabase falla
 * con "Network request failed"; un ArrayBuffer funciona de forma fiable.
 */
async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(base64);
}

export const storageApi = {
  uploadPhoto: async (
    userId: string,
    bucketId: string,
    photoUri: string,
    thumbUri: string,
    onProgress?: (progress: number) => void
  ) => {
    try {
      // 1. Leer los archivos locales como ArrayBuffer
      const photoData = await uriToArrayBuffer(photoUri);
      const thumbData = await uriToArrayBuffer(thumbUri);

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
        .upload(thumbPath, thumbData, { contentType: 'image/webp' });

      if (thumbError) throw thumbError;
      onProgress?.(0.3);

      // 3. Upload Original
      const { error: photoError } = await supabase.storage
        .from('photos')
        .upload(photoPath, photoData, { contentType: 'image/jpeg' });

      if (photoError) throw photoError;
      onProgress?.(0.9);

      return { photoPath, thumbPath };
    } catch (e) {
      console.error('Storage upload failed', e);
      throw e;
    }
  },

  uploadSingle: async (path: string, uri: string, contentType: string = 'image/jpeg') => {
    const data = await uriToArrayBuffer(uri);
    const { error } = await supabase.storage
      .from('photos')
      .upload(path, data, { contentType, upsert: true });
    if (error) throw error;
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  },

  getPublicUrl: (path: string) => {
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  }
};
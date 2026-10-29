import { i18n } from '@bucketlist/shared';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { processBucketImage } from '@bucketlist/shared';
import { supabase } from '../supabase';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodifica base64 a bytes sin depender de librerías externas. */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
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
 * Lee un archivo local o URL y lo devuelve como ArrayBuffer.
 * En web o URLs remotas (blob:, http:, data:) se usa fetch o decodificación directa.
 */
async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('data:')) {
    const base64 = uri.replace(/^data:[^;]+;base64,/, '');
    return base64ToArrayBuffer(base64);
  }
  if (Platform.OS === 'web' || uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('blob:')) {
    const res = await fetch(uri);
    return await res.arrayBuffer();
  }
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
        .upload(thumbPath, thumbData, { contentType: 'image/webp', cacheControl: '31536000' });

      if (thumbError) throw thumbError;
      onProgress?.(0.3);

      // 3. Upload Original
      const { error: photoError } = await supabase.storage
        .from('photos')
        .upload(photoPath, photoData, { contentType: 'image/jpeg', cacheControl: '31536000' });

      if (photoError) throw photoError;
      onProgress?.(0.9);

      return { photoPath, thumbPath };
    } catch (e) {
      if (__DEV__) console.error('Storage upload failed', e);
      throw e;
    }
  },

  uploadSingle: async (path: string, uri: string, contentType: string = 'image/jpeg') => {
    const data = await uriToArrayBuffer(uri);
    const { error } = await supabase.storage
      .from('photos')
      .upload(path, data, { contentType, upsert: true, cacheControl: '31536000' });
    if (error) throw error;
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  },

  /**
   * Sube una portada a Storage y devuelve su URL pública. Acepta URIs locales (file://, content://),
   * URIs `data:` (imagen pegada del portapapeles) y URLs de internet (http://, https://).
   * Lanza error si falla: quien llama NUNCA debe guardar la URI original en la base de datos
   * (evita que URLs largas excedan buckets_cover_image_max_len y evita que imágenes sin optimizar
   * disparen el consumo de egress).
   */
  uploadCover: async (userId: string, uri: string): Promise<string> => {
    // Si ya es una URL de nuestro Supabase Storage, no hace falta re-subirla
    if (
      uri.includes('/storage/v1/object/public/photos/covers/') ||
      (uri.startsWith('covers/') && !uri.includes('://'))
    ) {
      return uri;
    }

    // EN WEB: No existe expo-file-system. Procesar o subir directamente como ArrayBuffer.
    if (Platform.OS === 'web') {
      try {
        const processed = await processBucketImage(uri);
        return await storageApi.uploadSingle(`covers/${userId}_${Date.now()}.jpg`, processed.original.uri);
      } catch {
        const data = await uriToArrayBuffer(uri);
        const path = `covers/${userId}_${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from('photos')
          .upload(path, data, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
        if (error) throw error;
        return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
      }
    }

    let source = uri;
    let tempPath: string | null = null;

    if (uri.startsWith('data:')) {
      const base64 = uri.replace(/^data:[^;]+;base64,/, '');
      tempPath = `${FileSystem.cacheDirectory}cover_tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      await FileSystem.writeAsStringAsync(tempPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      source = tempPath;
    } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
      tempPath = `${FileSystem.cacheDirectory}cover_net_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      try {
        const dl = await FileSystem.downloadAsync(uri, tempPath);
        if (dl.status === 200) {
          source = dl.uri;
        } else {
          throw new Error(`Download status: ${dl.status}`);
        }
      } catch {
        // Fallback: descargar mediante fetch y escribir base64
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(i18n.t('storage.download_error', { defaultValue: 'No se pudo descargar la imagen' }) + ` (${response.status})`);
        }
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.replace(/^data:[^;]+;base64,/, ''));
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        await FileSystem.writeAsStringAsync(tempPath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        source = tempPath;
      }
    }

    try {
      const processed = await processBucketImage(source);
      const path = `covers/${userId}_${Date.now()}.jpg`;
      return await storageApi.uploadSingle(path, processed.original.uri);
    } finally {
      if (tempPath) void FileSystem.deleteAsync(tempPath, { idempotent: true }).catch(() => undefined);
    }
  },

  getPublicUrl: (path: string) => {
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  }
};
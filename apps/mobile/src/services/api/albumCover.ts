import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../supabase';
import { base64ToArrayBuffer } from './storage';

/** ¿La ruta es un archivo local del dispositivo (file://, content://, ph://...) o data URI y no una URL de internet (https?://)? */
export function isLocalUri(uri?: string | null): boolean {
  if (!uri) return false;
  return !/^https?:\/\//i.test(uri);
}

/**
 * Redimensiona la imagen, la sube a Supabase Storage (bucket `photos`) y devuelve su URL pública.
 * Soporta URIs locales (file://, content://) y data URIs en base64 (data:image/...).
 */
export async function uploadAlbumCover(userId: string, localUri: string): Promise<string> {
  let fileToManipulate = localUri;
  let tempFilePath: string | null = null;

  try {
    if (localUri.startsWith('data:')) {
      const base64Data = localUri.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      tempFilePath = `${FileSystem.cacheDirectory}album_cover_temp_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      fileToManipulate = tempFilePath;
    }

    const result = await ImageManipulator.manipulateAsync(
      fileToManipulate,
      [{ resize: { width: 1080 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!result.base64) throw new Error('No se pudo procesar la imagen');

    // Decodificar base64 de forma segura sin depender de atob (que no existe en Hermes)
    const arrayBuffer = base64ToArrayBuffer(result.base64);
    const bytes = new Uint8Array(arrayBuffer);
    const path = `album-covers/${userId}_${Date.now()}.jpg`;

    const { error } = await supabase.storage
      .from('photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;

    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  } finally {
    if (tempFilePath) {
      void FileSystem.deleteAsync(tempFilePath, { idempotent: true }).catch(() => undefined);
    }
  }
}

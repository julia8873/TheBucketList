import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';

/** ¿La ruta es un archivo local del dispositivo (file://, content://, ph://...) y no una URL de internet? */
export function isLocalUri(uri?: string | null): boolean {
  return !!uri && !/^https?:\/\//i.test(uri);
}

/**
 * Redimensiona la imagen, la sube a Supabase Storage (bucket `photos`) y devuelve su URL pública.
 * Así la portada la ven TODOS los usuarios, no solo el dispositivo que la eligió.
 */
export async function uploadAlbumCover(userId: string, localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1080 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!result.base64) throw new Error('No se pudo procesar la imagen');

  // En React Native subir un Blob falla; un Uint8Array funciona de forma fiable.
  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
  const path = `album-covers/${userId}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;

  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

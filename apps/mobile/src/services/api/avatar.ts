import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';

/** Redimensiona a 512px, sube a Storage (bucket `photos`) y devuelve la URL pública. */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 512 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!result.base64) throw new Error('No se pudo procesar la imagen');

  // En React Native subir un Blob falla; un Uint8Array funciona de forma fiable.
  const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
  const path = `avatars/${userId}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, bytes, { contentType: 'image/jpeg' });
  if (error) throw error;

  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

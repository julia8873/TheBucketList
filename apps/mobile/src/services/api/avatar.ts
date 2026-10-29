import { i18n } from '@bucketlist/shared';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';
import { base64ToArrayBuffer } from './storage';

/** Redimensiona a 512px, sube a Storage (bucket `photos`) y devuelve la URL pública. */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 512 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!result.base64) throw new Error(i18n.t('storage.process_error', { defaultValue: 'No se pudo procesar la imagen' }));

  // Decodificar base64 de forma fiable sin depender de atob
  const arrayBuffer = base64ToArrayBuffer(result.base64);
  const bytes = new Uint8Array(arrayBuffer);
  const path = `avatars/${userId}_${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

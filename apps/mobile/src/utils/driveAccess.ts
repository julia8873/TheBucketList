import { i18n } from '@bucketlist/shared';
import { Linking } from 'react-native';
import { supabase } from '../services/supabase';
import { toast } from '@bucketlist/ui';

export interface OpenDriveLinkOptions {
  driveUrl: string | null | undefined;
  bucketId: string;
  bucketTitle: string;
  bucketOwnerId: string;
  currentUserId?: string | null;
  currentUserName?: string | null;
}

/**
 * Abre el enlace de Google Drive y registra una notificación al propietario de la tarea
 * informándole que un usuario ha accedido a su enlace de Google Drive.
 */
export async function openGoogleDriveLink({
  driveUrl,
  bucketId,
  bucketTitle,
  bucketOwnerId,
  currentUserId,
  currentUserName,
}: OpenDriveLinkOptions) {
  if (!driveUrl) return;

  let finalUrl = driveUrl.trim();
  if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
    finalUrl = `https://${finalUrl}`;
  }

  // Si alguien (otro usuario/colaborador) accede al enlace, notificar al creador de la tarea
  if (bucketOwnerId && currentUserId && currentUserId !== bucketOwnerId) {
    const actorName = currentUserName || 'Un colaborador';
    void supabase
      .from('notifications')
      .insert({
        recipient_id: bucketOwnerId,
        actor_id: currentUserId,
        bucket_id: bucketId,
        type: 'drive_access',
        content: `${actorName} ha accedido al enlace de Google Drive en tu tarea "${bucketTitle}".`,
        is_read: false,
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[DriveAccess] Error creating access notification:', error);
        }
      });
  }

  try {
    const canOpen = await Linking.canOpenURL(finalUrl);
    if (canOpen) {
      await Linking.openURL(finalUrl);
    } else {
      toast.error(i18n.t('google_drive_modal.err_open_link', { defaultValue: 'Cannot open this link' }));
    }
  } catch (err) {
    console.warn('[DriveAccess] Error opening URL:', err);
    toast.error(i18n.t('google_drive_modal.err_open', { defaultValue: 'Error al abrir Google Drive' }));
  }
}

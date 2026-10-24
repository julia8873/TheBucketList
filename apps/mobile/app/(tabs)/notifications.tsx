import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Pressable, Text, AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, useTheme, spacing, Avatar, Button, Icon, PageTitle, Skeleton, gold, toast, confirm } from '@bucketlist/ui';
import { Check, CheckCheck, Heart, MessageCircle, UserPlus, CheckCircle, Bell, Users, X, Folder, HardDrive, ShieldAlert } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../src/hooks/useNotifications';
import { useAuthStore } from '../../src/stores/auth.store';
import { usePullToRefresh } from '../../src/hooks/useAutoRefresh';
import { supabase } from '../../src/services/supabase';
import { bucketApi } from '../../src/services/api/bucket';
import { getNotificationRoute, getSpecificNotificationText } from '../../src/utils/notificationRouting';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  checkNotificationPermissionsAsync,
  requestNotificationPermissionsAsync,
  openAppNotificationSettings,
  registerForPushNotificationsAsync,
  type NotificationPermissionStatus,
} from '../../src/services/notifications';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { refreshing, onRefresh } = usePullToRefresh();
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  
  const { data: notifications, isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const [permStatus, setPermStatus] = useState<NotificationPermissionStatus | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPerms = async () => {
      const res = await checkNotificationPermissionsAsync();
      if (isMounted) setPermStatus(res);
    };
    fetchPerms();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchPerms();
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  const handleEnablePermissions = async () => {
    if (!permStatus?.granted && !permStatus?.canAskAgain) {
      confirm.show({
        title: 'Permisos desactivados',
        message: 'Las notificaciones están bloqueadas en los ajustes de tu teléfono. Pulsa "Abrir Ajustes" para activarlas.',
        confirmLabel: 'Abrir Ajustes',
        cancelLabel: 'Cancelar',
        onConfirm: openAppNotificationSettings,
      });
      return;
    }

    const res = await requestNotificationPermissionsAsync();
    setPermStatus(res);
    if (res.granted && user?.id) {
      await registerForPushNotificationsAsync(user.id);
      toast.success('¡Notificaciones activadas! Ahora recibirás avisos en tu móvil.');
    }
  };

  const handleCollaborationResponse = async (notification: any, accept: boolean) => {
    setRespondingId(notification.id);
    try {
      if (notification.type === 'collaboration_request') {
        await bucketApi.respondToCollaborationRequest(notification.bucket_id, notification.actor_id, accept);
        markAsRead.mutate(notification.id);
        void queryClient.invalidateQueries({ queryKey: ['buckets'] });
        void queryClient.invalidateQueries({ queryKey: ['bucketCollaborators', notification.bucket_id] });
        void queryClient.invalidateQueries({ queryKey: ['bucketDetail', notification.bucket_id] });
        if (accept && notification.bucket_id) {
          router.push(`/bucket/${notification.bucket_id}` as any);
        }
      } else if (notification.type === 'notification_request') {
        let query = supabase.from('entity_notification_subscribers').update({
          status: accept ? 'accepted' : 'declined',
          updated_at: new Date().toISOString(),
        });
        if (notification.bucket_id) {
          query = query.eq('bucket_id', notification.bucket_id);
        } else if (notification.album_id) {
          query = query.eq('album_id', notification.album_id);
        }
        query = query.eq('requester_id', notification.actor_id);
        await query;

        markAsRead.mutate(notification.id);
        void queryClient.invalidateQueries({ queryKey: ['entity_subscription'] });
        void queryClient.invalidateQueries({ queryKey: ['entity_subscribers'] });
        if (accept) {
          if (notification.bucket_id) {
            router.push(`/bucket/${notification.bucket_id}` as any);
          } else if (notification.album_id) {
            router.push(`/album/${notification.album_id}` as any);
          }
        }
      } else if (notification.type === 'album_invite') {
        if (accept) {
          await supabase
            .from('album_members')
            .update({ status: 'accepted' })
            .eq('album_id', notification.album_id)
            .eq('user_id', user!.id);
        } else {
          await supabase
            .from('album_members')
            .delete()
            .eq('album_id', notification.album_id)
            .eq('user_id', user!.id);
        }
        markAsRead.mutate(notification.id);
        void queryClient.invalidateQueries({ queryKey: ['albums'] });
        void queryClient.invalidateQueries({ queryKey: ['album', notification.album_id] });
        void queryClient.invalidateQueries({ queryKey: ['albumCollaborators', notification.album_id] });
        void queryClient.invalidateQueries({ queryKey: ['buckets'] });
        if (accept && notification.album_id) {
          router.push(`/album/${notification.album_id}` as any);
        }
      } else {
        await supabase
          .from('bucket_collaborators')
          .update({ status: accept ? 'accepted' : 'declined' })
          .eq('bucket_id', notification.bucket_id)
          .eq('user_id', user!.id);
        markAsRead.mutate(notification.id);
        void queryClient.invalidateQueries({ queryKey: ['buckets'] });
        void queryClient.invalidateQueries({ queryKey: ['bucketCollaborators', notification.bucket_id] });
        void queryClient.invalidateQueries({ queryKey: ['bucketDetail', notification.bucket_id] });
        if (accept && notification.bucket_id) {
          router.push(`/bucket/${notification.bucket_id}` as any);
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo responder', 'Error');
    } finally {
      setRespondingId(null);
    }
  };

  const handleNotificationPress = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navegar según el tipo (los comentarios y menciones abren directamente la hoja de comentarios)
    const route = getNotificationRoute(notification);
    if (route) router.push(route as any);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'user_reported':
      case 'content_reported': return <ShieldAlert size={16} color={theme.colors.error} />;
      case 'reaction': return <Heart size={16} color={theme.colors.primary} />;
      case 'comment':
      case 'mention':
      case 'comment_like': return <MessageCircle size={16} color={theme.colors.primary} />;
      case 'follow': 
      case 'follow_accepted':
      case 'follow_request': return <UserPlus size={16} color={theme.colors.success} />;
      case 'friend_completed': return <CheckCircle size={16} color={theme.colors.success} />;
      case 'deadline': return <Bell size={16} color={theme.colors.error} />;
      case 'collaboration_invite':
      case 'collaboration_request':
      case 'collaborator_joined':
      case 'collaboration_accepted': return <Users size={16} color="#D4B13A" />;
      case 'album_invite': return <Folder size={16} color="#D4B13A" />;
      case 'notification_request':
      case 'notification_accepted':
      case 'bucket_update':
      case 'album_update': return <Bell size={16} color="#D4B13A" />;
      case 'drive_access': return <HardDrive size={16} color={gold[400]} />;
      default: return <Bell size={16} color={theme.dark ? '#FFFFFF' : theme.colors.foregroundMuted} />;
    }
  };

  const getMessageForType = (notification: any) => {
    const actorName = notification.actor?.display_name || notification.actor?.username || 'Alguien';
    
    switch (notification.type) {
      case 'user_reported': return notification.content || `${actorName} ha enviado un reporte de usuario.`;
      case 'content_reported': return notification.content || `${actorName} ha reportado un contenido.`;
      case 'reaction':
      case 'comment':
      case 'mention':
      case 'comment_like':
        return (
          getSpecificNotificationText(notification, actorName, notification, user?.id) ??
          notification.content ??
          'Tienes una nueva notificación.'
        );
      case 'follow': return `${actorName} ha empezado a seguirte.`;
      case 'follow_request': return `${actorName} quiere seguirte.`;
      case 'follow_accepted': return `${actorName} aceptó tu solicitud.`;
      case 'friend_completed': return `¡${actorName} completó una tarea!`;
      case 'deadline': return `Una tarea tiene la fecha límite próxima.`;
      case 'collaboration_invite': return notification.content || `${actorName} te ha invitado a colaborar.`;
      case 'collaboration_request': return notification.content || `${actorName} ha solicitado colaborar en tu tarea.`;
      case 'collaborator_joined': return notification.content || `${actorName} se ha unido como colaborador a tu tarea.`;
      case 'collaboration_accepted': return notification.content || `${actorName} ha aceptado tu solicitud de colaboración.`;
      case 'album_invite': return notification.content || `${actorName} te ha invitado a colaborar en un álbum.`;
      case 'notification_request': return notification.content || `${actorName} ha solicitado activar notificaciones.`;
      case 'notification_accepted': return notification.content || `${actorName} aceptó la solicitud de notificaciones.`;
      case 'bucket_update': return notification.content || `${actorName} ha actualizado una tarea que sigues.`;
      case 'album_update': return notification.content || `${actorName} ha actualizado un álbum que sigues.`;
      case 'drive_access': return notification.content || `${actorName} ha accedido al enlace de Google Drive en tu tarea.`;
      default: return notification.content || `Tienes una nueva notificación.`;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.dark ? '#222222' : '#cccccc' }]}>
          <PageTitle>Notificaciones</PageTitle>
        </View>
        <View style={{ padding: 16, gap: 14 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
              <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Skeleton width="80%" height={14} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width="40%" height={11} borderRadius={4} />
              </View>
              <Skeleton width={32} height={10} borderRadius={4} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const notificationsHeader = (
    <View>
      <View style={[styles.header, { borderBottomColor: theme.dark ? '#222222' : '#cccccc' }]}>
        <PageTitle>Notificaciones</PageTitle>
        {unreadCount > 0 ? (
          <Pressable
            onPress={() => user && markAllAsRead.mutate(user.id)}
            disabled={markAllAsRead.isPending}
            style={({ pressed }) => [
              styles.markAllBtn,
              { opacity: pressed || markAllAsRead.isPending ? 0.7 : 1 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Leer todas las notificaciones"
          >
            <CheckCheck size={16} color={gold[400]} />
            <Text style={styles.markAllText}>Leer todas</Text>
          </Pressable>
        ) : notifications && notifications.length > 0 ? (
          <Pressable
            onPress={() => user && markAllAsRead.mutate(user.id)}
            disabled={markAllAsRead.isPending}
            style={({ pressed }) => [
              styles.allReadBadge,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              { opacity: pressed || markAllAsRead.isPending ? 0.7 : 1 },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Todas leídas"
          >
            <Check size={14} color={theme.colors.foregroundMuted} />
            <Text style={[styles.allReadText, { color: theme.colors.foregroundMuted }]}>Leídas</Text>
          </Pressable>
        ) : null}
      </View>

      {permStatus && !permStatus.granted ? (
        <View
          style={[
            styles.permBanner,
            {
              backgroundColor: theme.dark ? '#261805' : '#FFFBEB',
              borderColor: '#F59E0B',
            },
          ]}
        >
          <Bell size={20} color="#F59E0B" style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.permBannerTitle, { color: theme.dark ? '#FCD34D' : '#92400E' }]}>
              Notificaciones desactivadas
            </Text>
            <Text style={[styles.permBannerText, { color: theme.dark ? '#FDE68A' : '#B45309' }]}>
              Activa los permisos para recibir avisos y sonido en tu móvil cuando interactúen contigo.
            </Text>
          </View>
          <Pressable
            onPress={handleEnablePermissions}
            style={styles.permBannerBtn}
            accessibilityRole="button"
          >
            <Text style={styles.permBannerBtnText}>
              {permStatus.canAskAgain ? 'Activar' : 'Ajustes'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={notifications || []}
        ListHeaderComponent={notificationsHeader}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable 
            style={[
              styles.notificationRow, 
              { borderBottomColor: theme.dark ? '#222222' : '#eeeeee' },
              !item.is_read && { backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface }
            ]}
            onPress={() => handleNotificationPress(item)}
          >
            <View style={styles.iconContainer}>
              {item.actor ? (
                <Avatar 
                  source={item.actor.avatar_url ? { uri: item.actor.avatar_url } : undefined} 
                  fallback={item.actor.display_name?.charAt(0) || '?'} 
                  size="sm" 
                />
              ) : (
                <View style={[styles.systemIcon, { backgroundColor: theme.dark ? '#262626' : theme.colors.border }]}>
                  {getIconForType(item.type)}
                </View>
              )}
              <View style={[
                styles.badge, 
                { 
                  backgroundColor: theme.dark ? '#1E1E1E' : '#FFFFFF', 
                  borderColor: theme.dark ? '#333333' : '#EEEEEE',
                  borderWidth: StyleSheet.hairlineWidth 
                }
              ]}>
                {getIconForType(item.type)}
              </View>
            </View>
            
            <View style={styles.content}>
              <Typography 
                variant="body" 
                color={theme.dark ? '#FFFFFF' : theme.colors.foreground}
                style={!item.is_read ? { fontWeight: 'bold' } : undefined}
              >
                {getMessageForType(item)}
              </Typography>
              <Typography 
                variant="caption" 
                color={theme.dark ? '#FFFFFF' : theme.colors.foregroundMuted}
                style={{ opacity: theme.dark ? 0.75 : 1 }}
              >
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
              </Typography>
              {(item.type === 'collaboration_invite' || item.type === 'album_invite' || item.type === 'notification_request' || item.type === 'collaboration_request') && !item.is_read && (
                <View style={styles.inviteActions}>
                  <Pressable
                    style={[styles.inviteBtn, styles.inviteBtnAccept]}
                    disabled={respondingId === item.id}
                    onPress={() => handleCollaborationResponse(item, true)}
                  >
                    <Check size={14} color="#111" strokeWidth={3} />
                    <Text style={styles.inviteBtnTextAccept}>Aceptar</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.inviteBtn, 
                      styles.inviteBtnDecline,
                      theme.dark && { backgroundColor: '#262626', borderColor: '#404040' }
                    ]}
                    disabled={respondingId === item.id}
                    onPress={() => handleCollaborationResponse(item, false)}
                  >
                    <X size={14} color={theme.dark ? '#FFFFFF' : '#9A9A9A'} />
                    <Text style={[styles.inviteBtnTextDecline, theme.dark && { color: '#FFFFFF' }]}>Rechazar</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {!item.is_read && (
              <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Typography 
              variant="body" 
              color={theme.dark ? '#FFFFFF' : theme.colors.foregroundMuted} 
              style={{ marginTop: spacing[10] }}
            >
              No tienes notificaciones aún.
            </Typography>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    minHeight: 44 + 12 + 16, // misma altura de fila (44) que Ajustes / Perfil → el título queda a la misma altura
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222222',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  markAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: gold[400],
  },
  allReadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  allReadText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  iconContainer: {
    position: 'relative',
    marginRight: spacing[3],
  },
  systemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2,
  },
  content: {
    flex: 1,
    marginRight: spacing[2],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  inviteBtnAccept: { backgroundColor: '#D4B13A' },
  inviteBtnDecline: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#3A3A3A' },
  inviteBtnTextAccept: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#111' },
  inviteBtnTextDecline: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9A9A9A' },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  permBannerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  permBannerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  permBannerBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  permBannerBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#000000',
  },
});

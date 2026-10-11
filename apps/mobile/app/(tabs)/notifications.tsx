import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Pressable, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, useTheme, spacing, Avatar, Button, Icon } from '@bucketlist/ui';
import { Check, Heart, MessageCircle, UserPlus, CheckCircle, Bell, Users, X, Folder } from 'lucide-react-native';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../src/hooks/useNotifications';
import { useAuthStore } from '../../src/stores/auth.store';
import { supabase } from '../../src/services/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  
  const { data: notifications, isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleCollaborationResponse = async (notification: any, accept: boolean) => {
    setRespondingId(notification.id);
    try {
      if (notification.type === 'album_invite') {
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
      Alert.alert('Error', e?.message ?? 'No se pudo responder');
    } finally {
      setRespondingId(null);
    }
  };

  const handleNotificationPress = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navigate based on type
    if (notification.type === 'follow' || notification.type === 'follow_accepted') {
      router.push(`/profile/${notification.actor_id}` as any);
    } else if (notification.type === 'follow_request') {
      router.push('/friends?tab=requests' as any);
    } else if (notification.type === 'album_invite') {
      if (notification.album_id) {
        router.push(`/album/${notification.album_id}` as any);
      }
    } else if (notification.type === 'reaction' || notification.type === 'comment' || notification.type === 'friend_completed' || notification.type === 'deadline') {
      if (notification.bucket_id) {
        router.push(`/bucket/${notification.bucket_id}` as any);
      }
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'reaction': return <Heart size={16} color={theme.colors.primary} />;
      case 'comment': return <MessageCircle size={16} color={theme.colors.primary} />;
      case 'follow': 
      case 'follow_accepted':
      case 'follow_request': return <UserPlus size={16} color={theme.colors.success} />;
      case 'friend_completed': return <CheckCircle size={16} color={theme.colors.success} />;
      case 'deadline': return <Bell size={16} color={theme.colors.error} />;
      case 'collaboration_invite': return <Users size={16} color="#D4B13A" />;
      case 'album_invite': return <Folder size={16} color="#D4B13A" />;
      default: return <Bell size={16} color={theme.colors.foregroundMuted} />;
    }
  };

  const getMessageForType = (notification: any) => {
    const actorName = notification.actor?.display_name || notification.actor?.username || 'Alguien';
    
    switch (notification.type) {
      case 'reaction': return `${actorName} ha reaccionado a tu tarea.`;
      case 'comment': return `${actorName} ha comentado en tu tarea.`;
      case 'follow': return `${actorName} ha empezado a seguirte.`;
      case 'follow_request': return `${actorName} quiere seguirte.`;
      case 'follow_accepted': return `${actorName} aceptó tu solicitud.`;
      case 'friend_completed': return `¡${actorName} completó una tarea!`;
      case 'deadline': return `Una tarea tiene la fecha límite próxima.`;
      case 'collaboration_invite': return notification.content || `${actorName} te ha invitado a colaborar.`;
      case 'album_invite': return notification.content || `${actorName} te ha invitado a colaborar en un álbum.`;
      default: return `Tienes una nueva notificación.`;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Typography variant="h2">Notifications</Typography>
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onPress={() => user && markAllAsRead.mutate(user.id)}
            disabled={markAllAsRead.isPending}
          >
            Mark all read
          </Button>
        )}
      </View>

      <FlatList
        data={notifications || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable 
            style={[
              styles.notificationRow, 
              !item.is_read && { backgroundColor: theme.colors.surface }
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
                <View style={[styles.systemIcon, { backgroundColor: theme.colors.border }]}>
                  {getIconForType(item.type)}
                </View>
              )}
              <View style={styles.badge}>
                {getIconForType(item.type)}
              </View>
            </View>
            
            <View style={styles.content}>
              <Typography variant="body" style={!item.is_read ? { fontWeight: 'bold' } : undefined}>
                {getMessageForType(item)}
              </Typography>
              <Typography variant="caption" color="textMuted">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </Typography>
              {(item.type === 'collaboration_invite' || item.type === 'album_invite') && !item.is_read && (
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
                    style={[styles.inviteBtn, styles.inviteBtnDecline]}
                    disabled={respondingId === item.id}
                    onPress={() => handleCollaborationResponse(item, false)}
                  >
                    <X size={14} color="#9A9A9A" />
                    <Text style={styles.inviteBtnTextDecline}>Rechazar</Text>
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
            <Typography variant="body" color="textSecondary" style={{ marginTop: spacing[10] }}>
              No notifications yet.
            </Typography>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
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
});

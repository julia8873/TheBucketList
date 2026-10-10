import React from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, useTheme, spacing, Avatar, Button, Icon } from '@bucketlist/ui';
import { Check, Heart, MessageCircle, UserPlus, CheckCircle, Bell } from 'lucide-react-native';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../src/hooks/useNotifications';
import { useAuthStore } from '../../src/stores/auth.store';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const { data: notifications, isLoading } = useNotifications(user?.id);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleNotificationPress = (notification: any) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    
    // Navigate based on type
    if (notification.type === 'follow' || notification.type === 'follow_accepted') {
      router.push(`/profile/${notification.actor_id}` as any);
    } else if (notification.type === 'follow_request') {
      router.push('/friends?tab=requests' as any);
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
      default: return <Bell size={16} color={theme.colors.foregroundMuted} />;
    }
  };

  const getMessageForType = (notification: any) => {
    const actorName = notification.actor?.display_name || notification.actor?.username || 'Someone';
    
    switch (notification.type) {
      case 'reaction': return `${actorName} reacted to your goal.`;
      case 'comment': return `${actorName} commented on your goal.`;
      case 'follow': return `${actorName} started following you.`;
      case 'follow_request': return `${actorName} requested to follow you.`;
      case 'follow_accepted': return `${actorName} accepted your follow request.`;
      case 'friend_completed': return `${actorName} completed a goal!`;
      case 'deadline': return `A goal deadline is approaching.`;
      default: return `You have a new notification.`;
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
});

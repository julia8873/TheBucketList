import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Typography, Card, Avatar, Icon, spacing, useTheme, radii } from '@bucketlist/ui';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { MapPin, MessageCircle, Share } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { storageApi } from '../services/api/storage';
import { useToggleReaction } from '../hooks/useSocial';
import { useAuthStore } from '../stores/auth.store';

interface FeedCardProps {
  event: any;
  onPress: () => void;
  index: number;
}

const EMOJIS = ['👏', '🔥', '❤️', '🌟'];

export function FeedCard({ event, onPress, index }: FeedCardProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const toggleReaction = useToggleReaction();
  
  const actor = event.actor;
  const bucket = event.bucket;
  
  if (!actor || !bucket) return null;

  const isCompleted = event.type === 'completed';
  const photos = bucket.bucket_photos || [];
  const primaryPhoto = photos.length > 0 ? photos[0] : null;
  
  const reactions = bucket.reactions || [];
  const reactionCounts = reactions.reduce((acc: Record<string, number>, r: any) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  
  // Default to 👏 if no specific reaction exists for the preview
  const primaryReactionEmoji = '👏';
  const primaryReactionCount = reactionCounts[primaryReactionEmoji] || 0;
  
  const commentsCount = bucket.comments?.[0]?.count || 0;

  const handleReact = () => {
    if (!user) return;
    toggleReaction.mutate({ bucketId: bucket.id, userId: user.id, emoji: '👏' });
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 100).springify()}
      layout={Layout.springify()}
      style={styles.container}
    >
      <Card variant="elevated" style={styles.card}>
        <Pressable onPress={onPress}>
          {/* Header */}
          <View style={styles.header}>
            <Avatar 
              uri={actor.avatar_url} 
              initials={actor.display_name?.charAt(0) || actor.username?.charAt(0) || '?'} 
              size="sm" 
            />
            <View style={styles.headerText}>
              <Typography variant="body" style={{ fontWeight: '600', color: theme.colors.foreground }}>
                {actor.display_name || actor.username}
              </Typography>
              <Typography variant="body" color="textSecondary" style={{ marginTop: 2, fontSize: 15 }}>
                {bucket.title}
              </Typography>
            </View>
          </View>

          {/* Body Row */}
          <View style={styles.bodyRow}>
            {primaryPhoto && (
              <Image 
                source={{ uri: storageApi.getPublicUrl(primaryPhoto.thumb_path || primaryPhoto.storage_path) }}
                style={styles.mainImage}
              />
            )}
            
            <View style={styles.rightContent}>
              {bucket.location_text && (
                <View style={[styles.locationPill, { backgroundColor: theme.colors.surface }]}>
                  <Icon icon={MapPin} size={12} color={theme.colors.foreground} />
                  <Typography variant="caption" style={{ marginLeft: 4, fontWeight: '500' }}>
                    {bucket.location_text}
                  </Typography>
                </View>
              )}
              
              <Typography variant="caption" color="textSecondary" style={styles.description} numberOfLines={4}>
                {bucket.description || 'No description provided.'}
              </Typography>
              
              <View style={styles.spacer} />
              
              {/* Actions Footer */}
              <View style={styles.actionsFooter}>
                <Pressable style={styles.actionButton} onPress={handleReact}>
                  <Typography variant="body">👏</Typography>
                  <Typography variant="body" style={styles.actionText}>{primaryReactionCount}</Typography>
                </Pressable>
                
                <Pressable style={styles.actionButton}>
                  <Icon icon={MessageCircle} size={18} color={theme.colors.foregroundMuted} />
                  <Typography variant="body" style={styles.actionText}>{commentsCount}</Typography>
                </Pressable>
                
                <View style={styles.spacer} />
                
                <Pressable style={styles.shareButton}>
                  <Icon icon={Share} size={18} color={theme.colors.foregroundMuted} />
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  card: {
    padding: spacing[4],
    borderRadius: radii['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  headerText: {
    marginLeft: spacing[3],
    flex: 1,
    justifyContent: 'center',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 140,
  },
  mainImage: {
    width: 140,
    height: 140,
    borderRadius: radii.xl,
    backgroundColor: '#eee',
  },
  rightContent: {
    flex: 1,
    marginLeft: spacing[4],
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginBottom: spacing[2],
  },
  description: {
    lineHeight: 18,
    fontSize: 13,
  },
  spacer: {
    flex: 1,
  },
  actionsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing[4],
  },
  actionText: {
    marginLeft: 6,
    color: '#666',
    fontWeight: '500',
  },
  shareButton: {
    padding: 4,
  }
});

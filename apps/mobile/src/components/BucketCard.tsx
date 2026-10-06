import React, { useRef } from 'react';
import { View, StyleSheet, Pressable, Animated as RNAnimated, Alert } from 'react-native';
import { Typography, Card, Badge, Icon, spacing, useTheme } from '@bucketlist/ui';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { MapPin, CheckSquare, Calendar, Globe, Lock, Users, Trash2 } from 'lucide-react-native';
import type { Database } from '@bucketlist/shared';
import { useDeleteBucket } from '../hooks/useBuckets';

type BucketRow = Database['public']['Tables']['buckets']['Row'];
type SubtaskRow = Database['public']['Tables']['item_subtasks']['Row'];

interface BucketWithSubtasks extends BucketRow {
  item_subtasks?: SubtaskRow[];
}

interface BucketCardProps {
  bucket: BucketWithSubtasks;
  onPress: () => void;
  onComplete?: () => void;
  index: number;
}

export function BucketCard({ bucket, onPress, onComplete, index }: BucketCardProps) {
  const { theme } = useTheme();
  const deleteBucket = useDeleteBucket();
  const swipeableRef = useRef<Swipeable>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const completedSubtasks = bucket.item_subtasks?.filter((st) => st.done).length || 0;
  const totalSubtasks = bucket.item_subtasks?.length || 0;

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel", onPress: () => swipeableRef.current?.close() },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            deleteBucket.mutate(bucket.id);
          }
        }
      ]
    );
  };

  const renderRightActions = (progress: RNAnimated.AnimatedInterpolation<number>, dragX: RNAnimated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <Pressable style={[styles.deleteAction, { backgroundColor: theme.colors.error }]} onPress={handleDelete}>
        <RNAnimated.View style={{ transform: [{ scale }] }}>
          <Icon icon={Trash2} color={theme.colors.errorForeground} size={24} />
        </RNAnimated.View>
      </Pressable>
    );
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 100).springify()}
      layout={Layout.springify()}
      style={styles.container}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
      >
        <Pressable onPress={onPress}>
          <Card variant="elevated" style={styles.card}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Typography variant="h3" numberOfLines={1}>{bucket.title}</Typography>
                {bucket.location_text && (
                  <View style={styles.locationContainer}>
                    <Icon icon={MapPin} size={12} color={theme.colors.foregroundMuted} />
                    <Typography variant="caption" color="textSecondary" style={styles.locationText}>
                      {bucket.location_text}
                    </Typography>
                  </View>
                )}
              </View>
              <Badge 
                label={getStatusLabel(bucket.status || 'pending')} 
                variant={getStatusColor(bucket.status || 'pending') as any} 
              />
            </View>

            {bucket.description && (
              <Typography variant="body" color="textSecondary" numberOfLines={2} style={styles.description}>
                {bucket.description}
              </Typography>
            )}

            <View style={styles.footer}>
              <View style={styles.statsContainer}>
                {totalSubtasks > 0 && (
                  <View style={styles.stat}>
                    <Icon icon={CheckSquare} size={14} color={theme.colors.foregroundMuted} />
                    <Typography variant="caption" color="textSecondary">
                      {completedSubtasks}/{totalSubtasks}
                    </Typography>
                  </View>
                )}
                {bucket.deadline && (
                  <View style={styles.stat}>
                    <Icon icon={Calendar} size={14} color={theme.colors.foregroundMuted} />
                    <Typography variant="caption" color="textSecondary">
                      {new Date(bucket.deadline).toLocaleDateString()}
                    </Typography>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                 <Icon 
                   icon={bucket.visibility === 'public' ? Globe : bucket.visibility === 'private' ? Lock : Users} 
                   size={14} 
                   color={theme.colors.foregroundMuted} 
                 />
                 {onComplete && (bucket.status === 'pending' || bucket.status === 'in_progress') && (
                   <Pressable
                     onPress={(e) => {
                       e.stopPropagation();
                       onComplete();
                     }}
                     style={{ padding: spacing[1] }}
                   >
                     <Icon icon={CheckSquare} size={18} color={theme.colors.primary} />
                   </Pressable>
                 )}
              </View>
            </View>
          </Card>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  card: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing[2],
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  locationText: {
    flex: 1,
  },
  description: {
    marginBottom: spacing[4],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visibility: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 80,
    height: '100%',
    paddingRight: spacing[4],
    borderRadius: spacing[2],
    marginLeft: -spacing[4], // Pull it under the card slightly
  },
});


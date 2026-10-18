import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, useTheme } from '@bucketlist/ui';

export function FeedCardSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      {/* Header: Avatar, Name, Handle, Time */}
      <View style={styles.header}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.headerText}>
          <Skeleton width="48%" height={14} borderRadius={6} style={styles.nameSkeleton} />
          <Skeleton width="28%" height={11} borderRadius={5} />
        </View>
        <Skeleton width={42} height={11} borderRadius={5} />
      </View>

      {/* Cover Skeleton */}
      <View
        style={[
          styles.coverWrapper,
          { backgroundColor: theme.colors.surfaceSunken, borderColor: theme.colors.border },
        ]}
      >
        <Skeleton borderRadius={24} style={{ width: '100%', height: '100%' }} />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <Skeleton width={22} height={22} borderRadius={11} />
          <Skeleton width={14} height={12} borderRadius={4} />
        </View>
        <View style={styles.actionItem}>
          <Skeleton width={22} height={22} borderRadius={11} />
          <Skeleton width={14} height={12} borderRadius={4} />
        </View>
        <View style={{ flex: 1 }} />
        <Skeleton width={100} height={38} borderRadius={19} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  nameSkeleton: {
    marginBottom: 6,
  },
  coverWrapper: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 14,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

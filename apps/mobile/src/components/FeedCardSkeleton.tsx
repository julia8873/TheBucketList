import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton, useTheme, radii } from '@bucketlist/ui';

export function FeedCardSkeleton() {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.dark ? '#2A2A2A' : '#E0D9CE',
          backgroundColor: theme.dark ? '#111' : '#FAF8F4',
        },
      ]}
    >
      {/* Cover Skeleton */}
      <View
        style={[
          styles.coverWrapper,
          { backgroundColor: theme.colors.surfaceSunken },
        ]}
      >
        <Skeleton style={{ width: '100%', height: '100%' }} />
      </View>

      {/* Footer Skeleton: User Info on Left, Action on Right */}
      <View style={styles.footer}>
        <View style={styles.ownerRow}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width="45%" height={12} borderRadius={5} />
            <Skeleton width="30%" height={10} borderRadius={4} />
          </View>
          <Skeleton width={88} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  coverWrapper: {
    height: 195,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

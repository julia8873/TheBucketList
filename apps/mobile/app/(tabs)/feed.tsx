import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Typography, useTheme, spacing, EmptyState } from '@bucketlist/ui';
import { Users } from 'lucide-react-native';
import { FeedCard } from '../../src/components/FeedCard';
import { useFeed } from '../../src/hooks/useFeed';
import { useAuthStore } from '../../src/stores/auth.store';

export default function FeedScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useFeed(user?.id);

  const flatData = useMemo(() => {
    return data?.pages.flatMap((page) => page.items) || [];
  }, [data]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body" color="error">Failed to load feed.</Typography>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Typography variant="h2">Feed</Typography>
      </View>

      <FlashList
        data={flatData}
        renderItem={({ item, index }) => (
          <FeedCard 
            event={item}
            index={index}
            onPress={() => router.push(`/bucket/${item.bucket_id}` as any)}
          />
        )}
        estimatedItemSize={250}
        onEndReached={() => {
          if (hasNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ padding: spacing[4] }}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="Your feed is quiet"
            message="Follow some friends to see their buckets and progress here."
            icon={Users}
            actionLabel="Find Friends"
            onAction={() => router.push('/(tabs)/explore')}
          />
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
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6], // roughly status bar height fallback
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc', // fallback
  }
});

import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    const allItems = data?.pages.flatMap((page) => page.items) || [];
    const uniqueItems = [];
    const seen = new Set();
    for (const item of allItems) {
      if (item && item.bucket_id && !seen.has(item.bucket_id)) {
        seen.add(item.bucket_id);
        uniqueItems.push(item);
      }
    }
    return uniqueItems;
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
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Typography variant="h1">Momentos de amigos</Typography>
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
    </SafeAreaView>
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
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc', // fallback
  }
});

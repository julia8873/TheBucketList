import React from 'react';
import { View, ScrollView, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { EmptyState, Typography, Avatar, gold } from '@bucketlist/ui';
import { FeedCard } from '../../../components/FeedCard';
import { FeedCardSkeleton } from '../../../components/FeedCardSkeleton';
import { styles } from '../styles/feed.styles';

interface ExploreFeedTabProps {
  headerElement: React.ReactElement;
  debouncedSearch: string;
  isSearchLoading: boolean;
  searchResults?: any[];
  isExploreLoading: boolean;
  exploreBuckets: any[];
  manualRefreshing: boolean;
  onRefresh: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  windowHeight: number;
  listRef?: React.RefObject<any>;
}

export function ExploreFeedTab({
  headerElement,
  debouncedSearch,
  isSearchLoading,
  searchResults,
  isExploreLoading,
  exploreBuckets,
  manualRefreshing,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  windowHeight,
  listRef,
}: ExploreFeedTabProps) {
  const router = useRouter();

  if (debouncedSearch.length >= 2) {
    return (
      <View style={styles.container}>
        {headerElement}
        {isSearchLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={gold[400]} />
        ) : (
          <FlatList
            data={searchResults || []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10 }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.userRow}
                onPress={() => router.push(`/profile/${item.id}` as any)}
              >
                <Avatar
                  source={item.avatar_url ? { uri: item.avatar_url } : undefined}
                  fallback={item.display_name?.charAt(0) || item.username?.charAt(0) || '?'}
                  size="md"
                />
                <View style={styles.userInfo}>
                  <Typography variant="body" style={{ fontWeight: 'bold' }}>
                    {item.display_name || item.username}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    @{item.username}
                  </Typography>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Typography
                variant="body"
                color="textSecondary"
                style={{ textAlign: 'center', marginTop: 40 }}
              >
                No se encontraron usuarios.
              </Typography>
            }
          />
        )}
      </View>
    );
  }

  if (isExploreLoading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {headerElement}
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </ScrollView>
    );
  }

  return (
    <FlashList
      ref={listRef}
      data={exploreBuckets}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <FeedCard
          event={{
            actor: item.user,
            bucket: item,
            type: 'new_bucket',
            created_at: item.created_at,
          }}
          index={index}
          onPress={() => router.push(`/bucket/${item.id}` as any)}
        />
      )}
      estimatedItemSize={300}
      ListHeaderComponent={
        <View>
          {headerElement}
          <Typography variant="h3" style={styles.sectionTitle}>
            Ideas para empezar
          </Typography>
        </View>
      }
      refreshing={manualRefreshing}
      onRefresh={onRefresh}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} color={gold[400]} />
        ) : null
      }
      ListEmptyComponent={
        <View style={[styles.emptyWrap, { minHeight: windowHeight * 0.45 }]}>
          <EmptyState
            title="No hay ideas públicas aún"
            message="Sé el primero en compartir un objetivo público con la comunidad."
            icon={Users}
          />
        </View>
      }
    />
  );
}

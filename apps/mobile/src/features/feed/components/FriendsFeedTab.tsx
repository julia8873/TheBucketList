import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { EmptyState, gold } from '@bucketlist/ui';
import { FeedCard } from '../../../components/FeedCard';
import { FeedCardSkeleton } from '../../../components/FeedCardSkeleton';
import { TaskViewMode } from '../../../components/ViewModeSelector';
import { styles } from '../styles/feed.styles';

interface FriendsFeedTabProps {
  headerElement: React.ReactElement;
  isLoading: boolean;
  isError: boolean;
  friendsItems: any[];
  manualRefreshing: boolean;
  onRefresh: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  windowHeight: number;
  onOpenFriends: () => void;
  onRetry: () => void;
  listRef?: React.RefObject<any>;
  viewMode?: TaskViewMode;
}

export function FriendsFeedTab({
  headerElement,
  isLoading,
  isError,
  friendsItems,
  manualRefreshing,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  windowHeight,
  onOpenFriends,
  onRetry,
  listRef,
  viewMode = 'list',
}: FriendsFeedTabProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {headerElement}
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </ScrollView>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        {headerElement}
        <EmptyState
          title="No se pudo cargar el feed"
          message="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      </View>
    );
  }

  return (
    <FlashList
      ref={listRef}
      key={viewMode}
      data={friendsItems}
      keyExtractor={(item) => item.id}
      numColumns={viewMode === 'gallery' ? 2 : 1}
      contentContainerStyle={viewMode === 'gallery' ? { paddingHorizontal: 10 } : undefined}
      renderItem={({ item, index }) => (
        <FeedCard
          event={item}
          index={index}
          mode={viewMode}
          onPress={() => router.push(`/bucket/${item.bucket_id}` as any)}
        />
      )}
      estimatedItemSize={viewMode === 'gallery' ? 240 : viewMode === 'compact' ? 70 : 430}
      ListHeaderComponent={headerElement}
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
            title="Tu feed está tranquilo"
            message="Sigue a tus amigos para ver aquí los momentos que completan."
            icon={Users}
            actionLabel="Buscar personas"
            onAction={onOpenFriends}
          />
        </View>
      }
    />
  );
}

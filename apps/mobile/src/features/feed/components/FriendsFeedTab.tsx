import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Users, Images } from 'lucide-react-native';
import { EmptyState, gold } from '@bucketlist/ui';
import { FeedCard } from '../../../components/FeedCard';
import { FeedCardSkeleton } from '../../../components/FeedCardSkeleton';
import { AlbumFeedCard, type AlbumFeedItem } from '../../../components/AlbumFeedCard';
import { TaskViewMode } from '../../../components/ViewModeSelector';
import type { ContentFilter } from './FeedHeader';
import { styles } from '../styles/feed.styles';
import { useUserFavorites, useToggleFavoriteAlbum } from '../../../hooks/useFavorites';
import { useAuthStore } from '../../../stores/auth.store';

interface FriendsFeedTabProps {
  headerElement: React.ReactElement;
  isLoading: boolean;
  isError: boolean;
  friendsItems: any[];
  friendsAlbums: AlbumFeedItem[];
  isAlbumsLoading: boolean;
  contentFilter: ContentFilter;
  manualRefreshing: boolean;
  onRefresh: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  hasNextAlbumsPage?: boolean;
  isFetchingNextAlbumsPage: boolean;
  fetchNextAlbumsPage: () => void;
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
  friendsAlbums,
  isAlbumsLoading,
  contentFilter,
  manualRefreshing,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  hasNextAlbumsPage,
  isFetchingNextAlbumsPage,
  fetchNextAlbumsPage,
  windowHeight,
  onOpenFriends,
  onRetry,
  listRef,
  viewMode = 'list',
}: FriendsFeedTabProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isAlbumFavorite } = useUserFavorites(user?.id);
  const toggleAlbumFav = useToggleFavoriteAlbum();

  // Build combined & filtered list
  const combinedItems = React.useMemo(() => {
    const tasks = contentFilter !== 'albumes'
      ? friendsItems.map((item) => ({ ...item, _type: 'task' as const }))
      : [];
    const albums = contentFilter !== 'tareas'
      ? friendsAlbums.map((a) => ({ ...a, _type: 'album' as const }))
      : [];

    if (contentFilter === 'tareas') return tasks;
    if (contentFilter === 'albumes') return albums;

    // 'todo': interleave albums every 3 tasks
    const merged: any[] = [];
    let ai = 0;
    tasks.forEach((t, i) => {
      merged.push(t);
      if ((i + 1) % 3 === 0 && ai < albums.length) {
        merged.push(albums[ai++]);
      }
    });
    // Append remaining albums
    while (ai < albums.length) merged.push(albums[ai++]);
    return merged;
  }, [friendsItems, friendsAlbums, contentFilter]);

  const renderItem = React.useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (item._type === 'album') {
        const fav = isAlbumFavorite(item.id);
        return (
          <AlbumFeedCard
            album={item}
            colorIndex={index}
            isFavorite={fav}
            onToggleFavorite={() => toggleAlbumFav.mutate({ albumId: item.id, currentlyFavorite: fav })}
            onPress={() => router.push(`/album/${item.id}` as any)}
          />
        );
      }
      return (
        <FeedCard
          event={item}
          index={index}
          mode={viewMode}
          onPress={() => router.push(`/bucket/${item.bucket_id}` as any)}
        />
      );
    },
    [viewMode, router]
  );

  const loading = isLoading || isAlbumsLoading;

  if (loading && combinedItems.length === 0) {
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

  const onEndReached = () => {
    if (contentFilter !== 'albumes' && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    if (contentFilter !== 'tareas' && hasNextAlbumsPage && !isFetchingNextAlbumsPage) void fetchNextAlbumsPage();
  };

  const isFetchingNext = isFetchingNextPage || isFetchingNextAlbumsPage;

  const emptyTitle = contentFilter === 'albumes'
    ? 'Tus amigos no tienen álbumes'
    : contentFilter === 'tareas'
      ? 'Tu feed está tranquilo'
      : 'Tu feed está tranquilo';
  const emptyMessage = contentFilter === 'albumes'
    ? 'Cuando tus amigos creen álbumes públicos, aparecerán aquí.'
    : 'Sigue a tus amigos para ver aquí los momentos que completan.';

  return (
    <FlashList
      ref={listRef}
      key={`${viewMode}-${contentFilter}`}
      data={combinedItems}
      keyExtractor={(item) => `${item._type ?? 'task'}-${item.id}`}
      numColumns={viewMode === 'gallery' && contentFilter !== 'albumes' ? 2 : 1}
      renderItem={renderItem}
      estimatedItemSize={contentFilter === 'albumes' ? 240 : viewMode === 'gallery' ? 240 : viewMode === 'compact' ? 70 : 430}
      ListHeaderComponent={headerElement}
      refreshing={manualRefreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNext ? (
          <ActivityIndicator style={styles.footer} color={gold[400]} />
        ) : null
      }
      ListEmptyComponent={
        <View style={[styles.emptyWrap, { minHeight: windowHeight * 0.45 }]}>
          <EmptyState
            title={emptyTitle}
            message={emptyMessage}
            icon={contentFilter === 'albumes' ? Images : Users}
            actionLabel="Buscar personas"
            onAction={onOpenFriends}
          />
        </View>
      }
    />
  );
}

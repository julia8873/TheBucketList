import React from 'react';
import { View, ScrollView, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Users, Images } from 'lucide-react-native';
import { EmptyState, Typography, Avatar, gold } from '@bucketlist/ui';
import { FeedCard } from '../../../components/FeedCard';
import { FeedCardSkeleton } from '../../../components/FeedCardSkeleton';
import { AlbumFeedCard, type AlbumFeedItem } from '../../../components/AlbumFeedCard';
import { TaskViewMode } from '../../../components/ViewModeSelector';
import type { ContentFilter } from './FeedHeader';
import { styles } from '../styles/feed.styles';
import {
  useUserLikedAlbumIds,
  useToggleAlbumLike,
  useSavedAlbumIds,
  useToggleSaveAlbum,
  useBatchAlbumSaveCounts,
  useBatchAlbumLikeCounts,
} from '../../../hooks/useSocial';
import { useAuthStore } from '../../../stores/auth.store';

interface ExploreFeedTabProps {
  headerElement: React.ReactElement;
  debouncedSearch: string;
  isSearchLoading: boolean;
  searchResults?: any[];
  isExploreLoading: boolean;
  isAlbumsLoading: boolean;
  exploreBuckets: any[];
  exploreAlbums: AlbumFeedItem[];
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
  listRef?: React.RefObject<any>;
  viewMode?: TaskViewMode;
}

export function ExploreFeedTab({
  headerElement,
  debouncedSearch,
  isSearchLoading,
  searchResults,
  isExploreLoading,
  isAlbumsLoading,
  exploreBuckets,
  exploreAlbums,
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
  listRef,
  viewMode = 'list',
}: ExploreFeedTabProps) {
  const router = useRouter();
  const { user, session } = useAuthStore();
  const currentUserId = user?.id || session?.user?.id;
  const { data: likedAlbumIds } = useUserLikedAlbumIds(currentUserId);
  const toggleAlbumLike = useToggleAlbumLike();
  const { data: savedAlbumIds } = useSavedAlbumIds(currentUserId);
  const toggleSaveAlbum = useToggleSaveAlbum();

  const albumIds = React.useMemo(() => exploreAlbums.map((a) => a.id), [exploreAlbums]);
  const { data: albumSaveCounts } = useBatchAlbumSaveCounts(albumIds);
  const { data: albumLikeCounts } = useBatchAlbumLikeCounts(albumIds);

  // Combined + filtered list
  const combinedItems = React.useMemo(() => {
    const tasks = contentFilter !== 'albumes'
      ? exploreBuckets.map((item) => ({ ...item, _type: 'task' as const }))
      : [];
    const albums = contentFilter !== 'tareas'
      ? exploreAlbums.map((a) => ({ ...a, _type: 'album' as const }))
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
    while (ai < albums.length) merged.push(albums[ai++]);
    return merged;
  }, [exploreBuckets, exploreAlbums, contentFilter]);

  const extraData = React.useMemo(
    () => `${likedAlbumIds?.join(',') ?? ''}-${savedAlbumIds?.join(',') ?? ''}-${JSON.stringify(albumSaveCounts ?? {})}-${JSON.stringify(albumLikeCounts ?? {})}`,
    [likedAlbumIds, savedAlbumIds, albumSaveCounts, albumLikeCounts]
  );

  const renderItem = React.useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (item._type === 'album') {
        const isLiked = !!currentUserId && !!likedAlbumIds?.includes(item.id);
        const isSaved = !!currentUserId && !!savedAlbumIds?.includes(item.id);
        const isOwn = !!currentUserId && item.owner?.id === currentUserId;
        const saveCount = albumSaveCounts?.[item.id] ?? 0;
        const likeCount = albumLikeCounts?.[item.id] ?? 0;

        return (
          <AlbumFeedCard
            album={item}
            colorIndex={index}
            index={index}
            mode={contentFilter === 'albumes' ? 'list' : viewMode}
            isLiked={isLiked}
            likeCount={likeCount}
            onToggleLike={currentUserId ? () => toggleAlbumLike.mutate({ albumId: item.id, userId: currentUserId }) : undefined}
            isSaved={isSaved}
            onToggleSave={currentUserId && !isOwn ? () => toggleSaveAlbum.mutate({ albumId: item.id, userId: currentUserId, currentlySaved: isSaved }) : undefined}
            saveCount={saveCount}
            isOwn={isOwn}
            onPress={() => router.push(`/album/${item.id}` as any)}
          />
        );
      }
      return (
        <FeedCard
          event={{
            id: item.id,
            actor: item.user,
            bucket: item,
            type: 'new_bucket',
            created_at: item.created_at,
          }}
          index={index}
          mode={viewMode}
          onPress={() => router.push(`/bucket/${item.id}` as any)}
        />
      );
    },
    [viewMode, contentFilter, router, currentUserId, likedAlbumIds, savedAlbumIds, toggleAlbumLike, toggleSaveAlbum, albumSaveCounts, albumLikeCounts]
  );

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

  const loading = isExploreLoading || isAlbumsLoading;
  if (loading && combinedItems.length === 0) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {headerElement}
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </ScrollView>
    );
  }

  const onEndReached = () => {
    if (contentFilter !== 'albumes' && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    if (contentFilter !== 'tareas' && hasNextAlbumsPage && !isFetchingNextAlbumsPage) void fetchNextAlbumsPage();
  };

  const isFetchingNext = isFetchingNextPage || isFetchingNextAlbumsPage;

  const emptyTitle = contentFilter === 'albumes'
    ? 'No hay álbumes públicos aún'
    : 'No hay ideas públicas aún';
  const emptyMessage = contentFilter === 'albumes'
    ? 'Sé el primero en crear un álbum público para la comunidad.'
    : 'Sé el primero en compartir un objetivo público con la comunidad.';

  return (
    <FlashList
      ref={listRef}
      key={`${viewMode}-${contentFilter}`}
      data={combinedItems}
      extraData={extraData}
      keyExtractor={(item) => `${item._type ?? 'task'}-${item.id}`}
      numColumns={viewMode === 'gallery' && contentFilter !== 'albumes' ? 2 : 1}
      renderItem={renderItem}
      estimatedItemSize={contentFilter === 'albumes' ? 240 : viewMode === 'gallery' ? 240 : viewMode === 'compact' ? 70 : 300}
      ListHeaderComponent={
        <View>
          {headerElement}
          <Typography variant="h3" style={styles.sectionTitle}>
            {contentFilter === 'albumes' ? 'Álbumes de la comunidad' : 'Ideas para empezar'}
          </Typography>
        </View>
      }
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
          />
        </View>
      }
    />
  );
}

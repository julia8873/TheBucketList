import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Users, Images } from 'lucide-react-native';
import { EmptyState, gold } from '@bucketlist/ui';
import { FeedCard } from '../../../components/FeedCard';
import { FeedCardSkeleton } from '../../../components/FeedCardSkeleton';
import { TaskGallerySkeleton } from '../../../components/TaskSkeletons';
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
import { useTranslation } from '@bucketlist/shared';
import { useAuthStore } from '../../../stores/auth.store';

import { FeedSearchResultsView } from './FeedSearchResultsView';

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
  debouncedSearch?: string;
  isSearchLoading?: boolean;
  searchResults?: { tasks: any[]; albums: any[]; users: any[] };
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
  debouncedSearch = '',
  isSearchLoading = false,
  searchResults,
}: FriendsFeedTabProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, session } = useAuthStore();
  const currentUserId = user?.id || session?.user?.id;
  const { data: likedAlbumIds } = useUserLikedAlbumIds(currentUserId);
  const toggleAlbumLike = useToggleAlbumLike();
  const { data: savedAlbumIds } = useSavedAlbumIds(currentUserId);
  const toggleSaveAlbum = useToggleSaveAlbum();

  const albumIds = React.useMemo(() => friendsAlbums.map((a) => a.id), [friendsAlbums]);
  const { data: albumSaveCounts } = useBatchAlbumSaveCounts(albumIds);
  const { data: albumLikeCounts } = useBatchAlbumLikeCounts(albumIds);

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

  // Stringify so FlashList re-renders album cells when like/save state or counts change
  // MUST be declared before any conditional return to obey React Rules of Hooks
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
            mode={viewMode}
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
          event={item}
          index={index}
          mode={viewMode}
          onPress={() => router.push(`/bucket/${item.bucket_id}` as any)}
        />
      );
    },
    [viewMode, contentFilter, router, currentUserId, likedAlbumIds, savedAlbumIds, toggleAlbumLike, toggleSaveAlbum, albumSaveCounts, albumLikeCounts]
  );

  if (debouncedSearch && debouncedSearch.trim().length >= 2) {
    return (
      <View style={styles.container}>
        {headerElement}
        <FeedSearchResultsView
          query={debouncedSearch}
          isLoading={isSearchLoading}
          tasks={searchResults?.tasks ?? []}
          albums={searchResults?.albums ?? []}
          users={searchResults?.users ?? []}
          viewMode={viewMode}
        />
      </View>
    );
  }

  const loading = isLoading || isAlbumsLoading;

  if (loading && combinedItems.length === 0) {
    if (viewMode === 'gallery') {
      return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 72 }} showsVerticalScrollIndicator={false}>
          {headerElement}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 }}>
            <TaskGallerySkeleton />
            <TaskGallerySkeleton />
            <TaskGallerySkeleton />
            <TaskGallerySkeleton />
          </View>
        </ScrollView>
      );
    }
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 72 }} showsVerticalScrollIndicator={false}>
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
    ? t('saved.empty_albums_title')
    : t('feed.empty_friends_title');
  const emptyMessage = contentFilter === 'albumes'
    ? t('saved.empty_albums_desc')
    : t('feed.empty_friends_desc');

  return (
    <View style={{ flex: 1, minHeight: 1 }}>
    <FlashList
      ref={listRef}
      key={`${viewMode}-${contentFilter}`}
      data={combinedItems}
      extraData={extraData}
      keyExtractor={(item) => `${item._type ?? 'task'}-${item.id}`}
      numColumns={viewMode === 'gallery' ? 2 : 1}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: 72 }}
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
            actionLabel={t('feed.search_people')}
            onAction={onOpenFriends}
          />
        </View>
      }
    />
    </View>
  );
}

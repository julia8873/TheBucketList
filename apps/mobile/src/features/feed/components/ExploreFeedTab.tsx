import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Users, Images, Sparkles, Plus, ShieldCheck } from 'lucide-react-native';
import { EmptyState, Typography, Avatar, gold } from '@bucketlist/ui';
import { FeedCard } from '../../../components/FeedCard';
import { FeedCardSkeleton } from '../../../components/FeedCardSkeleton';
import { TaskGallerySkeleton } from '../../../components/TaskSkeletons';
import { AlbumFeedCard, type AlbumFeedItem } from '../../../components/AlbumFeedCard';
import type { TaskViewMode } from '../../../components/ViewModeSelector';
import type { ContentFilter } from './FeedHeader';
import { styles } from '../styles/feed.styles';
import {
  useUserLikedAlbumIds,
  useToggleAlbumLike,
  useSavedAlbumIds,
  useToggleSaveAlbum,
  useBatchAlbumSaveCounts,
  useBatchAlbumLikeCounts,
  useBatchBucketSaveCounts,
} from '../../../hooks/useSocial';
import { useAuthStore } from '../../../stores/auth.store';
import { useTranslation } from '@bucketlist/shared';
import { useCollections, useCloneCollection, useToggleCollectionLike } from '../../collections/hooks/useCollections';
import { CollectionCard } from '../../collections/components/CollectionCard';
import { CollectionDetailModal } from '../../collections/components/CollectionDetailModal';
import type { CollectionItem } from '../../collections/types';
import { FeedSearchResultsView } from './FeedSearchResultsView';

interface ExploreFeedTabProps {
  headerElement: React.ReactElement;
  debouncedSearch: string;
  isSearchLoading: boolean;
  searchResults?: { tasks: any[]; albums: any[]; users: any[] } | any;
  isExploreLoading: boolean;
  isAlbumsLoading: boolean;
  exploreBuckets: any[];
  exploreAlbums: AlbumFeedItem[];
  contentFilter: ContentFilter;
  onChangeContentFilter?: (f: ContentFilter) => void;
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
  onChangeContentFilter,
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
  const { t } = useTranslation();
  const { user, session } = useAuthStore();
  const currentUserId = user?.id || session?.user?.id;
  const { data: likedAlbumIds } = useUserLikedAlbumIds(currentUserId);
  const toggleAlbumLike = useToggleAlbumLike();
  const { data: savedAlbumIds } = useSavedAlbumIds(currentUserId);
  const toggleSaveAlbum = useToggleSaveAlbum();

  // Colecciones
  const { data: collections = [] } = useCollections();
  const cloneMutation = useCloneCollection();
  const toggleCollectionLike = useToggleCollectionLike();
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const albumIds = useMemo(() => exploreAlbums.map((a) => a.id), [exploreAlbums]);
  const { data: albumSaveCounts } = useBatchAlbumSaveCounts(albumIds);
  const { data: albumLikeCounts } = useBatchAlbumLikeCounts(albumIds);

  const bucketIds = useMemo(() => exploreBuckets.map((b) => b.id).filter(Boolean), [exploreBuckets]);
  const { data: bucketSaveCounts } = useBatchBucketSaveCounts(bucketIds);

  // Combined + filtered list
  const combinedItems = useMemo(() => {
    if (contentFilter === 'colecciones') {
      return collections.map((c) => ({ ...c, _type: 'collection' as const }));
    }

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
  }, [exploreBuckets, exploreAlbums, contentFilter, collections]);

  const extraData = useMemo(
    () => `${likedAlbumIds?.join(',') ?? ''}-${savedAlbumIds?.join(',') ?? ''}-${JSON.stringify(albumSaveCounts ?? {})}-${JSON.stringify(albumLikeCounts ?? {})}-${JSON.stringify(bucketSaveCounts ?? {})}`,
    [likedAlbumIds, savedAlbumIds, albumSaveCounts, albumLikeCounts, bucketSaveCounts]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (item._type === 'collection') {
        return (
          <CollectionCard
            collection={item}
            index={index}
            mode={viewMode}
            onPress={() => {
              setSelectedCollection(item);
              setDetailModalVisible(true);
            }}
            onClone={() => cloneMutation.mutate(item)}
            isCloning={cloneMutation.isPending && (cloneMutation.variables as any)?.id === item.id}
            onToggleLike={() => toggleCollectionLike.mutate(item.id)}
          />
        );
      }

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
          event={{
            id: item.id,
            actor: item.user,
            bucket: item,
            type: 'new_bucket',
            created_at: item.created_at,
          }}
          index={index}
          mode={viewMode}
          saveCount={bucketSaveCounts?.[item.id] ?? 0}
          onPress={() => router.push(`/bucket/${item.id}` as any)}
        />
      );
    },
    [viewMode, contentFilter, router, currentUserId, likedAlbumIds, savedAlbumIds, toggleAlbumLike, toggleSaveAlbum, albumSaveCounts, albumLikeCounts, bucketSaveCounts, cloneMutation, toggleCollectionLike]
  );

  if (debouncedSearch.length >= 2) {
    const tasks = Array.isArray(searchResults) ? [] : (searchResults?.tasks ?? []);
    const albums = Array.isArray(searchResults) ? [] : (searchResults?.albums ?? []);
    const users = Array.isArray(searchResults) ? searchResults : (searchResults?.users ?? []);

    return (
      <View style={styles.container}>
        {headerElement}
        <FeedSearchResultsView
          query={debouncedSearch}
          isLoading={isSearchLoading}
          tasks={tasks}
          albums={albums}
          users={users}
          viewMode={viewMode}
        />
      </View>
    );
  }

  const loading = (isExploreLoading || isAlbumsLoading) && contentFilter !== 'colecciones';
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

  const onEndReached = () => {
    if (contentFilter === 'colecciones') return;
    if (contentFilter !== 'albumes' && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    if (contentFilter !== 'tareas' && hasNextAlbumsPage && !isFetchingNextAlbumsPage) void fetchNextAlbumsPage();
  };

  const isFetchingNext = isFetchingNextPage || isFetchingNextAlbumsPage;

  const emptyTitle = contentFilter === 'colecciones'
    ? t('feed.empty_explore_collections_title')
    : contentFilter === 'albumes'
    ? t('feed.empty_explore_albums_title')
    : t('feed.empty_explore_tasks_title');
  const emptyMessage = contentFilter === 'colecciones'
    ? t('feed.empty_explore_collections_desc')
    : contentFilter === 'albumes'
    ? t('feed.empty_explore_albums_desc')
    : t('feed.empty_explore_tasks_desc');

  return (
    <View style={{ flex: 1 }}>
      <FlashList
        ref={listRef}
        key={`${viewMode}-${contentFilter}`}
        data={combinedItems}
        extraData={extraData}
        keyExtractor={(item) => `${item._type ?? 'task'}-${item.id}`}
        numColumns={viewMode === 'gallery' ? 2 : 1}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 72 }}
        ListHeaderComponent={
          <View>
            {headerElement}
            <Typography variant="h3" style={styles.sectionTitle}>
              {contentFilter === 'colecciones'
                ? t('feed.section_collections')
                : contentFilter === 'albumes'
                ? t('feed.section_albums')
                : t('feed.section_ideas')}
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
              icon={contentFilter === 'colecciones' ? Sparkles : contentFilter === 'albumes' ? Images : Users}
            />
          </View>
        }
      />

      <CollectionDetailModal
        visible={detailModalVisible}
        collection={selectedCollection}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedCollection(null);
        }}
      />
    </View>
  );
}

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { InteractionManager, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@bucketlist/ui';
import { useFeed, useExploreFeed, useFriendsAlbums, useExploreAlbums, useSearchFeed } from '../../src/hooks/useFeed';
import { useIncomingRequestCount } from '../../src/hooks/useFriends';
import { useUnreadCount } from '../../src/hooks/useNotifications';
import { useAuthStore } from '../../src/stores/auth.store';

import { styles } from '../../src/features/feed/styles/feed.styles';
import { FeedHeader, type ContentFilter } from '../../src/features/feed/components/FeedHeader';
import { FriendsFeedTab } from '../../src/features/feed/components/FriendsFeedTab';
import { ExploreFeedTab } from '../../src/features/feed/components/ExploreFeedTab';
import { FeedCardSkeleton } from '../../src/components/FeedCardSkeleton';

import { TaskViewMode } from '../../src/components/ViewModeSelector';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FeedScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ tab?: string; filter?: string }>();

  const [homeTab, setHomeTabState] = useState<'friends' | 'explore'>('friends');
  const setHomeTab = (tab: 'friends' | 'explore') => {
    setHomeTabState(tab);
    if (tab === 'friends' && contentFilter === 'colecciones') {
      setContentFilter('todo');
    }
    void AsyncStorage.setItem('@feed_home_tab', tab).catch(() => undefined);
  };

  const [viewMode, setViewModeState] = useState<TaskViewMode>('list');
  const setViewMode = (mode: TaskViewMode) => {
    setViewModeState(mode);
    void AsyncStorage.setItem('@feed_view_mode', mode).catch(() => undefined);
  };

  const [contentFilter, setContentFilterState] = useState<ContentFilter>('todo');
  const setContentFilter = (f: ContentFilter) => {
    setContentFilterState(f);
    void AsyncStorage.setItem('@feed_content_filter', f).catch(() => undefined);
  };

  useEffect(() => {
    if (params.tab === 'explore' || params.tab === 'friends') {
      setHomeTabState(params.tab);
      void AsyncStorage.setItem('@feed_home_tab', params.tab).catch(() => undefined);
    }
    if (params.filter === 'colecciones' || params.filter === 'todo' || params.filter === 'tareas' || params.filter === 'albumes') {
      setContentFilterState(params.filter as ContentFilter);
      void AsyncStorage.setItem('@feed_content_filter', params.filter).catch(() => undefined);
    }
  }, [params.tab, params.filter]);

  useEffect(() => {
    AsyncStorage.getItem('@feed_home_tab').then((saved) => {
      if (!params.tab && (saved === 'friends' || saved === 'explore')) setHomeTabState(saved);
    }).catch(() => undefined);
    AsyncStorage.getItem('@feed_view_mode').then((saved) => {
      if (saved === 'list' || saved === 'gallery' || saved === 'compact') setViewModeState(saved as TaskViewMode);
    }).catch(() => undefined);
    AsyncStorage.getItem('@feed_content_filter').then((saved) => {
      if (!params.filter && (saved === 'todo' || saved === 'tareas' || saved === 'albumes' || saved === 'colecciones')) {
        if (saved === 'colecciones' && homeTab === 'friends') {
          setContentFilterState('todo');
        } else {
          setContentFilterState(saved as ContentFilter);
        }
      }
    }).catch(() => undefined);
  }, []);

  // La lista (FlashList) se monta cuando la pantalla ya está visible y maquetada. Si se monta
  // durante la transición de la pestaña puede medirse a 0 px y quedar en negro hasta salir y volver.
  const [listReady, setListReady] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (listReady) return;
      const handle = InteractionManager.runAfterInteractions(() => setListReady(true));
      // Red de seguridad: si por lo que sea no llega la señal, se muestra igualmente.
      const timer = setTimeout(() => setListReady(true), 600);
      return () => {
        handle.cancel();
        clearTimeout(timer);
      };
    }, [listReady]),
  );

  const friendsListRef = useRef<any>(null);
  const exploreListRef = useRef<any>(null);

  // Al pulsar de nuevo la pestaña Home en la barra inferior, vuelve al principio de la lista
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      if (homeTab === 'friends') {
        if (friendsListRef.current?.scrollToOffset) {
          friendsListRef.current.scrollToOffset({ offset: 0, animated: true });
        } else if (friendsListRef.current?.scrollToIndex) {
          friendsListRef.current.scrollToIndex({ index: 0, animated: true });
        }
      } else {
        if (exploreListRef.current?.scrollToOffset) {
          exploreListRef.current.scrollToOffset({ offset: 0, animated: true });
        } else if (exploreListRef.current?.scrollToIndex) {
          exploreListRef.current.scrollToIndex({ index: 0, animated: true });
        }
      }
    });
    return unsubscribe;
  }, [navigation, homeTab]);

  // ── Amigos Feed ──────────────────────────────────────────────────────────────
  const feed = useFeed(user?.id);
  const {
    data: friendsData,
    fetchNextPage: fetchNextFriends,
    hasNextPage: hasNextFriends,
    isFetchingNextPage: isFetchingNextFriends,
    isLoading: isFriendsLoading,
    isError: isFriendsError,
    refetch: refetchFriends,
  } = feed;

  const friendsAlbumsFeed = useFriendsAlbums(user?.id);
  const {
    data: friendsAlbumsData,
    fetchNextPage: fetchNextFriendsAlbums,
    hasNextPage: hasNextFriendsAlbums,
    isFetchingNextPage: isFetchingNextFriendsAlbums,
    isLoading: isFriendsAlbumsLoading,
    refetch: refetchFriendsAlbums,
  } = friendsAlbumsFeed;

  const { data: requestCount = 0, refetch: refetchRequests } = useIncomingRequestCount(user?.id);
  const { data: unread = 0 } = useUnreadCount(user?.id);

  const [manualRefreshingFriends, setManualRefreshingFriends] = useState(false);
  const [manualRefreshingExplore, setManualRefreshingExplore] = useState(false);

  const handleRefreshFriends = async () => {
    setManualRefreshingFriends(true);
    try {
      await Promise.all([refetchFriends(), refetchRequests(), refetchFriendsAlbums()]);
    } finally {
      setManualRefreshingFriends(false);
    }
  };

  const handleRefreshExplore = async () => {
    setManualRefreshingExplore(true);
    try {
      await Promise.all([refetchExplore(), refetchExploreAlbums()]);
    } finally {
      setManualRefreshingExplore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void refetchRequests();
    }, [refetchRequests])
  );

  const friendsItems = useMemo(() => {
    const all = friendsData?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const item of all) {
      if (item.actor_id === user?.id || item.bucket?.user_id === user?.id) {
        continue;
      }
      if (item?.bucket_id && !seen.has(item.bucket_id)) {
        seen.add(item.bucket_id);
        unique.push(item);
      }
    }
    return unique;
  }, [friendsData, user?.id]);

  const friendsAlbums = useMemo(() => {
    return friendsAlbumsData?.pages.flatMap((page) => page.items) ?? [];
  }, [friendsAlbumsData]);

  // ── Búsqueda ───────────────────────────────────────────────────────────────
  const [exploreSearch, setExploreSearch] = useState('');
  const [debouncedExploreSearch, setDebouncedExploreSearch] = useState('');

  const [friendsSearch, setFriendsSearch] = useState('');
  const [debouncedFriendsSearch, setDebouncedFriendsSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExploreSearch(exploreSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [exploreSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFriendsSearch(friendsSearch);
    }, 350);
    return () => clearTimeout(timer);
  }, [friendsSearch]);

  const {
    data: exploreData,
    fetchNextPage: fetchNextExplore,
    hasNextPage: hasNextExplore,
    isFetchingNextPage: isFetchingNextExplore,
    isLoading: isExploreLoading,
    refetch: refetchExplore,
  } = useExploreFeed(user?.id);

  const exploreAlbumsFeed = useExploreAlbums(user?.id);
  const {
    data: exploreAlbumsData,
    fetchNextPage: fetchNextExploreAlbums,
    hasNextPage: hasNextExploreAlbums,
    isFetchingNextPage: isFetchingNextExploreAlbums,
    isLoading: isExploreAlbumsLoading,
    refetch: refetchExploreAlbums,
  } = exploreAlbumsFeed;

  const { data: exploreSearchResults, isLoading: isExploreSearchLoading } = useSearchFeed({
    query: debouncedExploreSearch,
    scope: 'explore',
    userId: user?.id,
  });

  const { data: friendsSearchResults, isLoading: isFriendsSearchLoading } = useSearchFeed({
    query: debouncedFriendsSearch,
    scope: 'friends',
    userId: user?.id,
  });

  const exploreBuckets = useMemo(() => {
    return (exploreData?.pages.flatMap((page) => page.items) || []).filter(
      (b: any) => !user?.id || b.user_id !== user.id
    );
  }, [exploreData, user?.id]);

  const exploreAlbums = useMemo(() => {
    return exploreAlbumsData?.pages.flatMap((page) => page.items) ?? [];
  }, [exploreAlbumsData]);

  const openFriends = (tab?: 'requests') =>
    router.push((tab ? `/friends?tab=${tab}` : '/friends') as any);

  const headerElement = (
    <FeedHeader
      homeTab={homeTab}
      onChangeHomeTab={setHomeTab}
      unreadCount={unread}
      requestCount={requestCount}
      onOpenNotifications={() => router.push('/(tabs)/notifications' as any)}
      onOpenFriends={openFriends}
      onOpenMap={() => router.push('/map' as any)}
      exploreSearch={exploreSearch}
      onChangeExploreSearch={setExploreSearch}
      friendsSearch={friendsSearch}
      onChangeFriendsSearch={setFriendsSearch}
      viewMode={viewMode}
      onChangeViewMode={setViewMode}
      contentFilter={contentFilter}
      onChangeContentFilter={setContentFilter}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!listReady ? (
        // Mientras tanto se ve la cabecera con esqueletos (nunca una pantalla en negro)
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 72 }} showsVerticalScrollIndicator={false}>
          {headerElement}
          <FeedCardSkeleton />
          <FeedCardSkeleton />
        </ScrollView>
      ) : homeTab === 'friends' ? (
        <FriendsFeedTab
          headerElement={headerElement}
          isLoading={isFriendsLoading}
          isError={isFriendsError}
          friendsItems={friendsItems}
          friendsAlbums={friendsAlbums}
          isAlbumsLoading={isFriendsAlbumsLoading}
          contentFilter={contentFilter}
          manualRefreshing={manualRefreshingFriends}
          onRefresh={handleRefreshFriends}
          hasNextPage={hasNextFriends}
          isFetchingNextPage={isFetchingNextFriends}
          fetchNextPage={fetchNextFriends}
          hasNextAlbumsPage={hasNextFriendsAlbums}
          isFetchingNextAlbumsPage={isFetchingNextFriendsAlbums}
          fetchNextAlbumsPage={fetchNextFriendsAlbums}
          windowHeight={windowHeight}
          onOpenFriends={() => openFriends()}
          onRetry={() => void refetchFriends()}
          listRef={friendsListRef}
          viewMode={viewMode}
          debouncedSearch={debouncedFriendsSearch}
          isSearchLoading={isFriendsSearchLoading}
          searchResults={friendsSearchResults}
        />
      ) : (
        <ExploreFeedTab
          headerElement={headerElement}
          debouncedSearch={debouncedExploreSearch}
          isSearchLoading={isExploreSearchLoading}
          searchResults={exploreSearchResults}
          isExploreLoading={isExploreLoading}
          isAlbumsLoading={isExploreAlbumsLoading}
          exploreBuckets={exploreBuckets}
          exploreAlbums={exploreAlbums}
          contentFilter={contentFilter}
          onChangeContentFilter={setContentFilter}
          manualRefreshing={manualRefreshingExplore}
          onRefresh={handleRefreshExplore}
          hasNextPage={hasNextExplore}
          isFetchingNextPage={isFetchingNextExplore}
          fetchNextPage={fetchNextExplore}
          hasNextAlbumsPage={hasNextExploreAlbums}
          isFetchingNextAlbumsPage={isFetchingNextExploreAlbums}
          fetchNextAlbumsPage={fetchNextExploreAlbums}
          windowHeight={windowHeight}
          listRef={exploreListRef}
          viewMode={viewMode}
        />
      )}
    </SafeAreaView>
  );
}
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Search, Users, X } from 'lucide-react-native';
import { EmptyState, fontFamily, gold, useTheme, PageTitle, Avatar, radii, spacing, Typography } from '@bucketlist/ui';
import { FeedCard } from '../../src/components/FeedCard';
import { useFeed, useExploreFeed } from '../../src/hooks/useFeed';
import { useSearchUsers } from '../../src/hooks/useSocial';
import { useIncomingRequestCount } from '../../src/hooks/useFriends';
import { useUnreadCount } from '../../src/hooks/useNotifications';
import { useAuthStore } from '../../src/stores/auth.store';

export default function FeedScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { height: windowHeight } = useWindowDimensions();

  const [homeTab, setHomeTab] = useState<'friends' | 'explore'>('friends');

  // ── Amigos Feed ───────────────────────────────────────────────────────────
  const feed = useFeed(user?.id);
  const {
    data: friendsData,
    fetchNextPage: fetchNextFriends,
    hasNextPage: hasNextFriends,
    isFetchingNextPage: isFetchingNextFriends,
    isLoading: isFriendsLoading,
    isError: isFriendsError,
    refetch: refetchFriends,
    isRefetching: isRefetchingFriends,
  } = feed;

  const { data: requestCount = 0, refetch: refetchRequests } = useIncomingRequestCount(user?.id);
  const { data: unread = 0 } = useUnreadCount(user?.id);

  // Al volver a la pestaña, refresca el contador de solicitudes
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

  // ── Explorar Feed ─────────────────────────────────────────────────────────
  const [exploreSearch, setExploreSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(exploreSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [exploreSearch]);

  const {
    data: exploreData,
    fetchNextPage: fetchNextExplore,
    hasNextPage: hasNextExplore,
    isFetchingNextPage: isFetchingNextExplore,
    isLoading: isExploreLoading,
    refetch: refetchExplore,
    isRefetching: isRefetchingExplore,
  } = useExploreFeed(user?.id);

  const { data: searchResults, isLoading: isSearchLoading } = useSearchUsers(debouncedSearch);

  const exploreBuckets = useMemo(() => {
    return (exploreData?.pages.flatMap((page) => page.items) || []).filter(
      (b: any) => !user?.id || b.user_id !== user.id
    );
  }, [exploreData, user?.id]);

  const openFriends = (tab?: 'requests') =>
    router.push((tab ? `/friends?tab=${tab}` : '/friends') as any);

  // ── Encabezado compartido con Segmented Toggle ────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <PageTitle
          gold={homeTab === 'friends' ? 'Momentos' : 'Explorar'}
          rest={homeTab === 'friends' ? 'de amigos' : 'ideas'}
        />
        <View style={styles.topActions}>
          <Pressable
            onPress={() => router.push('/(tabs)/notifications' as any)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <Bell size={24} color="#F2EFE8" strokeWidth={1.8} />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
          <Pressable
            onPress={() => openFriends()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Buscar personas"
          >
            <Users size={24} color="#F2EFE8" strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      {/* Segmented Control: Amigos | Explorar */}
      <View style={styles.toggleContainer}>
        <Pressable
          style={[styles.toggleBtn, homeTab === 'friends' && styles.toggleBtnActive]}
          onPress={() => setHomeTab('friends')}
          accessibilityRole="tab"
          accessibilityState={{ selected: homeTab === 'friends' }}
        >
          <Text style={[styles.toggleText, homeTab === 'friends' && styles.toggleTextActive]}>
            Amigos
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, homeTab === 'explore' && styles.toggleBtnActive]}
          onPress={() => setHomeTab('explore')}
          accessibilityRole="tab"
          accessibilityState={{ selected: homeTab === 'explore' }}
        >
          <Text style={[styles.toggleText, homeTab === 'explore' && styles.toggleTextActive]}>
            Explorar
          </Text>
        </Pressable>
      </View>

      {/* Search Bar según pestaña */}
      {homeTab === 'friends' ? (
        <View style={styles.searchBar}>
          <Pressable
            onPress={() => openFriends()}
            style={styles.searchTouch}
            accessibilityRole="search"
            accessibilityLabel="Buscar personas"
          >
            <Search size={18} color="#9A9A9A" strokeWidth={1.8} />
            <Text style={styles.searchPlaceholder}>Buscar personas</Text>
          </Pressable>
          {requestCount > 0 ? (
            <Pressable onPress={() => openFriends('requests')} hitSlop={8} accessibilityRole="button">
              <Text style={styles.requests}>
                {requestCount} {requestCount === 1 ? 'solicitud' : 'solicitudes'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.exploreSearchContainer}>
          <Search size={18} color="#9A9A9A" strokeWidth={1.8} />
          <TextInput
            placeholder="Buscar personas e ideas..."
            placeholderTextColor="#8F8F8F"
            value={exploreSearch}
            onChangeText={setExploreSearch}
            style={styles.exploreSearchInput}
            returnKeyType="search"
          />
          {exploreSearch.length > 0 && (
            <Pressable onPress={() => setExploreSearch('')} hitSlop={8}>
              <X size={18} color="#8F8F8F" strokeWidth={2} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {homeTab === 'friends' ? (
        // ── PESTAÑA: MOMENTOS DE AMIGOS ──────────────────────────────────────
        isFriendsLoading ? (
          <View style={[styles.container, styles.center]}>
            {renderHeader()}
            <ActivityIndicator size="large" color={gold[400]} style={{ marginTop: 60 }} />
          </View>
        ) : isFriendsError ? (
          <View style={styles.container}>
            {renderHeader()}
            <EmptyState
              title="No se pudo cargar el feed"
              message="Revisa tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => void refetchFriends()}
            />
          </View>
        ) : (
          <FlashList
            data={friendsItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <FeedCard event={item} index={index} onPress={() => router.push(`/bucket/${item.bucket_id}` as any)} />
            )}
            estimatedItemSize={430}
            ListHeaderComponent={renderHeader()}
            refreshing={isRefetchingFriends && !isFetchingNextFriends}
            onRefresh={() => {
              void refetchFriends();
              void refetchRequests();
            }}
            onEndReached={() => {
              if (hasNextFriends && !isFetchingNextFriends) void fetchNextFriends();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingNextFriends ? <ActivityIndicator style={styles.footer} color={gold[400]} /> : null}
            ListEmptyComponent={
              <View style={[styles.emptyWrap, { minHeight: windowHeight * 0.45 }]}>
                <EmptyState
                  title="Tu feed está tranquilo"
                  message="Sigue a tus amigos para ver aquí los momentos que completan."
                  icon={Users}
                  actionLabel="Buscar personas"
                  onAction={() => openFriends()}
                />
              </View>
            }
          />
        )
      ) : (
        // ── PESTAÑA: EXPLORAR ──────────────────────────────────────────────
        debouncedSearch.length >= 2 ? (
          <View style={styles.container}>
            {renderHeader()}
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
                  <Typography variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: 40 }}>
                    No se encontraron usuarios.
                  </Typography>
                }
              />
            )}
          </View>
        ) : isExploreLoading ? (
          <View style={[styles.container, styles.center]}>
            {renderHeader()}
            <ActivityIndicator size="large" color={gold[400]} style={{ marginTop: 60 }} />
          </View>
        ) : (
          <FlashList
            data={exploreBuckets}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <FeedCard
                event={{ actor: item.user, bucket: item, type: 'new_bucket', created_at: item.created_at }}
                index={index}
                onPress={() => router.push(`/bucket/${item.id}` as any)}
              />
            )}
            estimatedItemSize={300}
            ListHeaderComponent={
              <View>
                {renderHeader()}
                <Typography variant="h3" style={styles.sectionTitle}>
                  Ideas para empezar
                </Typography>
              </View>
            }
            refreshing={isRefetchingExplore && !isFetchingNextExplore}
            onRefresh={() => void refetchExplore()}
            onEndReached={() => {
              if (hasNextExplore && !isFetchingNextExplore) void fetchNextExplore();
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isFetchingNextExplore ? <ActivityIndicator style={styles.footer} color={gold[400]} /> : null}
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
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerWrapper: {
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  bellDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: gold[400],
    borderWidth: 1.5,
    borderColor: '#0E0E0E',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 999,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#262626',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#D4B13A',
  },
  toggleText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: '#8A8A8A',
  },
  toggleTextActive: {
    fontFamily: fontFamily.semibold,
    color: '#0E0E0E',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
  },
  searchTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: '100%',
  },
  searchPlaceholder: { flex: 1, fontFamily: fontFamily.regular, fontSize: 14, color: '#9A9A9A' },
  requests: { fontFamily: fontFamily.semibold, fontSize: 13, color: gold[400] },
  exploreSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
  },
  exploreSearchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: '#F2EFE8',
    padding: 0,
  },
  sectionTitle: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  footer: { padding: 16 },
  emptyWrap: {
    marginTop: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#262626',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
});
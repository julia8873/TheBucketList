import React, { useMemo, useState, useEffect, useRef } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Settings, Users } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';
import {
  Avatar,
  EmptyState,
  PageTitle,
  SectionLabel,
  SegmentedControl,
  fontFamily,
  useTheme,
} from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useIncomingRequestCount } from '../../src/hooks/useFriends';
import { useUserFavorites, useToggleFavoriteAlbum } from '../../src/hooks/useFavorites';
import { ProfileSkeleton, TaskRowSkeleton } from '../../src/components/TaskSkeletons';
import { PublicTaskRow } from '../../src/components/PublicTaskRow';
import { ViewModeSelector, TaskViewMode } from '../../src/components/ViewModeSelector';
import { ProfileAlbumsTab, type AlbumFilter } from '../../src/features/public-profile/components/ProfileAlbumsTab';
import { ProfileTaskFilterButton } from '../../src/features/public-profile/components/ProfileTaskFilterButton';
import { usePublicProfileData } from '../../src/features/public-profile/hooks/usePublicProfileData';
import { initialsOf, displayNameOf } from '../../src/utils/initials';
import { OfficialBadge } from '../../src/components/OfficialBadge';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';

type Filter = 'all' | 'active' | 'completed';

export default function CurrentUserProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = useIsAdmin();

  const flatListRef = useRef<FlatList>(null);

  // Al pulsar el icono de pestaña en la barra inferior, vuelve al principio
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  const [activeTab, setActiveTabState] = useState<'list' | 'albums'>('list');
  const setActiveTab = (tab: 'list' | 'albums') => {
    setActiveTabState(tab);
    void AsyncStorage.setItem('@my_profile_tab', tab).catch(() => undefined);
  };

  const [filter, setFilterState] = useState<Filter>('all');
  const setFilter = (f: Filter) => {
    setFilterState(f);
    void AsyncStorage.setItem('@my_profile_filter', f).catch(() => undefined);
  };

  const [albumFilter, setAlbumFilterState] = useState<AlbumFilter>('all');
  const setAlbumFilter = (af: AlbumFilter) => {
    setAlbumFilterState(af);
    void AsyncStorage.setItem('@my_profile_album_filter', af).catch(() => undefined);
  };

  const [taskViewMode, setTaskViewModeState] = useState<TaskViewMode>('list');
  const setTaskViewMode = (mode: TaskViewMode) => {
    setTaskViewModeState(mode);
    void AsyncStorage.setItem('@my_profile_view_mode', mode).catch(() => undefined);
  };

  const [albumViewMode, setAlbumViewModeState] = useState<TaskViewMode>('gallery');
  const setAlbumViewMode = (mode: TaskViewMode) => {
    setAlbumViewModeState(mode);
    void AsyncStorage.setItem('@my_profile_album_view_mode', mode).catch(() => undefined);
  };

  useEffect(() => {
    AsyncStorage.getItem('@my_profile_tab')
      .then((saved) => {
        if (saved === 'list' || saved === 'albums') setActiveTabState(saved);
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_profile_view_mode')
      .then((saved) => {
        if (saved === 'list' || saved === 'gallery' || saved === 'compact') {
          setTaskViewModeState(saved as TaskViewMode);
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_profile_album_view_mode')
      .then((saved) => {
        if (saved === 'list' || saved === 'gallery' || saved === 'compact') {
          setAlbumViewModeState(saved as TaskViewMode);
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_profile_filter')
      .then((saved) => {
        if (saved && ['all', 'active', 'completed'].includes(saved)) {
          setFilterState(saved as Filter);
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@my_profile_album_filter')
      .then((saved) => {
        if (saved && ['all', 'active', 'completed', 'closed'].includes(saved)) {
          setAlbumFilterState(saved as AlbumFilter);
        }
      })
      .catch(() => undefined);
  }, []);

  const requests = useIncomingRequestCount(user?.id);
  const { isAlbumFavorite, isBucketFavorite } = useUserFavorites(user?.id);
  const toggleFavoriteAlbum = useToggleFavoriteAlbum();

  const {
    profile,
    profileLoading,
    buckets: publicBuckets,
    bucketsLoading,
    publicAlbums,
    albumsLoading,
    refetch: refetchPublicData,
  } = usePublicProfileData({
    id: user?.id,
    isOwnProfile: true,
    isLocked: false,
    followStatus: 'accepted',
    publicOnly: true,
  });

  const [manualRefreshing, setManualRefreshing] = useState(false);
  const onRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([refetchPublicData(), requests.refetch()]);
    } finally {
      setManualRefreshing(false);
    }
  };

  const requestCount = requests.data ?? 0;
  const name = displayNameOf(profile);

  const completedBuckets = useMemo(
    () => (publicBuckets ?? []).filter((b: any) => b.status === 'completed'),
    [publicBuckets]
  );

  const filteredTasks = useMemo(() => {
    const list = publicBuckets ?? [];
    let res = list;
    if (filter === 'completed') res = list.filter((b: any) => b.status === 'completed');
    else if (filter === 'active') res = list.filter((b: any) => b.status === 'pending' || b.status === 'in_progress');

    // Favoritos primero
    return [...res].sort((a: any, b: any) => {
      const favA = isBucketFavorite(a.id) ? 1 : 0;
      const favB = isBucketFavorite(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return 0;
    });
  }, [publicBuckets, filter, isBucketFavorite]);

  const filteredAlbums = useMemo(() => {
    const list = publicAlbums ?? [];
    let res = list;
    if (albumFilter === 'closed') res = list.filter((a) => a.is_closed);
    else if (albumFilter === 'completed') {
      res = list.filter((a) => !a.is_closed && a.total_tasks > 0 && a.completed_tasks >= a.total_tasks);
    } else if (albumFilter === 'active') {
      res = list.filter((a) => !a.is_closed && (a.total_tasks === 0 || a.completed_tasks < a.total_tasks));
    }

    // Favoritos primero
    return [...res].sort((a, b) => {
      const favA = isAlbumFavorite(a.id) ? 1 : 0;
      const favB = isAlbumFavorite(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return 0;
    });
  }, [publicAlbums, albumFilter, isAlbumFavorite]);

  const taskCount = publicBuckets?.length ?? 0;

  const headerTop = (
    <View style={[styles.header, { paddingHorizontal: 0 }]}>
      <PageTitle gold={t('profile.title_gold', { defaultValue: 'Mi' })} rest={t('profile.title_rest', { defaultValue: 'perfil' })} />
      <Pressable
        onPress={() => router.push('/(modals)/settings' as any)}
        accessibilityRole="button"
        accessibilityLabel={t('settings.title')}
        style={[styles.roundBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        <Settings size={22} color={theme.colors.foreground} />
      </Pressable>
    </View>
  );

  const header = (
    <View>
      {headerTop}

      {/* Identidad */}
      <View style={styles.identity}>
        <Avatar uri={profile?.avatar_url} initials={initialsOf(profile)} size="xl" goldRing />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={2} ellipsizeMode="tail">
              {name}
            </Text>
            {isAdmin && <OfficialBadge size="sm" />}
          </View>
          <Text style={[styles.handle, { color: theme.colors.foregroundMuted }]} numberOfLines={1} ellipsizeMode="tail">
            @{profile?.username}
          </Text>
        </View>
      </View>

      {profile?.bio ? (
        <Text style={[styles.bio, { color: theme.colors.foreground }]}>{profile.bio}</Text>
      ) : null}

      {/* Acciones */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push('/(modals)/edit-profile' as any)}
          accessibilityRole="button"
          style={[styles.btn, { borderColor: theme.colors.primary, borderWidth: 1 }]}
        >
          <Text style={[styles.btnText, { color: theme.colors.primary }]}>{t('profile.edit')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push((requestCount > 0 ? '/friends?tab=requests' : '/friends') as any)}
          accessibilityRole="button"
          style={[styles.btn, { backgroundColor: theme.colors.primary, flexDirection: 'row', gap: 8 }]}
        >
          <Users size={18} color={theme.colors.primaryForeground} />
          <Text style={[styles.btnText, { color: theme.colors.primaryForeground }]}>
            {requestCount > 0 ? `${t('profile.friends')} · ${requestCount}` : t('profile.friends')}
          </Text>
        </Pressable>
      </View>

      {/* Estadísticas */}
      <View style={[styles.stats, { borderColor: theme.colors.border }]}>
        <Stat
          value={completedBuckets.length}
          label={t('profile.completed_items')}
          onPress={() => {
            setActiveTab('list');
            setFilter('completed');
          }}
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <Stat
          value={taskCount}
          label={t('profile.stat_public')}
          onPress={() => {
            setActiveTab('list');
            setFilter('all');
          }}
        />
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <Stat
          value={publicAlbums?.length ?? 0}
          label={t('profile.albums')}
          onPress={() => {
            setActiveTab('albums');
            setAlbumFilter('all');
          }}
        />
      </View>

      {/* Tabs: Lista vs Álbumes */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={[
            { key: 'list', label: t('profile.tab_list') },
            { key: 'albums', label: t('profile.tab_albums') },
          ]}
          selected={activeTab}
          onChange={(val) => setActiveTab(val as 'list' | 'albums')}
        />
      </View>

      {activeTab === 'list' ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionLabel highlight={t('common.tasks')} rest={` ${t('common.public').toLowerCase()} · ${taskCount}`} style={styles.sectionLabel} />
            <ViewModeSelector mode={taskViewMode} onChange={setTaskViewMode} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: 16 }}>
            <ProfileTaskFilterButton filter={filter} onChangeFilter={setFilter} />
          </View>
        </>
      ) : (
        <ProfileAlbumsTab
          totalCount={publicAlbums?.length ?? 0}
          albumFilter={albumFilter}
          onChangeFilter={setAlbumFilter}
          albumViewMode={albumViewMode}
          onChangeViewMode={setAlbumViewMode}
          albumsLoading={albumsLoading}
          filteredAlbums={filteredAlbums}
          isAlbumFavorite={isAlbumFavorite}
          onToggleFavoriteAlbum={(albumId, isFav) =>
            toggleFavoriteAlbum.mutate({ albumId, currentlyFavorite: isFav })
          }
          hasUser={!!user}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {profileLoading ? (
        <View style={styles.listContent}>
          {headerTop}
          <ProfileSkeleton />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          key={`${activeTab}-${activeTab === 'list' ? taskViewMode : albumViewMode}`}
          refreshControl={<RefreshControl refreshing={manualRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          data={activeTab === 'list' ? filteredTasks : []}
          keyExtractor={(item: any) => item.id}
          numColumns={taskViewMode === 'gallery' ? 2 : 1}
          columnWrapperStyle={taskViewMode === 'gallery' ? { gap: 12 } : undefined}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: taskViewMode === 'compact' ? 8 : 12 }} />}
          renderItem={({ item }) => (
            <PublicTaskRow
              bucket={item}
              isOwnProfile={true}
              isFavorite={isBucketFavorite(item.id)}
              mode={taskViewMode}
              onPress={() => router.push(`/bucket/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            activeTab !== 'list' ? null : bucketsLoading ? (
              <View style={{ gap: 10, marginTop: 12, paddingHorizontal: 20 }}>
                <TaskRowSkeleton />
                <TaskRowSkeleton />
                <TaskRowSkeleton />
              </View>
            ) : (
              <Text style={styles.empty}>
                {filter === 'all'
                  ? 'Todavía no hay tareas públicas que mostrar.'
                  : 'No hay tareas públicas en este filtro.'}
              </Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

function Stat({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const { theme } = useTheme();
  const content = (
    <>
      <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.foregroundMuted }]}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [styles.stat, pressed && { opacity: 0.65 }]}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.stat}>{content}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 20 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 },
  name: { fontFamily: fontFamily.serifBold, fontSize: 19, lineHeight: 24 },
  handle: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 2 },
  bio: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, marginTop: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { flex: 1, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fontFamily.semibold, fontSize: 15 },
  stats: { flexDirection: 'row', alignItems: 'center', marginTop: 22, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fontFamily.serifBold, fontSize: 24 },
  statLabel: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 2 },
  divider: { width: 1, height: 38 },
  tabsContainer: { marginTop: 20, marginBottom: 4 },
  sectionLabel: { marginTop: 20 },
  filters: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 16, flexWrap: 'wrap' },
  empty: { fontFamily: fontFamily.regular, fontSize: 14, color: '#9A9A9A', textAlign: 'center', marginTop: 24 },
});
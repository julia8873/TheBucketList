import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreHorizontal } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import {
  EmptyState,
  FilterChip,
  SectionLabel,
  SegmentedControl,
  useTheme,
  toast,
} from '@bucketlist/ui';
import { useAuthStore } from '../../src/stores/auth.store';
import { usePullToRefresh } from '../../src/hooks/useAutoRefresh';
import { useProfileStats } from '../../src/hooks/useFriends';
import { useFollowUser, useUnfollowUser } from '../../src/hooks/useSocial';
import { useUserFavorites, useToggleFavoriteAlbum } from '../../src/hooks/useFavorites';
import { ProfileSkeleton, TaskRowSkeleton } from '../../src/components/TaskSkeletons';
import { PublicTaskRow } from '../../src/components/PublicTaskRow';
import { ViewModeSelector, TaskViewMode } from '../../src/components/ViewModeSelector';
import { displayNameOf } from '../../src/utils/initials';

import { styles } from '../../src/features/public-profile/styles/profile.styles';
import { usePublicProfileData } from '../../src/features/public-profile/hooks/usePublicProfileData';
import { ProfileBioAndStats } from '../../src/features/public-profile/components/ProfileBioAndStats';
import { ProfileLockedState } from '../../src/features/public-profile/components/ProfileLockedState';
import { ProfileAlbumsTab, type AlbumFilter } from '../../src/features/public-profile/components/ProfileAlbumsTab';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Filter = 'all' | 'active' | 'completed';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { refreshing, onRefresh } = usePullToRefresh();
  const [activeTab, setActiveTabState] = useState<'list' | 'albums'>('list');
  const setActiveTab = (tab: 'list' | 'albums') => {
    setActiveTabState(tab);
    void AsyncStorage.setItem('@public_profile_tab', tab).catch(() => undefined);
  };

  const [filter, setFilterState] = useState<Filter>('all');
  const setFilter = (f: Filter) => {
    setFilterState(f);
    void AsyncStorage.setItem('@public_profile_filter', f).catch(() => undefined);
  };

  const [albumFilter, setAlbumFilterState] = useState<AlbumFilter>('all');
  const setAlbumFilter = (af: AlbumFilter) => {
    setAlbumFilterState(af);
    void AsyncStorage.setItem('@public_profile_album_filter', af).catch(() => undefined);
  };

  const [taskViewMode, setTaskViewModeState] = useState<TaskViewMode>('list');
  const setTaskViewMode = (mode: TaskViewMode) => {
    setTaskViewModeState(mode);
    void AsyncStorage.setItem('@public_profile_view_mode', mode).catch(() => undefined);
  };

  useEffect(() => {
    AsyncStorage.getItem('@public_profile_tab')
      .then((saved) => {
        if (saved === 'list' || saved === 'albums') setActiveTabState(saved);
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@public_profile_view_mode')
      .then((saved) => {
        if (saved === 'list' || saved === 'gallery' || saved === 'compact') {
          setTaskViewModeState(saved as TaskViewMode);
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@public_profile_filter')
      .then((saved) => {
        if (saved && ['all', 'active', 'completed'].includes(saved)) {
          setFilterState(saved as Filter);
        }
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@public_profile_album_filter')
      .then((saved) => {
        if (saved && ['all', 'active', 'completed', 'closed'].includes(saved)) {
          setAlbumFilterState(saved as AlbumFilter);
        }
      })
      .catch(() => undefined);
  }, []);

  const isOwnProfile = !!user && user.id === id;

  useEffect(() => {
    if (user && id && user.id === id) {
      router.replace('/(tabs)/profile' as any);
    }
  }, [user, id, router]);

  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const { isAlbumFavorite, isBucketFavorite } = useUserFavorites(user?.id);
  const toggleFavoriteAlbum = useToggleFavoriteAlbum();

  const { data: stats, isLoading: statsLoading } = useProfileStats(id);
  const followStatus = stats?.follow_status ?? 'none';
  const {
    profile,
    profileLoading,
    buckets,
    bucketsLoading,
    publicAlbums,
    albumsLoading,
  } = usePublicProfileData({
    id,
    isOwnProfile,
    isLocked: !isOwnProfile && !!stats?.is_locked,
    followStatus,
  });

  const isPrivate = profile?.visibility === 'private';
  const isLocked = !isOwnProfile && (!!stats?.is_locked || (isPrivate && followStatus !== 'accepted'));

  const filtered = useMemo(() => {
    const list = buckets ?? [];
    let res = list;
    if (filter === 'completed') res = list.filter((b: any) => b.status === 'completed');
    else if (filter === 'active') res = list.filter((b: any) => b.status === 'pending' || b.status === 'in_progress');
    return [...res].sort((a: any, b: any) => {
      const favA = isBucketFavorite(a.id) ? 1 : 0;
      const favB = isBucketFavorite(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return 0;
    });
  }, [buckets, filter, isBucketFavorite]);

  const filteredAlbums = useMemo(() => {
    const list = publicAlbums ?? [];
    let res = list;
    if (albumFilter === 'closed') res = list.filter((a) => a.is_closed);
    else if (albumFilter === 'completed') {
      res = list.filter((a) => !a.is_closed && a.total_tasks > 0 && a.completed_tasks >= a.total_tasks);
    } else if (albumFilter === 'active') {
      res = list.filter((a) => !a.is_closed && (a.total_tasks === 0 || a.completed_tasks < a.total_tasks));
    }
    return [...res].sort((a, b) => {
      const favA = isAlbumFavorite(a.id) ? 1 : 0;
      const favB = isAlbumFavorite(b.id) ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return 0;
    });
  }, [publicAlbums, albumFilter, isAlbumFavorite]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed' as any));

  const doFollow = () => {
    if (!user || !id) return;
    const vars = { followerId: user.id, followingId: id, targetIsPrivate: isPrivate };
    const fail = (error: any) => Alert.alert('No se pudo completar', error?.message ?? 'Inténtalo de nuevo.');

    if (followStatus === 'accepted') {
      Alert.alert(`¿Dejar de seguir a ${displayNameOf(profile)}?`, undefined, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Dejar de seguir', style: 'destructive', onPress: () => unfollowUser.mutate(vars, { onError: fail }) },
      ]);
    } else if (followStatus === 'pending') {
      unfollowUser.mutate(vars, { onError: fail });
    } else {
      followUser.mutate(vars, { onError: fail });
    }
  };

  const openMenu = async () => {
    if (!profile) return;
    try {
      const shareUrl = `https://thebucketlist.app/profile/${profile.username || id}`;
      await Clipboard.setStringAsync(shareUrl);
      toast.show({
        type: 'info',
        title: displayNameOf(profile),
        message: 'Enlace al perfil copiado al portapapeles',
      });
    } catch {
      toast.show({
        type: 'info',
        title: displayNameOf(profile),
        message: `@${profile.username ?? ''}`,
      });
    }
  };

  if (profileLoading || statsLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            style={[styles.circleButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <ChevronLeft size={22} color={theme.colors.foreground} strokeWidth={2} />
          </Pressable>
        </View>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            style={[styles.circleButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <ChevronLeft size={22} color={theme.colors.foreground} strokeWidth={2} />
          </Pressable>
        </View>
        <EmptyState title="Usuario no encontrado" message="Puede que este perfil ya no exista." />
      </SafeAreaView>
    );
  }

  const taskCount = buckets ? buckets.length : (stats?.public_count ?? 0);
  const completedCount = buckets
    ? buckets.filter((b: any) => b.status === 'completed').length
    : (stats?.completed_count ?? 0);

  const header = (
    <View>
      <ProfileBioAndStats
        profile={profile}
        isOwnProfile={isOwnProfile}
        isPrivate={isPrivate}
        followStatus={followStatus}
        isFollowPending={followUser.isPending || unfollowUser.isPending}
        onFollow={doFollow}
        onEditProfile={() => router.push('/(modals)/edit-profile' as any)}
        completedCount={completedCount}
        taskCount={taskCount}
        followersCount={stats?.followers_count ?? 0}
        isLocked={isLocked}
        onPressCompleted={() => {
          if (!isLocked) {
            setActiveTab('list');
            setFilter('completed');
          }
        }}
        onPressPublic={() => {
          if (!isLocked) {
            setActiveTab('list');
            setFilter('all');
          }
        }}
        onPressFollowers={() => {
          if (!isLocked) {
            router.push({
              pathname: '/friends',
              params: { userId: id, kind: 'followers' },
            } as any);
          }
        }}
      />

      {isLocked ? (
        <ProfileLockedState profile={profile} followStatus={followStatus} />
      ) : (
        <>
          <View style={styles.tabsContainer}>
            <SegmentedControl
              options={[
                { key: 'list', label: 'Lista' },
                { key: 'albums', label: 'Álbumes' },
              ]}
              selected={activeTab}
              onChange={(val) => setActiveTab(val as 'list' | 'albums')}
            />
          </View>

          {activeTab === 'list' ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionLabel highlight="Tareas" rest={`públicas · ${taskCount}`} style={styles.sectionLabel} />
                <ViewModeSelector mode={taskViewMode} onChange={setTaskViewMode} />
              </View>
              <View style={styles.filters}>
                <FilterChip label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
                <FilterChip label="En curso" active={filter === 'active'} onPress={() => setFilter('active')} />
                <FilterChip label="Completadas" active={filter === 'completed'} onPress={() => setFilter('completed')} />
              </View>
            </>
          ) : (
            <ProfileAlbumsTab
              totalCount={publicAlbums?.length ?? 0}
              albumFilter={albumFilter}
              onChangeFilter={setAlbumFilter}
              albumsLoading={albumsLoading}
              filteredAlbums={filteredAlbums}
              isAlbumFavorite={isAlbumFavorite}
              onToggleFavoriteAlbum={(albumId, isFav) =>
                toggleFavoriteAlbum.mutate({ albumId, currentlyFavorite: isFav })
              }
              hasUser={!!user}
            />
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          style={[styles.circleButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft size={22} color={theme.colors.foreground} strokeWidth={2} />
        </Pressable>
        {!isOwnProfile ? (
          <Pressable
            onPress={openMenu}
            style={[styles.circleButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
          >
            <MoreHorizontal size={22} color={theme.colors.foreground} strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={[styles.circleButton, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />
        )}
      </View>

      <FlatList
        key={taskViewMode}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        data={isLocked || activeTab !== 'list' ? [] : filtered}
        keyExtractor={(item: any) => item.id}
        numColumns={taskViewMode === 'gallery' ? 2 : 1}
        columnWrapperStyle={taskViewMode === 'gallery' ? { gap: 12 } : undefined}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: taskViewMode === 'compact' ? 8 : 12 }} />}
        renderItem={({ item }) => (
          <PublicTaskRow
            bucket={item}
            isOwnProfile={isOwnProfile}
            isFavorite={isBucketFavorite(item.id)}
            mode={taskViewMode}
            onPress={() => router.push(`/bucket/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          isLocked || activeTab !== 'list' ? null : bucketsLoading ? (
            <View style={{ gap: 10, marginTop: 12 }}>
              <TaskRowSkeleton />
              <TaskRowSkeleton />
              <TaskRowSkeleton />
            </View>
          ) : (
            <Text style={styles.empty}>
              {filter === 'all' ? 'Todavía no hay tareas que mostrar.' : 'No hay tareas en este filtro.'}
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

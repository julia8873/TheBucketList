import { Alert } from '@bucketlist/ui';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreHorizontal, UserX } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import {
  EmptyState,
  SectionLabel,
  SegmentedControl,
  useTheme,
  confirm,
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
import { ProfileTaskFilterButton } from '../../src/features/public-profile/components/ProfileTaskFilterButton';
import { UserProfileOptionsSheet } from '../../src/features/public-profile/components/UserProfileOptionsSheet';
import { ReportUserModal } from '../../src/features/public-profile/components/ReportUserModal';
import { BlockedByState } from '../../src/features/public-profile/components/BlockedByState';
import {
  useIsUserBlocked,
  useIsUserBlockedBy,
  useBlockerProfile,
  useBlockUser,
  useUnblockUser,
  useReportUser,
  useAdminDeleteUser,
} from '../../src/hooks/useBlockReport';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
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

  const [albumViewMode, setAlbumViewModeState] = useState<TaskViewMode>('gallery');
  const setAlbumViewMode = (mode: TaskViewMode) => {
    setAlbumViewModeState(mode);
    void AsyncStorage.setItem('@public_profile_album_view_mode', mode).catch(() => undefined);
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
    AsyncStorage.getItem('@public_profile_album_view_mode')
      .then((saved) => {
        if (saved === 'list' || saved === 'gallery' || saved === 'compact') {
          setAlbumViewModeState(saved as TaskViewMode);
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

  const { data: isBlocked } = useIsUserBlocked(id);
  // ¿Me ha bloqueado este usuario? (los administradores nunca están bloqueados: ven el perfil siempre)
  const { data: isBlockedBy, isLoading: blockedByLoading } = useIsUserBlockedBy(id);
  const { data: blockerProfile } = useBlockerProfile(id, Boolean(isBlockedBy));
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const reportMutation = useReportUser();

  const { data: stats, isLoading: statsLoading } = useProfileStats(id);
  const followStatus = stats?.follow_status ?? 'none';
  const isAdmin = useIsAdmin();
  const adminDeleteMutation = useAdminDeleteUser();
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
    isBlocked: Boolean(isBlocked),
    followStatus,
  });

  const isPrivate = profile?.visibility === 'private';
  const isLocked = !isOwnProfile && (!!stats?.is_locked || (isPrivate && followStatus !== 'accepted'));

  const filtered = useMemo(() => {
    if (isBlocked) return [];
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
  }, [buckets, filter, isBucketFavorite, isBlocked]);

  const filteredAlbums = useMemo(() => {
    if (isBlocked) return [];
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
  }, [publicAlbums, albumFilter, isAlbumFavorite, isBlocked]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed' as any));

  const [optionsSheetVisible, setOptionsSheetVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const openMenu = () => {
    setOptionsSheetVisible(true);
  };

  const handleConfirmUnblock = async () => {
    if (!profile) return;
    const confirmed = await confirm.ask({
      title: `¿Desbloquear a @${profile.username}?`,
      message: 'Podrá volver a ver tus publicaciones públicas y seguirte.',
      confirmLabel: 'Desbloquear',
      cancelLabel: 'Cancelar',
    });
    if (confirmed) {
      unblockMutation.mutate(id);
    }
  };

  const handleConfirmBlock = async () => {
    if (!profile) return;
    const confirmed = await confirm.ask({
      title: `¿Bloquear a @${profile.username}?`,
      message: 'Ya no podrá ver tus publicaciones, seguirte ni enviarte mensajes, y sus contenidos se ocultarán.',
      confirmLabel: 'Bloquear',
      cancelLabel: 'Cancelar',
      destructive: true,
    });
    if (confirmed) {
      blockMutation.mutate(id);
    }
  };

  const doFollow = async () => {
    if (!user || !id) return;
    if (isBlocked) {
      await handleConfirmUnblock();
      return;
    }

    const vars = { followerId: user.id, followingId: id, targetIsPrivate: isPrivate };
    const fail = (error: any) => Alert.alert('No se pudo completar', error?.message ?? 'Inténtalo de nuevo.');

    if (followStatus === 'accepted') {
      const confirmed = await confirm.ask({
        title: `¿Dejar de seguir a ${displayNameOf(profile)}?`,
        confirmLabel: 'Dejar de seguir',
        cancelLabel: 'Cancelar',
        destructive: true,
      });
      if (confirmed) {
        unfollowUser.mutate(vars, { onError: fail });
      }
    } else if (followStatus === 'pending') {
      unfollowUser.mutate(vars, { onError: fail });
    } else {
      followUser.mutate(vars, { onError: fail });
    }
  };

  const handleSubmitReport = async (reason: string, details?: string) => {
    await reportMutation.mutateAsync({
      reportedUserId: id,
      reason,
      details,
    });
  };

  if (blockedByLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  // Quien ha bloqueado al usuario actual:
  // - Usuario normal: ve su identidad, sin acceso al perfil.
  // - Admin: ve el aviso de bloqueo + puede eliminar la cuenta.
  if (isBlockedBy) {
    return (
      <BlockedByState
        profile={profile ?? blockerProfile}
        onBack={goBack}
        isAdmin={isAdmin}
        onAdminDeleteUser={
          isAdmin
            ? () => adminDeleteMutation.mutate(id)
            : undefined
        }
        isDeleting={adminDeleteMutation.isPending}
      />
    );
  }

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
        isBlocked={Boolean(isBlocked)}
        onPressCompleted={() => {
          if (!isLocked && !isBlocked) {
            setActiveTab('list');
            setFilter('completed');
          }
        }}
        onPressPublic={() => {
          if (!isLocked && !isBlocked) {
            setActiveTab('list');
            setFilter('all');
          }
        }}
        onPressFollowers={() => {
          if (!isLocked && !isBlocked) {
            router.push({
              pathname: '/friends',
              params: { userId: id, kind: 'followers' },
            } as any);
          }
        }}
      />

      {isBlocked ? (
        <View style={styles.blockedNotice}>
          <View style={styles.blockedNoticeIcon}>
            <UserX size={26} color={theme.colors.error} strokeWidth={2} />
          </View>
          <Text style={[styles.blockedNoticeTitle, { color: theme.colors.foreground }]}>
            Has bloqueado a este usuario
          </Text>
          <Text style={[styles.blockedNoticeText, { color: theme.colors.foregroundMuted }]}>
            Sus tareas y álbumes están ocultos. Pulsa en "Bloqueado" si deseas desbloquear a este perfil.
          </Text>
        </View>
      ) : isLocked ? (
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
        key={`${activeTab}-${activeTab === 'list' ? taskViewMode : albumViewMode}`}
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        data={isBlocked || isLocked || activeTab !== 'list' ? [] : filtered}
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
          isBlocked || isLocked || activeTab !== 'list' ? null : bucketsLoading ? (
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

      {profile && (
        <>
          <UserProfileOptionsSheet
            visible={optionsSheetVisible}
            onClose={() => setOptionsSheetVisible(false)}
            user={{
              id,
              username: profile.username,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
            }}
            isBlocked={Boolean(isBlocked)}
            onConfirmBlock={handleConfirmBlock}
            onConfirmUnblock={handleConfirmUnblock}
            onOpenReport={() => setReportModalVisible(true)}
          />

          <ReportUserModal
            visible={reportModalVisible}
            onClose={() => setReportModalVisible(false)}
            username={profile.username}
            onSubmit={handleSubmitReport}
            isLoading={reportMutation.isPending}
          />
        </>
      )}
    </SafeAreaView>
  );
}

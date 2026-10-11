import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Lock, MoreHorizontal } from 'lucide-react-native';
import {
  Avatar,
  EmptyState,
  FilterChip,
  SectionLabel,
  SegmentedControl,
  AlbumCard,
  fontFamily,
  gold,
  useTheme,
} from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useProfileStats } from '../../src/hooks/useFriends';
import { useFollowUser, useUnfollowUser } from '../../src/hooks/useSocial';
import { useUserFavorites, useToggleFavoriteAlbum } from '../../src/hooks/useFavorites';
import type { AlbumWithProgress } from '../../src/hooks/useAlbums';
import { FollowButton } from '../../src/components/FollowButton';
import { PublicTaskRow } from '../../src/components/PublicTaskRow';
import { displayNameOf, initialsOf } from '../../src/utils/initials';

type Filter = 'all' | 'active' | 'completed';
type AlbumFilter = 'all' | 'active' | 'completed' | 'closed';

function Stat({ value, label, divider }: { value: number | string; label: string; divider?: boolean }) {
  return (
    <View style={[styles.stat, divider && styles.statDivider]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'list' | 'albums'>('list');
  const [filter, setFilter] = useState<Filter>('all');
  const [albumFilter, setAlbumFilter] = useState<AlbumFilter>('all');

  const isOwnProfile = !!user && user.id === id;
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const { isAlbumFavorite } = useUserFavorites(user?.id);
  const toggleFavoriteAlbum = useToggleFavoriteAlbum();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: stats, isLoading: statsLoading } = useProfileStats(id);
  const followStatus = stats?.follow_status ?? 'none';
  const isLocked = !isOwnProfile && !!stats?.is_locked;
  const isPrivate = profile?.visibility === 'private';

  // RLS decide qué tareas se ven (públicas; "solo seguidores" si ya me sigue aceptado).
  const { data: buckets, isLoading: bucketsLoading } = useQuery({
    queryKey: ['buckets', 'public', id, followStatus],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buckets')
        .select(
          `
          *,
          category:categories(slug, name_es),
          item_subtasks(done),
          bucket_photos(storage_path, thumb_path)
        `
        )
        .eq('user_id', id)
        .neq('visibility', 'private')
        .neq('status', 'archived')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id && !!stats && !isLocked,
  });

  // Álbumes públicos del usuario
  const { data: publicAlbums, isLoading: albumsLoading } = useQuery({
    queryKey: ['albums', 'public', id, followStatus],
    queryFn: async (): Promise<AlbumWithProgress[]> => {
      if (!id) return [];

      // 1. Álbumes donde el usuario es el dueño y no son privados
      const { data: ownAlbums, error: ownErr } = await supabase
        .from('albums')
        .select('*')
        .eq('owner_id', id)
        .neq('visibility', 'private')
        .order('created_at', { ascending: false });

      if (ownErr) throw ownErr;

      // 2. Álbumes compartidos donde el usuario es colaborador aceptado y no son privados
      let sharedAlbums: any[] = [];
      try {
        const { data: memberRows } = await supabase
          .from('album_members')
          .select('album_id')
          .eq('user_id', id)
          .eq('status', 'accepted');

        const sharedAlbumIds = (memberRows ?? []).map((m: any) => m.album_id);
        if (sharedAlbumIds.length > 0) {
          const { data: memberAlbums } = await supabase
            .from('albums')
            .select('*')
            .in('id', sharedAlbumIds)
            .neq('visibility', 'private')
            .order('created_at', { ascending: false });
          sharedAlbums = memberAlbums ?? [];
        }
      } catch {
        // Ignored
      }

      const ownIds = new Set((ownAlbums ?? []).map((a: any) => a.id));
      const allAlbums = [
        ...(ownAlbums ?? []),
        ...sharedAlbums.filter((a: any) => !ownIds.has(a.id)),
      ];

      if (allAlbums.length === 0) return [];

      const { data: progressData } = await supabase
        .from('album_progress')
        .select('*')
        .in('album_id', allAlbums.map((a: any) => a.id));

      return allAlbums.map((album: any) => {
        const prog = progressData?.find((p: any) => p.album_id === album.id);
        return {
          id: album.id,
          title: album.title,
          description: album.description,
          cover_path: album.cover_path,
          visibility: album.visibility,
          is_shared: album.is_shared,
          priority: (album.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          is_closed: Boolean(album.is_closed),
          closed_at: album.closed_at || null,
          created_at: album.created_at || undefined,
          total_tasks: prog?.total_tasks || 0,
          completed_tasks: prog?.completed_tasks || 0,
        };
      });
    },
    enabled: !!id && !!stats && !isLocked,
  });

  const filtered = useMemo(() => {
    const list = buckets ?? [];
    if (filter === 'completed') return list.filter((b: any) => b.status === 'completed');
    if (filter === 'active') return list.filter((b: any) => b.status === 'pending' || b.status === 'in_progress');
    return list;
  }, [buckets, filter]);

  const filteredAlbums = useMemo(() => {
    const list = publicAlbums ?? [];
    if (albumFilter === 'closed') return list.filter((a) => a.is_closed);
    if (albumFilter === 'completed') {
      return list.filter((a) => !a.is_closed && a.total_tasks > 0 && a.completed_tasks >= a.total_tasks);
    }
    if (albumFilter === 'active') {
      return list.filter((a) => !a.is_closed && (a.total_tasks === 0 || a.completed_tasks < a.total_tasks));
    }
    return list;
  }, [publicAlbums, albumFilter]);

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

  const openMenu = () => {
    if (isOwnProfile || !id) return;
    const buttons: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [];
    const unfollowNow = () => {
      if (!user) return;
      unfollowUser.mutate(
        { followerId: user.id, followingId: id },
        { onError: (error: any) => Alert.alert('No se pudo completar', error?.message ?? 'Inténtalo de nuevo.') }
      );
    };
    if (followStatus === 'accepted') buttons.push({ text: 'Dejar de seguir', style: 'destructive', onPress: unfollowNow });
    if (followStatus === 'pending') buttons.push({ text: 'Cancelar solicitud', style: 'destructive', onPress: unfollowNow });
    buttons.push({ text: 'Cerrar', style: 'cancel' });
    Alert.alert(displayNameOf(profile), `@${profile?.username ?? ''}`, buttons);
  };

  if (profileLoading || statsLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={gold[400]} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} style={styles.circleButton} accessibilityRole="button" accessibilityLabel="Volver">
            <ChevronLeft size={22} color="#F2EFE8" strokeWidth={2} />
          </Pressable>
        </View>
        <EmptyState title="Usuario no encontrado" message="Puede que este perfil ya no exista." />
      </SafeAreaView>
    );
  }

  const taskCount = buckets ? buckets.length : (stats?.public_count ?? 0);

  const header = (
    <View>
      <View style={styles.identity}>
        <Avatar uri={profile.avatar_url} initials={initialsOf(profile)} size="xl" goldRing />
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {displayNameOf(profile)}
          </Text>
          <View style={styles.handleRow}>
            <Text style={styles.handle} numberOfLines={1} ellipsizeMode="tail">@{profile.username}</Text>
            {isPrivate ? <Lock size={13} color="#9A9A9A" strokeWidth={1.8} /> : null}
          </View>
        </View>
      </View>

      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.followWrap}>
        {isOwnProfile ? (
          <Pressable
            onPress={() => router.push('/(modals)/edit-profile' as any)}
            style={styles.editButton}
            accessibilityRole="button"
          >
            <Text style={styles.editText}>Editar perfil</Text>
          </Pressable>
        ) : (
          <FollowButton
            size="block"
            status={followStatus}
            isPrivate={isPrivate}
            loading={followUser.isPending || unfollowUser.isPending}
            onPress={doFollow}
          />
        )}
      </View>

      <View style={styles.stats}>
        <Stat value={stats?.completed_count ?? 0} label="Completadas" />
        <Stat value={isLocked ? '—' : (stats?.public_count ?? 0)} label="Públicas" divider />
        <Stat value={stats?.followers_count ?? 0} label="Seguidores" divider />
      </View>

      {isLocked ? (
        <View style={styles.locked}>
          <Lock size={28} color={gold[400]} strokeWidth={1.6} />
          <Text style={styles.lockedTitle}>Esta cuenta es privada</Text>
          <Text style={styles.lockedText}>
            {followStatus === 'pending'
              ? 'Tu solicitud está pendiente. Verás sus tareas cuando la acepte.'
              : `Solicita seguir a ${displayNameOf(profile)} para ver sus tareas.`}
          </Text>
        </View>
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
              <SectionLabel highlight="Tareas" rest={`públicas · ${taskCount}`} style={styles.sectionLabel} />
              <View style={styles.filters}>
                <FilterChip label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
                <FilterChip label="En curso" active={filter === 'active'} onPress={() => setFilter('active')} />
                <FilterChip label="Completadas" active={filter === 'completed'} onPress={() => setFilter('completed')} />
              </View>
            </>
          ) : (
            <>
              <SectionLabel highlight="Álbumes" rest={`públicos · ${publicAlbums?.length ?? 0}`} style={styles.sectionLabel} />
              <View style={styles.filters}>
                <FilterChip label="Todos" active={albumFilter === 'all'} onPress={() => setAlbumFilter('all')} />
                <FilterChip label="En curso" active={albumFilter === 'active'} onPress={() => setAlbumFilter('active')} />
                <FilterChip label="Completados" active={albumFilter === 'completed'} onPress={() => setAlbumFilter('completed')} />
                <FilterChip label="Cerrados" active={albumFilter === 'closed'} onPress={() => setAlbumFilter('closed')} />
              </View>
              {albumsLoading ? (
                <ActivityIndicator style={{ marginTop: 24 }} color={gold[400]} />
              ) : filteredAlbums.length === 0 ? (
                <Text style={styles.empty}>
                  {albumFilter === 'all' ? 'Todavía no hay álbumes públicos que mostrar.' : 'No hay álbumes en este filtro.'}
                </Text>
              ) : (
                <View style={styles.albumGrid}>
                  {filteredAlbums.map((item, idx) => (
                    <AlbumCard
                      key={item.id}
                      title={item.title}
                      totalTasks={item.total_tasks ?? 0}
                      completedTasks={item.completed_tasks ?? 0}
                      coverUri={item.cover_path}
                      isShared={item.is_shared}
                      isFavorite={isAlbumFavorite(item.id)}
                      onToggleFavorite={
                        user
                          ? () =>
                              toggleFavoriteAlbum.mutate({
                                albumId: item.id,
                                currentlyFavorite: isAlbumFavorite(item.id),
                              })
                          : undefined
                      }
                      priority={item.priority}
                      isClosed={item.is_closed}
                      colorIndex={idx}
                      onPress={() => router.push(`/album/${item.id}` as any)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} style={styles.circleButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft size={22} color="#F2EFE8" strokeWidth={2} />
        </Pressable>
        {!isOwnProfile ? (
          <Pressable onPress={openMenu} style={styles.circleButton} hitSlop={8} accessibilityRole="button" accessibilityLabel="Más opciones">
            <MoreHorizontal size={22} color="#F2EFE8" strokeWidth={2} />
          </Pressable>
        ) : (
          <View style={styles.circleButton} />
        )}
      </View>

      <FlatList
        data={isLocked || activeTab !== 'list' ? [] : filtered}
        keyExtractor={(item: any) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <PublicTaskRow
            bucket={item}
            isOwnProfile={isOwnProfile}
            onPress={() => router.push(`/bucket/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          isLocked || activeTab !== 'list' ? null : bucketsLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={gold[400]} />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 48 },
  tabsContainer: { marginTop: 22, marginBottom: 4 },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  identityText: { flex: 1, gap: 3 },
  name: { fontFamily: fontFamily.serifBold, fontSize: 19, lineHeight: 24, color: '#FFFFFF', letterSpacing: -0.2 },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  handle: { fontFamily: fontFamily.regular, fontSize: 13, color: '#9A9A9A' },
  bio: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: '#E5E5E5', marginTop: 14 },
  followWrap: { marginTop: 18 },
  editButton: {
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#161616',
  },
  editText: { fontFamily: fontFamily.semibold, fontSize: 14, color: '#E5E5E5' },
  stats: {
    flexDirection: 'row',
    marginTop: 22,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2A2A',
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: '#2A2A2A' },
  statValue: { fontFamily: fontFamily.serifBold, fontSize: 24, color: '#FFFFFF' },
  statLabel: { fontFamily: fontFamily.regular, fontSize: 13, color: '#9A9A9A' },
  sectionLabel: { marginTop: 24 },
  filters: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 16, flexWrap: 'wrap' },
  empty: { fontFamily: fontFamily.regular, fontSize: 14, color: '#9A9A9A', textAlign: 'center', marginTop: 24 },
  locked: {
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
  },
  lockedTitle: { fontFamily: fontFamily.serif, fontSize: 20, color: '#FFFFFF' },
  lockedText: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: '#CFCFCF', textAlign: 'center' },
});

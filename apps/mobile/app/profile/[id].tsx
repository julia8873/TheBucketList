import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Lock, MoreHorizontal } from 'lucide-react-native';
import { Avatar, EmptyState, FilterChip, SectionLabel, fontFamily, gold, useTheme } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useProfileStats } from '../../src/hooks/useFriends';
import { useFollowUser, useUnfollowUser } from '../../src/hooks/useSocial';
import { FollowButton } from '../../src/components/FollowButton';
import { PublicTaskRow } from '../../src/components/PublicTaskRow';
import { displayNameOf, initialsOf } from '../../src/utils/initials';

type Filter = 'all' | 'active' | 'completed';

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
  const [filter, setFilter] = useState<Filter>('all');

  const isOwnProfile = !!user && user.id === id;
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

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

  const filtered = useMemo(() => {
    const list = buckets ?? [];
    if (filter === 'completed') return list.filter((b: any) => b.status === 'completed');
    if (filter === 'active') return list.filter((b: any) => b.status === 'pending' || b.status === 'in_progress');
    return list;
  }, [buckets, filter]);

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
          <Text style={styles.name} numberOfLines={2}>
            {displayNameOf(profile)}
          </Text>
          <View style={styles.handleRow}>
            <Text style={styles.handle}>@{profile.username}</Text>
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
          <SectionLabel highlight="Tareas" rest={`públicas · ${taskCount}`} style={styles.sectionLabel} />
          <View style={styles.filters}>
            <FilterChip label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterChip label="En curso" active={filter === 'active'} onPress={() => setFilter('active')} />
            <FilterChip label="Completadas" active={filter === 'completed'} onPress={() => setFilter('completed')} />
          </View>
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
        data={isLocked ? [] : filtered}
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
          isLocked ? null : bucketsLoading ? (
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
    paddingHorizontal: 16,
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
  listContent: { paddingHorizontal: 16, paddingBottom: 48 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14 },
  identityText: { flex: 1, gap: 4 },
  name: { fontFamily: fontFamily.serifBold, fontSize: 30, lineHeight: 36, color: '#FFFFFF', letterSpacing: -0.3 },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  handle: { fontFamily: fontFamily.regular, fontSize: 15, color: '#9A9A9A' },
  bio: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, color: '#E5E5E5', marginTop: 18 },
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

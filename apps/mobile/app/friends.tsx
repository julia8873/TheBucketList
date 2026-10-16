import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { SegmentedControl, gold, useTheme, PageTitle, EmptyState } from '@bucketlist/ui';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../src/services/supabase';
import { useAuthStore } from '../src/stores/auth.store';
import {
  useAcceptRequest,
  useIncomingRequests,
  useOutgoingRequests,
  useConnections,
  usePeopleSearch,
  useRejectRequest,
  useProfileStats,
} from '../src/hooks/useFriends';
import { useFollowUser, useUnfollowUser } from '../src/hooks/useSocial';
import { displayNameOf } from '../src/utils/initials';
import type { PersonResult } from '../src/services/api/friends';

import { styles } from '../src/features/friends/styles/friends.styles';
import { FriendsAccountsTab, type ConnectionKind } from '../src/features/friends/components/FriendsAccountsTab';
import { FriendsRequestsTab } from '../src/features/friends/components/FriendsRequestsTab';

type Tab = 'accounts' | 'requests';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function FriendsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ tab?: string; userId?: string; kind?: ConnectionKind }>();

  const targetUserId = params.userId || user?.id;
  const isOtherUser = !!params.userId && params.userId !== user?.id;

  const [tab, setTab] = useState<Tab>(params.tab === 'requests' && !isOtherUser ? 'requests' : 'accounts');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kind, setKind] = useState<ConnectionKind>(params.kind === 'followers' ? 'followers' : 'following');
  const debounced = useDebounce(query, 350);
  const term = debounced.trim().replace(/^@/, '');

  useEffect(() => {
    if (params.kind === 'followers' || params.kind === 'following') {
      setKind(params.kind);
    }
  }, [params.kind]);

  const targetProfileQuery = useQuery({
    queryKey: ['profile', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', targetUserId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: isOtherUser && !!targetUserId,
  });

  const targetStatsQuery = useProfileStats(isOtherUser ? targetUserId : undefined);
  const targetFollowStatus = targetStatsQuery.data?.follow_status ?? 'none';
  const targetIsPrivate = targetProfileQuery.data?.visibility === 'private';
  const targetIsLocked =
    isOtherUser && (!!targetStatsQuery.data?.is_locked || (targetIsPrivate && targetFollowStatus !== 'accepted'));

  const search = usePeopleSearch(debounced);
  const following = useConnections(targetUserId, 'following', user?.id);
  const followers = useConnections(targetUserId, 'followers', user?.id);
  const incoming = useIncomingRequests(user?.id);
  const outgoing = useOutgoingRequests(user?.id);
  const accept = useAcceptRequest(user?.id);
  const reject = useRejectRequest(user?.id);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  useEffect(() => {
    if (params.tab === 'requests' && !isOtherUser) setTab('requests');
  }, [params.tab, isOtherUser]);

  const incomingList = incoming.data ?? [];
  const outgoingList = outgoing.data ?? [];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed' as any));
  const openProfile = (id: string) => router.push(`/profile/${id}` as any);

  const onFollowPress = (person: PersonResult) => {
    if (!user) return;
    const vars = { followerId: user.id, followingId: person.id, targetIsPrivate: person.visibility === 'private' };
    const fail = (error: any) => Alert.alert('No se pudo completar', error?.message ?? 'Inténtalo de nuevo.');

    if (person.follow_status === 'accepted') {
      Alert.alert(`¿Dejar de seguir a ${displayNameOf(person)}?`, undefined, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Dejar de seguir', style: 'destructive', onPress: () => unfollow.mutate(vars, { onError: fail }) },
      ]);
    } else if (person.follow_status === 'pending') {
      unfollow.mutate(vars, { onError: fail });
    } else {
      follow.mutate(vars, { onError: fail });
    }
  };

  const runRequestAction = (id: string, action: () => void) => {
    setBusyId(id);
    action();
  };

  const requestsCount = incomingList.length;
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([
        incoming.refetch(),
        outgoing.refetch(),
        following.refetch(),
        followers.refetch(),
      ]);
    } finally {
      setManualRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft size={22} color="#F2EFE8" strokeWidth={2} />
        </Pressable>

        {isOtherUser ? (
          <PageTitle
            gold={kind === 'followers' ? 'Seguidores' : 'Siguiendo'}
            rest={targetProfileQuery.data?.username ? `de @${targetProfileQuery.data.username}` : ''}
          />
        ) : tab === 'accounts' ? (
          <View style={[styles.searchField, (focused || query.length > 0) && { borderColor: gold[400] }]}>
            <Search size={18} color="#9A9A9A" strokeWidth={1.8} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Buscar personas"
              placeholderTextColor="#7A7A7A"
              autoFocus={false}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.searchInput}
              selectionColor={gold[400]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
                <X size={18} color="#9A9A9A" strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <PageTitle gold="Mis" rest="amigos" />
        )}
      </View>

      {!isOtherUser && (
        <View style={styles.segment}>
          <SegmentedControl
            options={[
              { key: 'accounts', label: 'Cuentas' },
              { key: 'requests', label: requestsCount > 0 ? `Solicitudes · ${requestsCount}` : 'Solicitudes' },
            ]}
            selected={tab}
            onChange={(key) => setTab(key as Tab)}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing}
            tintColor={gold[400]}
            onRefresh={handleRefresh}
          />
        }
      >
        {targetIsLocked ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' }}>
            <EmptyState
              title="Esta cuenta es privada"
              message="Sigue a este usuario para ver sus seguidores."
            />
          </View>
        ) : tab === 'accounts' || isOtherUser ? (
          <FriendsAccountsTab
            term={term}
            kind={kind}
            onChangeKind={setKind}
            followingData={following.data}
            followingLoading={following.isLoading}
            followersData={followers.data}
            followersLoading={followers.isLoading}
            searchData={search.data}
            searchLoading={search.isLoading}
            searchError={search.isError}
            isDebouncing={query.trim() !== debounced.trim() && !search.data}
            onRetrySearch={() => void search.refetch()}
            onOpenProfile={openProfile}
            onFollowPress={onFollowPress}
          />
        ) : (
          <FriendsRequestsTab
            isLoading={incoming.isLoading || outgoing.isLoading}
            incomingList={incomingList}
            outgoingList={outgoingList}
            busyId={busyId}
            isActionPending={accept.isPending || reject.isPending}
            onAccept={(pId) =>
              runRequestAction(pId, () =>
                accept.mutate(pId, {
                  onError: (e: any) => Alert.alert('No se pudo aceptar', e?.message ?? ''),
                })
              )
            }
            onReject={(pId) =>
              runRequestAction(pId, () =>
                reject.mutate(pId, {
                  onError: (e: any) => Alert.alert('No se pudo rechazar', e?.message ?? ''),
                })
              )
            }
            onCancelOutgoing={(pId) =>
              user &&
              unfollow.mutate(
                { followerId: user.id, followingId: pId },
                { onError: (e: any) => Alert.alert('No se pudo cancelar', e?.message ?? '') }
              )
            }
            onOpenProfile={openProfile}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

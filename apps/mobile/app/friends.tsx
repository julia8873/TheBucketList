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
import { SegmentedControl, gold, useTheme, PageTitle } from '@bucketlist/ui';
import { useAuthStore } from '../src/stores/auth.store';
import {
  useAcceptRequest,
  useIncomingRequests,
  useOutgoingRequests,
  useConnections,
  usePeopleSearch,
  useRejectRequest,
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
  const params = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<Tab>(params.tab === 'requests' ? 'requests' : 'accounts');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kind, setKind] = useState<ConnectionKind>('following');
  const debounced = useDebounce(query, 350);
  const term = debounced.trim().replace(/^@/, '');

  const search = usePeopleSearch(debounced);
  const following = useConnections(user?.id, 'following');
  const followers = useConnections(user?.id, 'followers');
  const incoming = useIncomingRequests(user?.id);
  const outgoing = useOutgoingRequests(user?.id);
  const accept = useAcceptRequest(user?.id);
  const reject = useRejectRequest(user?.id);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  useEffect(() => {
    if (params.tab === 'requests') setTab('requests');
  }, [params.tab]);

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

        {tab === 'accounts' ? (
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
        {tab === 'accounts' ? (
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

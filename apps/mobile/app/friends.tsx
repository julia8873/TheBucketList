import { Alert } from '@bucketlist/ui';
import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { SegmentedControl, gold, useTheme, PageTitle, EmptyState } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
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
import { useSearchFeed } from '../src/hooks/useFeed';
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
  const { t } = useTranslation();
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
      return data;
    },
    enabled: isOtherUser && !!targetUserId,
  });

  const targetStatsQuery = useProfileStats(isOtherUser ? targetUserId : undefined);
  const targetFollowStatus = targetStatsQuery.data?.follow_status ?? 'none';
  const targetIsPrivate = targetProfileQuery.data?.visibility === 'private';
  const targetIsLocked =
    isOtherUser && (!!targetStatsQuery.data?.is_locked || (targetIsPrivate && targetFollowStatus !== 'accepted'));

  const search = usePeopleSearch(debounced);
  const ideasSearch = useSearchFeed({ query: debounced, scope: 'all', userId: user?.id });
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
  const openProfile = (id: string) => {
    if (user && id === user.id) {
      router.push('/(tabs)/profile' as any);
    } else {
      router.push(`/profile/${id}` as any);
    }
  };

  const onFollowPress = (person: PersonResult) => {
    if (!user || person.id === user.id) return;
    const vars = { followerId: user.id, followingId: person.id, targetIsPrivate: person.visibility === 'private' };
    const fail = (error: any) => Alert.alert(t('friends.error_complete', { defaultValue: 'No se pudo completar' }), error?.message ?? t('errors.try_again', { defaultValue: 'Inténtalo de nuevo.' }));

    if (person.follow_status === 'accepted') {
      Alert.alert(t('friends.unfollow_confirm', { name: displayNameOf(person), defaultValue: `¿Dejar de seguir a ${displayNameOf(person)}?` }), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('social.unfollow'), style: 'destructive', onPress: () => unfollow.mutate(vars, { onError: fail }) },
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
        <Pressable
          onPress={goBack}
          style={[styles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
        >
          <ChevronLeft size={22} color={theme.colors.foreground} strokeWidth={2} />
        </Pressable>

        {isOtherUser ? (
          <PageTitle
            gold={kind === 'followers' ? t('profile.stat_followers') : t('social.following')}
            rest={targetProfileQuery.data?.username ? ` de @${targetProfileQuery.data.username}` : ''}
          />
        ) : tab === 'accounts' ? (
          <View
            style={[
              styles.searchField,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              (focused || query.length > 0) && { borderColor: gold[400] },
            ]}
          >
            <Search size={18} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={t('friends.search_placeholder')}
              placeholderTextColor={theme.colors.foregroundMuted}
              autoFocus={false}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={[styles.searchInput, { color: theme.colors.foreground }]}
              selectionColor={gold[400]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.clear_search', { defaultValue: 'Borrar búsqueda' })}>
                <X size={18} color={theme.colors.foregroundMuted} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <PageTitle gold={t('friends.title_gold')} rest={` ${t('friends.title_rest')}`} />
        )}
      </View>

      {!isOtherUser && (
        <View style={styles.segment}>
          <SegmentedControl
            options={[
              { key: 'accounts', label: t('friends.tab_accounts') },
              { key: 'requests', label: requestsCount > 0 ? t('friends.requests_with_count', { count: requestsCount }) : t('friends.tab_requests') },
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
          <View style={{ paddingHorizontal: 12, paddingTop: 40, alignItems: 'center' }}>
            <EmptyState
              title={t('friends.locked_account_title')}
              message={t('friends.locked_account_desc')}
            />
          </View>
        ) : tab === 'accounts' || isOtherUser ? (
          <FriendsAccountsTab
            currentUserId={user?.id}
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
            ideasData={ideasSearch.data?.tasks ?? []}
            ideasLoading={ideasSearch.isLoading}
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
                  onError: (e: any) => Alert.alert(t('friends.error_accept'), e?.message ?? ''),
                })
              )
            }
            onReject={(pId) =>
              runRequestAction(pId, () =>
                reject.mutate(pId, {
                  onError: (e: any) => Alert.alert(t('friends.error_reject'), e?.message ?? ''),
                })
              )
            }
            onCancelOutgoing={(pId) =>
              user &&
              unfollow.mutate(
                { followerId: user.id, followingId: pId },
                { onError: (e: any) => Alert.alert(t('friends.error_cancel'), e?.message ?? '') }
              )
            }
            onOpenProfile={openProfile}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

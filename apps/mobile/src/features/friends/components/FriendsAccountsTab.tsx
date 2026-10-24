import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Search, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@bucketlist/shared';
import { EmptyState, SectionLabel, gold, useTheme } from '@bucketlist/ui';
import { PersonRow } from '../../../components/PersonRow';
import { FollowButton } from '../../../components/FollowButton';
import { UserRowSkeleton } from '../../../components/TaskSkeletons';
import { FeedCard } from '../../../components/FeedCard';
import type { PersonResult } from '../../../services/api/friends';
import { useAuthStore } from '../../../stores/auth.store';
import { styles } from '../styles/friends.styles';

export type ConnectionKind = 'following' | 'followers';

interface FriendsAccountsTabProps {
  term: string;
  kind: ConnectionKind;
  onChangeKind: (k: ConnectionKind) => void;
  followingData?: PersonResult[];
  followingLoading: boolean;
  followersData?: PersonResult[];
  followersLoading: boolean;
  searchData?: PersonResult[];
  searchLoading: boolean;
  searchError: boolean;
  isDebouncing: boolean;
  onRetrySearch: () => void;
  onOpenProfile: (id: string) => void;
  onFollowPress: (person: PersonResult) => void;
  currentUserId?: string;
  ideasData?: any[];
  ideasLoading?: boolean;
}

export function FriendsAccountsTab({
  term,
  kind,
  onChangeKind,
  followingData = [],
  followingLoading,
  followersData = [],
  followersLoading,
  searchData,
  searchLoading,
  searchError,
  isDebouncing,
  onRetrySearch,
  onOpenProfile,
  onFollowPress,
  currentUserId,
  ideasData = [],
  ideasLoading = false,
}: FriendsAccountsTabProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const activeUserId = currentUserId ?? authUser?.id;

  const [searchFilter, setSearchFilter] = useState<'accounts' | 'ideas'>('accounts');

  const subtitleFor = (person: PersonResult): string => {
    const handle = `@${person.username}`;
    if (person.visibility === 'private' && person.follow_status !== 'accepted') {
      return `${handle} · ${t('friends.private_account_label')}`;
    }
    const n = person.public_count ?? 0;
    const taskUnit = n === 1 ? t('friends.public_task_single') : t('friends.public_task_plural');
    return `${handle} · ${n} ${taskUnit}`;
  };

  if (term.length < 2) {
    const list = kind === 'following' ? followingData : followersData;
    const loading = (kind === 'following' ? followingLoading : followersLoading) && list.length === 0;

    return (
      <View>
        <View style={styles.chips}>
          {([
            ['following', t('friends.following_count', { count: followingData.length })],
            ['followers', t('friends.followers_count', { count: followersData.length })],
          ] as const).map(([key, label]) => {
            const on = kind === key;
            return (
              <Pressable
                key={key}
                onPress={() => onChangeKind(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on
                      ? theme.dark
                        ? '#2A2411'
                        : '#FDF4DC'
                      : theme.colors.surface,
                    borderColor: on ? gold[400] : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: on ? gold[400] : theme.colors.foregroundMuted }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={{ marginTop: 8 }}>
            <UserRowSkeleton />
            <UserRowSkeleton />
            <UserRowSkeleton />
            <UserRowSkeleton />
          </View>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Search}
            title={kind === 'following' ? t('feed.empty_friends_title') : t('friends.requests_empty_title')}
            message={
              kind === 'following'
                ? t('feed.empty_friends_desc')
                : t('friends.requests_empty_desc')
            }
          />
        ) : (
          list.map((person) => {
            const isSelf = !!activeUserId && person.id === activeUserId;
            return (
              <PersonRow
                key={person.id}
                person={person}
                subtitle={`@${person.username}`}
                onPress={() => onOpenProfile(person.id)}
                right={
                  isSelf ? null : (
                    <FollowButton
                      status={person.follow_status}
                      isPrivate={person.visibility === 'private'}
                      onPress={() => onFollowPress(person)}
                    />
                  )
                }
              />
            );
          })
        )}
      </View>
    );
  }

  const results = searchData ?? [];
  const isLoading = searchLoading || ideasLoading || isDebouncing;

  return (
    <View>
      {/* Pills de búsqueda: Cuentas | Ideas */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <Pressable
          onPress={() => setSearchFilter('accounts')}
          style={[
            styles.chip,
            {
              backgroundColor:
                searchFilter === 'accounts'
                  ? theme.dark
                    ? '#2A2411'
                    : '#FDF4DC'
                  : theme.colors.surface,
              borderColor: searchFilter === 'accounts' ? gold[400] : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: searchFilter === 'accounts' ? gold[400] : theme.colors.foregroundMuted },
            ]}
          >
            {t('friends.tab_accounts')} · {results.length}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSearchFilter('ideas')}
          style={[
            styles.chip,
            {
              backgroundColor:
                searchFilter === 'ideas'
                  ? theme.dark
                    ? '#2A2411'
                    : '#FDF4DC'
                  : theme.colors.surface,
              borderColor: searchFilter === 'ideas' ? gold[400] : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              { color: searchFilter === 'ideas' ? gold[400] : theme.colors.foregroundMuted },
            ]}
          >
            {t('friends.tab_ideas')} · {ideasData.length}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ marginTop: 8 }}>
          <UserRowSkeleton />
          <UserRowSkeleton />
          <UserRowSkeleton />
        </View>
      ) : searchError ? (
        <EmptyState
          title={t('friends.search_error_title')}
          message={t('friends.search_error_msg')}
          actionLabel={t('common.retry')}
          onAction={onRetrySearch}
        />
      ) : searchFilter === 'accounts' ? (
        <View>
          <SectionLabel
            highlight={t('friends.search_results_title')}
            rest={` ${t('friends.search_results_for', { query: term })}`}
            style={styles.sectionLabel}
          />
          {results.length === 0 ? (
            <Text
              style={[
                styles.empty,
                { color: theme.dark ? '#FFFFFF' : theme.colors.foreground },
              ]}
            >
              {t('friends.search_no_match', { query: term })}
            </Text>
          ) : (
            results.map((person) => {
              const isSelf = !!activeUserId && person.id === activeUserId;
              return (
                <PersonRow
                  key={person.id}
                  person={person}
                  subtitle={subtitleFor(person)}
                  onPress={() => onOpenProfile(person.id)}
                  right={
                    isSelf ? null : (
                      <FollowButton
                        status={person.follow_status}
                        isPrivate={person.visibility === 'private'}
                        onPress={() => onFollowPress(person)}
                      />
                    )
                  }
                />
              );
            })
          )}

          <View style={[styles.note, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Lock size={16} color={gold[400]} strokeWidth={1.8} />
            <Text style={[styles.noteText, { color: theme.colors.foregroundMuted }]}>
              {t('friends.private_note')}
            </Text>
          </View>
        </View>
      ) : (
        <View>
          <SectionLabel
            highlight={t('feed.search_section_ideas')}
            rest={` (${ideasData.length})`}
            style={styles.sectionLabel}
          />
          {ideasData.length === 0 ? (
            <Text
              style={[
                styles.empty,
                { color: theme.dark ? '#FFFFFF' : theme.colors.foreground },
              ]}
            >
              {t('friends.search_ideas_empty', { query: term })}
            </Text>
          ) : (
            ideasData.map((task, index) => (
              <FeedCard
                key={`task-${task.id}-${index}`}
                event={{
                  id: task.id,
                  actor: task.actor || task.user,
                  bucket: task.bucket || task,
                  type: task.type || (task.bucket?.status === 'completed' ? 'completed' : 'new_bucket'),
                  created_at: task.created_at,
                }}
                index={index}
                mode="list"
                onPress={() => router.push(`/bucket/${task.id}` as any)}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
}

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Search, Lock } from 'lucide-react-native';
import { EmptyState, SectionLabel, gold } from '@bucketlist/ui';
import { PersonRow } from '../../../components/PersonRow';
import { FollowButton } from '../../../components/FollowButton';
import { UserRowSkeleton } from '../../../components/TaskSkeletons';
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
}

function subtitleFor(person: PersonResult): string {
  const handle = `@${person.username}`;
  if (person.visibility === 'private' && person.follow_status !== 'accepted') {
    return `${handle} · Cuenta privada`;
  }
  const n = person.public_count ?? 0;
  return `${handle} · ${n} ${n === 1 ? 'tarea pública' : 'tareas públicas'}`;
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
}: FriendsAccountsTabProps) {
  const authUser = useAuthStore((s) => s.user);
  const activeUserId = currentUserId ?? authUser?.id;

  if (term.length < 2) {
    const list = kind === 'following' ? followingData : followersData;
    const loading = (kind === 'following' ? followingLoading : followersLoading) && list.length === 0;

    return (
      <View>
        <View style={styles.chips}>
          {([
            ['following', `Siguiendo · ${followingData.length}`],
            ['followers', `Seguidores · ${followersData.length}`],
          ] as const).map(([key, label]) => {
            const on = kind === key;
            return (
              <Pressable
                key={key}
                onPress={() => onChangeKind(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && { color: gold[400] }]}>{label}</Text>
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
            title={kind === 'following' ? 'Aún no sigues a nadie' : 'Aún no tienes seguidores'}
            message={
              kind === 'following'
                ? 'Busca por nombre o por @usuario para seguir a tus amigos y ver sus momentos.'
                : 'Cuando alguien te siga aparecerá aquí.'
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

  if (searchLoading || isDebouncing) {
    return (
      <View style={{ marginTop: 8 }}>
        <UserRowSkeleton />
        <UserRowSkeleton />
        <UserRowSkeleton />
      </View>
    );
  }

  if (searchError) {
    return (
      <EmptyState
        title="No se pudo buscar"
        message="Inténtalo de nuevo en unos segundos."
        actionLabel="Reintentar"
        onAction={onRetrySearch}
      />
    );
  }

  const results = searchData ?? [];
  return (
    <View>
      <SectionLabel highlight="Resultados" rest={`para «${term}»`} style={styles.sectionLabel} />
      {results.length === 0 ? (
        <Text style={styles.empty}>Nadie coincide con «{term}».</Text>
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

      <View style={styles.note}>
        <Lock size={16} color={gold[400]} strokeWidth={1.8} />
        <Text style={styles.noteText}>
          De las cuentas privadas solo verás sus tareas cuando acepten tu solicitud.
        </Text>
      </View>
    </View>
  );
}

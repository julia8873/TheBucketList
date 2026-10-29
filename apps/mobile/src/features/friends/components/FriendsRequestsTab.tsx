import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { EmptyState, gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { PersonRow } from '../../../components/PersonRow';
import { UserRowSkeleton } from '../../../components/TaskSkeletons';
import { styles } from '../styles/friends.styles';

interface FriendsRequestsTabProps {
  isLoading: boolean;
  incomingList: Array<{ person: any }>;
  outgoingList: Array<{ person: any }>;
  busyId: string | null;
  isActionPending: boolean;
  onAccept: (personId: string) => void;
  onReject: (personId: string) => void;
  onCancelOutgoing: (personId: string) => void;
  onOpenProfile: (id: string) => void;
}

function GoldLabel({ children }: { children: string }) {
  return <Text style={styles.goldLabel}>{children}</Text>;
}

export function FriendsRequestsTab({
  isLoading,
  incomingList,
  outgoingList,
  busyId,
  isActionPending,
  onAccept,
  onReject,
  onCancelOutgoing,
  onOpenProfile,
}: FriendsRequestsTabProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (isLoading && incomingList.length === 0 && outgoingList.length === 0) {
    return (
      <View style={{ marginTop: 8 }}>
        <UserRowSkeleton />
        <UserRowSkeleton />
      </View>
    );
  }

  if (incomingList.length === 0 && outgoingList.length === 0) {
    return (
      <EmptyState
        title={t('friends.requests_empty_title')}
        message={t('friends.requests_empty_desc')}
      />
    );
  }

  return (
    <View>
      <View style={styles.sectionLabel}>
        <GoldLabel>{t('friends.requests_received', { count: incomingList.length })}</GoldLabel>
      </View>
      {incomingList.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.foregroundMuted }]}>{t('friends.requests_empty_incoming')}</Text>
      ) : (
        incomingList.map(({ person }) => {
          const busy = busyId === person.id && isActionPending;
          return (
            <PersonRow
              key={person.id}
              person={person}
              subtitle={`@${person.username} · ${t('friends.requests_wants_to_follow')}`}
              onPress={() => onOpenProfile(person.id)}
              right={
                busy ? (
                  <ActivityIndicator color={gold[400]} />
                ) : (
                  <>
                    <Pressable
                      onPress={() => onReject(person.id)}
                      style={[styles.roundButton, styles.rejectButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={t('friends.requests_reject_label')}
                    >
                      <X size={18} color={theme.colors.foregroundMuted} strokeWidth={2} />
                    </Pressable>
                    <Pressable
                      onPress={() => onAccept(person.id)}
                      style={[styles.roundButton, styles.acceptButton]}
                      accessibilityRole="button"
                      accessibilityLabel={t('friends.requests_accept_label')}
                    >
                      <Check size={18} color="#111111" strokeWidth={2.4} />
                    </Pressable>
                  </>
                )
              }
            />
          );
        })
      )}

      <View style={[styles.sectionLabel, { marginTop: 26 }]}>
        <GoldLabel>{t('friends.requests_sent', { count: outgoingList.length })}</GoldLabel>
      </View>
      {outgoingList.length === 0 ? (
        <Text style={[styles.empty, { color: theme.colors.foregroundMuted }]}>{t('friends.requests_empty_outgoing')}</Text>
      ) : (
        outgoingList.map(({ person }) => (
          <PersonRow
            key={person.id}
            person={person}
            subtitle={`@${person.username} · ${t('friends.requests_waiting_response')}`}
            onPress={() => onOpenProfile(person.id)}
            right={
              <Pressable
                onPress={() => onCancelOutgoing(person.id)}
                style={[styles.cancelButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={t('friends.requests_cancel_label')}
              >
                <Text style={[styles.cancelText, { color: theme.colors.foregroundMuted }]}>{t('common.cancel')}</Text>
              </Pressable>
            }
          />
        ))
      )}
    </View>
  );
}

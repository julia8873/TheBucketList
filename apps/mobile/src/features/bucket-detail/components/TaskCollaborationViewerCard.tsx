import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from '@bucketlist/shared';
import { Zap, Clock, UserPlus, Users, X, Check, Heart } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import type { CollaborationMode, CollaborationAudience } from './TaskCollaborationSettingsModal';

interface TaskCollaborationViewerCardProps {
  isOwner: boolean;
  isCollaborator: boolean;
  collaborationMode: CollaborationMode;
  collaborationAudience: CollaborationAudience;
  isFollower: boolean;
  isPendingCollaborator: boolean;
  ownerUsername?: string;
  onRequestOrJoin: () => Promise<void>;
  onCancelRequest: () => Promise<void>;
  onFollowOwner?: () => Promise<void>;
}

export function TaskCollaborationViewerCard({
  isOwner,
  isCollaborator,
  collaborationMode,
  collaborationAudience,
  isFollower,
  isPendingCollaborator,
  ownerUsername = 'el creador',
  onRequestOrJoin,
  onCancelRequest,
  onFollowOwner,
}: TaskCollaborationViewerCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Si es el creador o ya es colaborador aceptado, no mostrar esta tarjeta
  if (isOwner || isCollaborator) return null;

  // Si la tarea es solo por invitación, no mostrar
  if (collaborationMode === 'invite_only' && !isPendingCollaborator) return null;

  const isEligible =
    collaborationAudience === 'anyone' ||
    (collaborationAudience === 'followers' && isFollower);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isPendingCollaborator) {
        await onCancelRequest();
      } else {
        await onRequestOrJoin();
      }
    } finally {
      setLoading(false);
    }
  };

  // Caso 1: Solicitud ya enviada y pendiente
  if (isPendingCollaborator) {
    return (
      <View style={[styles.card, styles.pendingCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCirclePending}>
            <Clock size={18} color="#D4B13A" strokeWidth={2.2} />
          </View>
          <View style={styles.cardTexts}>
            <Text style={styles.cardTitle}>{t('bucket.collab_req_sent')}</Text>
            <Text style={styles.cardSubtitle}>
              {t('bucket.collab_waiting_accept', { username: ownerUsername })}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.btn, styles.cancelBtn]}
          onPress={handleAction}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#9E9E9E" />
          ) : (
            <>
              <X size={15} color="#9E9E9E" />
              <Text style={styles.cancelBtnText}>{t('bucket.collab_cancel_req')}</Text>
            </>
          )}
        </Pressable>
      </View>
    );
  }

  // Caso 2: Es seguidor o la audiencia es 'anyone'
  if (isEligible) {
    const isOpen = collaborationMode === 'open';

    return (
      <View style={[styles.card, isOpen ? styles.openCard : styles.requestCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconCircle, isOpen ? styles.iconCircleOpen : styles.iconCircleRequest]}>
            {isOpen ? (
              <Zap size={18} color="#0D0D0D" strokeWidth={2.5} />
            ) : (
              <UserPlus size={18} color="#D4B13A" strokeWidth={2.2} />
            )}
          </View>
          <View style={styles.cardTexts}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cardTitle}>
                {isOpen ? t('bucket.collab_open_title') : t('bucket.collab_ask_title')}
              </Text>
            </View>
            <Text style={styles.cardSubtitle}>
              {isOpen
                ? t('bucket.collab_open_desc')
                : collaborationAudience === 'followers'
                ? t('bucket.collab_followers_desc', { username: ownerUsername })
                : t('bucket.collab_anyone_desc')}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.btn, isOpen ? styles.joinBtn : styles.requestBtn]}
          onPress={handleAction}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={isOpen ? '#0D0D0D' : '#0D0D0D'} />
          ) : (
            <>
              {isOpen ? (
                <Zap size={16} color="#0D0D0D" strokeWidth={2.4} />
              ) : (
                <UserPlus size={16} color="#0D0D0D" strokeWidth={2.4} />
              )}
              <Text style={styles.btnText}>
                {isOpen ? t('bucket.collab_join_btn') : t('bucket.collab_request_btn')}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    );
  }

  // Caso 3: Es solo para seguidores y el usuario actual aún no lo sigue
  if (collaborationAudience === 'followers' && !isFollower && onFollowOwner) {
    return (
      <View style={[styles.card, styles.lockedCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircleLocked}>
            <Users size={18} color="#8E8E8E" strokeWidth={2} />
          </View>
          <View style={styles.cardTexts}>
            <Text style={styles.cardTitle}>{t('bucket.collab_locked_title')}</Text>
            <Text style={styles.cardSubtitle}>
              {t('bucket.collab_locked_desc', {
                username: ownerUsername,
                action: collaborationMode === 'open' ? t('bucket.collab_join_freely') : t('bucket.collab_request_to_join'),
              })}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.btn, styles.followBtn]}
          onPress={onFollowOwner}
        >
          <Heart size={15} color="#D4B13A" />
          <Text style={styles.followBtnText}>{`${t('profile.follow')} @${ownerUsername}`}</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = themedStyleSheet({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  openCard: {
    backgroundColor: 'rgba(212, 177, 58, 0.08)',
    borderColor: '#D4B13A',
  },
  requestCard: {
    backgroundColor: '#181818',
    borderColor: '#2F2F2F',
  },
  pendingCard: {
    backgroundColor: 'rgba(212, 177, 58, 0.05)',
    borderColor: 'rgba(212, 177, 58, 0.3)',
  },
  lockedCard: {
    backgroundColor: '#161616',
    borderColor: '#262626',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOpen: {
    backgroundColor: '#D4B13A',
  },
  iconCircleRequest: {
    backgroundColor: '#262626',
  },
  iconCirclePending: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 177, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleLocked: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: {
    flex: 1,
  },
  cardTitle: {
    color: '#F5F5F5',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 18,
  },
  cardSubtitle: {
    color: '#9E9E9E',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 3,
    lineHeight: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 20,
    marginTop: 12,
  },
  joinBtn: {
    backgroundColor: '#D4B13A',
  },
  requestBtn: {
    backgroundColor: '#D4B13A',
  },
  btnText: {
    color: '#0D0D0D',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  cancelBtn: {
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#383838',
  },
  cancelBtnText: {
    color: '#B0B0B0',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  followBtn: {
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: '#383838',
  },
  followBtnText: {
    color: '#D4B13A',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});

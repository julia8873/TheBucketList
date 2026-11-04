import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock, Flag, Eye, Users, CheckCircle2, Circle } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/album-detail.styles';

import { useTranslation } from '@bucketlist/shared';

interface AlbumHeaderBadgesProps {
  album: any;
  canEdit: boolean;
  isAlbumClosed: boolean;
  areAllCompleted: boolean;
  onOpenStatus: () => void;
  onOpenVisibility: () => void;
  onOpenPriority: () => void;
}

export function AlbumHeaderBadges({
  album,
  canEdit,
  isAlbumClosed,
  areAllCompleted,
  onOpenStatus,
  onOpenVisibility,
  onOpenPriority,
}: AlbumHeaderBadgesProps) {
  const { t } = useTranslation();

  const priorityColor =
    album.priority === 'high' || album.priority === 'urgent'
      ? '#EF4444'
      : album.priority === 'low'
        ? '#10B981'
        : '#D4B13A';

  const priorityLabel =
    album.priority === 'urgent'
      ? t('common.urgent')
      : album.priority === 'high'
        ? t('common.high')
        : album.priority === 'low'
          ? t('common.low')
          : t('common.medium');

  const visibilityLabel = (v: string) => {
    switch (v) {
      case 'public': return t('albums.visibility_public');
      case 'followers': return t('albums.visibility_followers');
      case 'private': return t('albums.visibility_private');
      default: return v;
    }
  };

  return (
    <View style={styles.chipsContainer}>
      {/* Fila única: Estado, Prioridad y Visibilidad */}
      <View style={[styles.chipsRow, { flexWrap: 'wrap' }]}>
        {/* Estado */}
        <Pressable
          style={[
            styles.chip,
            isAlbumClosed
              ? styles.chipGold
              : areAllCompleted
                ? styles.chipCompleted
                : styles.chipGold,
            canEdit && styles.chipPressable,
          ]}
          onPress={onOpenStatus}
        >
          {isAlbumClosed ? (
            <>
              <Lock size={13} color={gold[400]} strokeWidth={2} style={{ marginRight: 5 }} />
              <Text style={[styles.chipStatusText, { color: gold[400], fontWeight: '700' }]}>
                {t('common.closed')}
              </Text>
            </>
          ) : areAllCompleted ? (
            <>
              <CheckCircle2 size={13} color="#34C759" strokeWidth={2.4} style={{ marginRight: 5 }} />
              <Text style={[styles.chipStatusText, { color: '#34C759', fontWeight: '700' }]}>
                {t('albums.status_completed')}
              </Text>
            </>
          ) : (
            <>
              <Circle size={11} color={gold[400]} strokeWidth={2.4} style={{ marginRight: 5 }} />
              <Text style={[styles.chipStatusText, { color: gold[400], fontWeight: '700' }]}>
                {t('albums.status_in_progress')}
              </Text>
            </>
          )}
        </Pressable>

        {/* Prioridad */}
        <Pressable
          style={[
            styles.chip,
            styles.chipMuted,
            { borderColor: `${priorityColor}66` },
            canEdit && styles.chipPressable,
          ]}
          onPress={onOpenPriority}
        >
          <Flag size={13} color={priorityColor} strokeWidth={2} style={{ marginRight: 5 }} />
          <Text style={[styles.chipText, { color: priorityColor, fontWeight: '600' }]}>
            {priorityLabel}
          </Text>
        </Pressable>

        {/* Visibilidad (misma línea que estado y prioridad) */}
        <Pressable
          style={[styles.chip, styles.chipGold, canEdit && styles.chipPressable]}
          onPress={onOpenVisibility}
        >
          {album.visibility === 'public' ? (
            <Eye size={13} color={gold[400]} strokeWidth={2} style={{ marginRight: 5 }} />
          ) : album.visibility === 'followers' ? (
            <Users size={13} color={gold[400]} strokeWidth={2} style={{ marginRight: 5 }} />
          ) : (
            <Lock size={13} color={gold[400]} strokeWidth={2} style={{ marginRight: 5 }} />
          )}
          <Text style={[styles.chipStatusText, { color: gold[400], fontWeight: '700' }]}>
            {visibilityLabel(album.visibility)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock, Flag, Eye, Users, CheckCircle2, Circle } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/album-detail.styles';

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
  const priorityColor =
    album.priority === 'high' || album.priority === 'urgent'
      ? '#EF4444'
      : album.priority === 'low'
      ? '#10B981'
      : '#D4B13A';

  const priorityLabel =
    album.priority === 'high' || album.priority === 'urgent'
      ? 'Alta'
      : album.priority === 'low'
      ? 'Baja'
      : 'Media';

  const visibilityLabel = (v: string) => {
    switch (v) {
      case 'public': return 'Público';
      case 'followers': return 'Seguidores';
      case 'private': return 'Privado';
      default: return v;
    }
  };

  return (
    <View style={styles.chipsContainer}>
      {/* Primera fila: Estado y Prioridad */}
      <View style={styles.chipsRow}>
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
                Cerrado
              </Text>
            </>
          ) : areAllCompleted ? (
            <>
              <CheckCircle2 size={13} color="#34C759" strokeWidth={2.4} style={{ marginRight: 5 }} />
              <Text style={[styles.chipStatusText, { color: '#34C759', fontWeight: '700' }]}>
                Completado
              </Text>
            </>
          ) : (
            <>
              <Circle size={11} color={gold[400]} strokeWidth={2.4} style={{ marginRight: 5 }} />
              <Text style={[styles.chipStatusText, { color: gold[400], fontWeight: '700' }]}>
                En curso
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
      </View>

      {/* Segunda fila: Visibilidad */}
      <View style={styles.chipsRowSecond}>
        <Pressable
          style={[styles.chip, styles.chipMuted, canEdit && styles.chipPressable]}
          onPress={onOpenVisibility}
        >
          {album.visibility === 'public' ? (
            <Eye size={13} color="#CFCABD" strokeWidth={2} style={{ marginRight: 5 }} />
          ) : album.visibility === 'followers' ? (
            <Users size={13} color="#CFCABD" strokeWidth={2} style={{ marginRight: 5 }} />
          ) : (
            <Lock size={13} color="#CFCABD" strokeWidth={2} style={{ marginRight: 5 }} />
          )}
          <Text style={[styles.chipText, { color: '#F2EFE8', fontWeight: '600' }]}>
            {visibilityLabel(album.visibility)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

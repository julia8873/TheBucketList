import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Lock, Check, Globe, Users, Flag } from 'lucide-react-native';
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

  return (
    <View style={styles.chipsContainer}>
      <View style={styles.chipsRow}>
        {/* Estado */}
        <Pressable
          style={[
            styles.chip,
            styles.chipStatus,
            isAlbumClosed && { borderColor: '#D4B13A', backgroundColor: '#2C2512' },
            !isAlbumClosed && areAllCompleted && { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.14)' },
            canEdit && styles.chipPressable,
          ]}
          onPress={onOpenStatus}
        >
          {isAlbumClosed ? (
            <>
              <Lock size={14} color="#D4B13A" strokeWidth={2} />
              <Text style={[styles.chipStatusText, { color: '#D4B13A' }]}>Cerrado</Text>
            </>
          ) : areAllCompleted ? (
            <>
              <Check size={14} color="#22C55E" strokeWidth={2.5} />
              <Text style={[styles.chipStatusText, { color: '#22C55E' }]}>Completado</Text>
            </>
          ) : (
            <Text style={styles.chipStatusText}>En curso</Text>
          )}
        </Pressable>

        {/* Visibilidad */}
        <Pressable
          style={[styles.chip, canEdit && styles.chipPressable]}
          onPress={onOpenVisibility}
        >
          {album.visibility === 'public' ? (
            <>
              <Globe size={15} color="#F3EEE3" strokeWidth={1.8} />
              <Text style={styles.chipText}>Público</Text>
            </>
          ) : album.visibility === 'followers' ? (
            <>
              <Users size={15} color="#F3EEE3" strokeWidth={1.8} />
              <Text style={styles.chipText}>Solo amigos</Text>
            </>
          ) : (
            <>
              <Lock size={15} color="#F3EEE3" strokeWidth={1.8} />
              <Text style={styles.chipText}>Privado</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Prioridad */}
      <View style={styles.chipsRowSecond}>
        <Pressable
          style={[styles.chip, canEdit && styles.chipPressable]}
          onPress={onOpenPriority}
        >
          <Flag size={14} color={priorityColor} strokeWidth={2} />
          <Text style={[styles.chipText, { color: priorityColor, fontWeight: '600' }]}>
            Prioridad: {priorityLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Skeleton, useTheme, getAlbumCardDimensions } from '@bucketlist/ui';

/**
 * Skeleton para vista detallada de tareas (List mode en Mis Tareas).
 */
export function TaskRowSkeleton() {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.taskRow,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Skeleton width={54} height={54} borderRadius={14} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Skeleton width="70%" height={15} borderRadius={6} style={{ marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Skeleton width="30%" height={11} borderRadius={4} />
          <Skeleton width="20%" height={11} borderRadius={4} />
        </View>
      </View>
      <Skeleton width={22} height={22} borderRadius={11} style={{ marginLeft: 8 }} />
    </View>
  );
}

/**
 * Skeleton para vista compacta de tareas (Día a día / explore.tsx y Compact mode en Mis Tareas).
 */
export function TaskCompactSkeleton() {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.taskCompact,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Skeleton width={18} height={18} borderRadius={9} style={{ marginRight: 10 }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Skeleton width="65%" height={14} borderRadius={6} style={{ marginBottom: 4 }} />
        <Skeleton width="35%" height={10} borderRadius={4} />
      </View>
      <Skeleton width={16} height={16} borderRadius={8} style={{ marginLeft: 8 }} />
    </View>
  );
}

/**
 * Skeleton para vista galería / cuadrícula (Gallery mode en Mis Tareas).
 */
export function TaskGallerySkeleton() {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const cardWidth = Math.floor((width - 40 - 12 - 2) / 2);

  return (
    <View
      style={[
        styles.taskGalleryCard,
        { width: cardWidth, backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Skeleton width="100%" height={150} borderRadius={16} />
      <View style={{ padding: 8 }}>
        <Skeleton width="80%" height={13} borderRadius={5} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={10} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Skeleton para tarjetas de álbumes en Mis Tareas.
 */
export function AlbumCardSkeleton() {
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width);

  return (
    <View style={[styles.albumCard, { width: cardWidth }]}>
      <Skeleton width="100%" height={cardHeight} borderRadius={20} />
      <View style={{ paddingHorizontal: 4, paddingTop: 8 }}>
        <Skeleton width="75%" height={14} borderRadius={5} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={11} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Skeleton para filas de amigos / usuarios (friends.tsx).
 */
export function UserRowSkeleton() {
  return (
    <View style={styles.userRow}>
      <Skeleton width={44} height={44} borderRadius={22} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Skeleton width="55%" height={14} borderRadius={5} style={{ marginBottom: 6 }} />
        <Skeleton width="35%" height={11} borderRadius={4} />
      </View>
      <Skeleton width={75} height={32} borderRadius={16} />
    </View>
  );
}

/**
 * Skeleton completo para perfil de usuario (profile.tsx).
 */
export function ProfileSkeleton() {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const tileWidth = Math.floor((width - 50) / 2);
  const tileHeight = Math.round(tileWidth * 1.3);

  return (
    <View style={styles.profileContainer}>
      {/* Identity */}
      <View style={styles.profileIdentity}>
        <Skeleton width={88} height={88} borderRadius={44} style={{ marginRight: 16 }} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Skeleton width="65%" height={18} borderRadius={6} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={13} borderRadius={5} />
        </View>
      </View>

      {/* Buttons */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        <Skeleton width="48%" height={42} borderRadius={21} />
        <Skeleton width="48%" height={42} borderRadius={21} />
      </View>

      {/* Stats row */}
      <View
        style={[
          styles.profileStats,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Skeleton width="28%" height={36} borderRadius={8} />
        <Skeleton width="28%" height={36} borderRadius={8} />
        <Skeleton width="28%" height={36} borderRadius={8} />
      </View>

      {/* Section Title */}
      <Skeleton width={140} height={18} borderRadius={6} style={{ marginTop: 24, marginBottom: 16 }} />

      {/* Grid of recent tasks */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Skeleton width={tileWidth} height={tileHeight} borderRadius={16} />
        <Skeleton width={tileWidth} height={tileHeight} borderRadius={16} />
        <Skeleton width={tileWidth} height={tileHeight} borderRadius={16} />
        <Skeleton width={tileWidth} height={tileHeight} borderRadius={16} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  taskCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskGalleryCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  albumCard: {
    marginBottom: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  profileContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
});

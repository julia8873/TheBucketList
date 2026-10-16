import React from 'react';
import { View, Pressable } from 'react-native';
import { Typography } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { CheckCircle2, Circle, Flag, Eye, Users, Lock, FolderOpen } from 'lucide-react-native';
import { styles } from '../styles/bucket-detail.styles';

interface BucketHeaderBadgesProps {
  bucket: any;
  canEdit: boolean;
  bucketAlbums: any[];
  albumsData: any[];
  onOpenStatusSheet: () => void;
  onOpenPrioritySheet: () => void;
  onOpenVisibilitySheet: () => void;
  onOpenAlbumsSheet: () => void;
}

export function BucketHeaderBadges({
  bucket,
  canEdit,
  bucketAlbums,
  albumsData,
  onOpenStatusSheet,
  onOpenPrioritySheet,
  onOpenVisibilitySheet,
  onOpenAlbumsSheet,
}: BucketHeaderBadgesProps) {
  const statusLabel = (s: string) => {
    switch (s) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En progreso';
      case 'pending': return 'Pendiente';
      case 'expired': return 'Caducada';
      default: return s;
    }
  };

  const visibilityLabel = (v: string) => {
    switch (v) {
      case 'public': return 'Pública';
      case 'private': return 'Privada';
      case 'followers': return 'Seguidores';
      default: return v;
    }
  };

  const priorityColor = (p?: string) => {
    switch (p) {
      case 'high': return '#EF4444';
      case 'low': return '#10B981';
      case 'medium':
      default: return '#D4B13A';
    }
  };

  const priorityLabel = (p?: string) => {
    switch (p) {
      case 'high': return 'Alta';
      case 'low': return 'Baja';
      case 'medium':
      default: return 'Media';
    }
  };

  return (
    <View style={styles.badgesContainer}>
      <View style={styles.badgesRow}>
        {/* Status */}
        <Pressable
          style={[
            styles.badge,
            bucket.status === 'completed' ? styles.badgeCompleted : styles.badgeGold,
          ]}
          onPress={() => canEdit && onOpenStatusSheet()}
        >
          {bucket.status === 'completed' ? (
            <CheckCircle2 color="#34C759" size={13} strokeWidth={2.4} style={{ marginRight: 5 }} />
          ) : (
            <Circle color={gold[400]} size={11} strokeWidth={2.4} style={{ marginRight: 5 }} />
          )}
          <Typography
            variant="caption"
            color={bucket.status === 'completed' ? '#34C759' : gold[400]}
            style={{ fontWeight: '700' }}
          >
            {statusLabel(bucket.status)}
          </Typography>
        </Pressable>

        {/* Priority */}
        <Pressable
          style={[
            styles.badge,
            styles.badgeMuted,
            { borderColor: `${priorityColor(bucket.priority)}66` },
          ]}
          onPress={() => canEdit && onOpenPrioritySheet()}
        >
          <Flag color={priorityColor(bucket.priority)} size={13} strokeWidth={2} style={{ marginRight: 5 }} />
          <Typography variant="caption" color={priorityColor(bucket.priority)} style={{ fontWeight: '600' }}>
            {priorityLabel(bucket.priority)}
          </Typography>
        </Pressable>

        {/* Visibility */}
        <Pressable
          style={[styles.badge, styles.badgeMuted]}
          onPress={() => canEdit && onOpenVisibilitySheet()}
        >
          {bucket.visibility === 'public' ? (
            <Eye color="#CFCABD" size={13} strokeWidth={2} style={{ marginRight: 5 }} />
          ) : bucket.visibility === 'followers' ? (
            <Users color="#CFCABD" size={13} strokeWidth={2} style={{ marginRight: 5 }} />
          ) : (
            <Lock color="#CFCABD" size={13} strokeWidth={2} style={{ marginRight: 5 }} />
          )}
          <Typography variant="caption" color="#F2EFE8" style={{ fontWeight: '600' }}>
            {visibilityLabel(bucket.visibility)}
          </Typography>
        </Pressable>
      </View>

      {/* Album */}
      {(canEdit || (bucketAlbums && bucketAlbums.length > 0)) && (
        <View style={styles.badgesSecondRow}>
          <Pressable
            style={[styles.badge, styles.badgeMuted]}
            onPress={() => canEdit && onOpenAlbumsSheet()}
          >
            <FolderOpen color="#CFCABD" size={13} strokeWidth={1.8} style={{ marginRight: 5 }} />
            <Typography variant="caption" color="#F2EFE8" style={{ fontWeight: '600' }}>
              {bucketAlbums && bucketAlbums.length > 0
                ? (bucketAlbums.length === 1
                  ? (albumsData?.find((a: any) => a.id === bucketAlbums[0]?.album_id)?.title || 'Sin álbum')
                  : `${bucketAlbums.length} álbumes`)
                : 'Sin álbum'}
            </Typography>
          </Pressable>
        </View>
      )}
    </View>
  );
}

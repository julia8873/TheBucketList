import React from 'react';
import { View, Pressable } from 'react-native';
import { Typography, useTheme } from '@bucketlist/ui';
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
  const { theme } = useTheme();
  const isDark = theme.dark;

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
      case 'low': return isDark ? '#10B981' : '#059669';
      case 'medium':
      default: return isDark ? '#D4B13A' : '#A17808';
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

  const isCompleted = bucket.status === 'completed';
  const statusBg = isCompleted
    ? (isDark ? '#121D15' : '#EAF7EE')
    : (isDark ? '#1E1910' : '#FDF6E2');
  const statusBorder = isCompleted
    ? (isDark ? 'rgba(52, 199, 89, 0.55)' : '#A3E3B6')
    : (isDark ? 'rgba(212, 175, 55, 0.55)' : '#EAD58B');
  const statusColor = isCompleted
    ? (isDark ? '#34C759' : '#15803D')
    : (isDark ? gold[400] : '#997300');

  const mutedBg = isDark ? '#181818' : '#F2EFE8';
  const mutedBorder = isDark ? '#383838' : theme.colors.border;
  const mutedIconColor = isDark ? '#CFCABD' : theme.colors.foregroundMuted;
  const mutedTextColor = isDark ? '#F2EFE8' : theme.colors.foreground;
  const badgeShadow = {
    shadowOpacity: isDark ? 0.35 : 0.08,
    elevation: isDark ? 3 : 1,
  };

  return (
    <View style={styles.badgesContainer}>
      <View style={styles.badgesRow}>
        {/* Status */}
        <Pressable
          style={[
            styles.badge,
            badgeShadow,
            { backgroundColor: statusBg, borderColor: statusBorder },
          ]}
          onPress={() => canEdit && onOpenStatusSheet()}
        >
          {isCompleted ? (
            <CheckCircle2 color={statusColor} size={13} strokeWidth={2.4} style={{ marginRight: 5 }} />
          ) : (
            <Circle color={statusColor} size={11} strokeWidth={2.4} style={{ marginRight: 5 }} />
          )}
          <Typography
            variant="caption"
            color={statusColor}
            style={{ fontWeight: '700' }}
          >
            {statusLabel(bucket.status)}
          </Typography>
        </Pressable>

        {/* Priority */}
        <Pressable
          style={[
            styles.badge,
            badgeShadow,
            {
              backgroundColor: mutedBg,
              borderColor: `${priorityColor(bucket.priority)}${isDark ? '66' : '99'}`,
            },
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
          style={[
            styles.badge,
            badgeShadow,
            { backgroundColor: mutedBg, borderColor: mutedBorder },
          ]}
          onPress={() => canEdit && onOpenVisibilitySheet()}
        >
          {bucket.visibility === 'public' ? (
            <Eye color={mutedIconColor} size={13} strokeWidth={2} style={{ marginRight: 5 }} />
          ) : bucket.visibility === 'followers' ? (
            <Users color={mutedIconColor} size={13} strokeWidth={2} style={{ marginRight: 5 }} />
          ) : (
            <Lock color={mutedIconColor} size={13} strokeWidth={2} style={{ marginRight: 5 }} />
          )}
          <Typography variant="caption" color={mutedTextColor} style={{ fontWeight: '600' }}>
            {visibilityLabel(bucket.visibility)}
          </Typography>
        </Pressable>
      </View>

      {/* Album */}
      {(canEdit || (bucketAlbums && bucketAlbums.length > 0)) && (
        <View style={styles.badgesSecondRow}>
          <Pressable
            style={[
              styles.badge,
              badgeShadow,
              { backgroundColor: mutedBg, borderColor: mutedBorder },
            ]}
            onPress={() => canEdit && onOpenAlbumsSheet()}
          >
            <FolderOpen color={mutedIconColor} size={13} strokeWidth={1.8} style={{ marginRight: 5 }} />
            <Typography variant="caption" color={mutedTextColor} style={{ fontWeight: '600' }}>
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

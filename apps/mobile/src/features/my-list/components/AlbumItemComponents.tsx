import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { GripVertical, Lock, Star, Users } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { styles } from '../styles/my-list.styles';
import { DragHandle } from '@/components/DraggableTaskList';

const COVER_GRADIENTS: Array<[string, string]> = [
  ['#1B4D3E', '#0A2E25'],
  ['#C87A2B', '#7A3D00'],
  ['#2B5BA8', '#0D2F6E'],
  ['#6B2FA0', '#3A0070'],
];

export const AlbumCoverThumb = React.memo(function AlbumCoverThumb({
  coverUri,
  colorIndex = 0,
  size = 40,
}: {
  coverUri?: string | null;
  colorIndex?: number;
  size?: number;
}) {
  const [g1, g2] = COVER_GRADIENTS[colorIndex % COVER_GRADIENTS.length] || ['#1B4D3E', '#0A2E25'];
  let parsedCover: any = null;
  if (coverUri && coverUri.startsWith('{')) {
    try {
      parsedCover = JSON.parse(coverUri);
    } catch {}
  }

  let inner;
  if (parsedCover?.type === 'image' && parsedCover.uri) {
    inner = <ExpoImage source={{ uri: parsedCover.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
  } else if ((parsedCover?.type === 'gradient' || parsedCover?.type === 'solid') && parsedCover.colors) {
    inner = <LinearGradient colors={parsedCover.colors} style={StyleSheet.absoluteFill} />;
  } else if (coverUri && !parsedCover) {
    inner = <ExpoImage source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
  } else {
    inner = <LinearGradient colors={[g1, g2]} style={StyleSheet.absoluteFill} />;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: size > 40 ? 10 : 8, overflow: 'hidden' }}>
      {inner}
    </View>
  );
});

export const AlbumCompactItemRow = React.memo(function AlbumCompactItemRow({
  item,
  drag,
  isFav,
  onPress,
}: {
  item: any;
  drag?: DragHandle;
  isFav: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const total = item.total_tasks ?? 0;
  const completed = item.completed_tasks ?? 0;
  const isCompleted = total > 0 && completed === total;

  return (
    <Pressable
      key={item.id}
      onPress={onPress}
      style={[
        styles.compactRow,
        {
          backgroundColor: isCompleted
            ? (theme.dark ? '#121212' : '#EDE8DE')
            : theme.colors.surface,
          borderColor: theme.colors.border,
        },
        drag?.isActive && { borderColor: theme.colors.primary },
        { marginBottom: drag ? 8 : 0 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {drag && (
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center' }}
          accessibilityLabel="Arrastrar para reordenar"
        >
          <GripVertical size={18} color={drag.isActive ? theme.colors.primary : theme.colors.foregroundMuted} strokeWidth={2} />
        </View>
      )}

      <View style={{ marginRight: 10 }}>
        <AlbumCoverThumb coverUri={item.cover_path} colorIndex={0} size={32} />
      </View>

      <Text numberOfLines={1} style={[styles.compactTitle, { color: isCompleted ? theme.colors.foregroundMuted : theme.colors.foreground }]}>
        {item.title}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}>
        {item.is_closed ? <Lock size={12} color={theme.colors.foregroundMuted} /> : null}
        {item.is_shared ? <Users size={12} color={theme.colors.primary} /> : null}
        <View
          style={{
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: isCompleted
              ? 'rgba(52, 199, 89, 0.15)'
              : (theme.dark ? '#222' : '#E8E3D8'),
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: isCompleted ? '#34C759' : theme.colors.foregroundMuted,
            }}
          >
            {completed}/{total}
          </Text>
        </View>
        {isFav && <Star size={13} color={theme.colors.primary} fill={theme.colors.primary} />}
      </View>
    </Pressable>
  );
});

export const AlbumListItemRow = React.memo(function AlbumListItemRow({
  item,
  drag,
  index = 0,
  isFav,
  onPress,
  onToggleFavorite,
}: {
  item: any;
  drag?: DragHandle;
  index?: number;
  isFav: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const { theme } = useTheme();
  const total = item.total_tasks ?? 0;
  const completed = item.completed_tasks ?? 0;
  const progress = total > 0 ? completed / total : 0;
  const priority = item.priority;
  const priorityColor =
    priority === 'high' || priority === 'urgent'
      ? '#EF4444'
      : priority === 'low'
      ? '#10B981'
      : theme.colors.primary;
  const priorityLabel =
    priority === 'high' || priority === 'urgent' ? 'Alta' : priority === 'low' ? 'Baja' : 'Media';

  return (
    <View
      key={item.id}
      style={[
        drag ? { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 } : { marginBottom: 10 },
      ]}
    >
      {drag && (
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
          style={{ width: 28, height: 68, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="Arrastrar para reordenar"
        >
          <GripVertical size={20} color={drag.isActive ? theme.colors.primary : theme.colors.foregroundMuted} strokeWidth={2} />
        </View>
      )}
      <Pressable
        onPress={onPress}
        style={[
          styles.listAlbumCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          drag && { flex: 1 },
          drag?.isActive && { borderColor: theme.colors.primary },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={{ marginRight: 12 }}>
          <AlbumCoverThumb coverUri={item.cover_path} colorIndex={index} size={54} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.listAlbumTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Pressable hitSlop={8} onPress={onToggleFavorite}>
              <Star
                size={16}
                color={isFav ? theme.colors.primary : theme.colors.foregroundMuted}
                fill={isFav ? theme.colors.primary : 'transparent'}
              />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Text style={[styles.listAlbumMeta, { color: theme.colors.foregroundMuted }]}>
              {total} {total === 1 ? 'tarea' : 'tareas'} · {completed} {completed === 1 ? 'completada' : 'completadas'}
            </Text>

            {item.is_shared && (
              <View style={[styles.listAlbumBadge, { backgroundColor: theme.colors.surfaceSunken, borderColor: theme.colors.border }]}>
                <Users size={10} color={theme.colors.foregroundMuted} />
                <Text style={[styles.listAlbumBadgeText, { color: theme.colors.foregroundMuted }]}>Compartido</Text>
              </View>
            )}

            {item.is_closed && (
              <View style={[styles.listAlbumBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                <Lock size={10} color="#EF4444" />
                <Text style={[styles.listAlbumBadgeText, { color: '#EF4444' }]}>Cerrado</Text>
              </View>
            )}

            {priority && (
              <View style={[styles.listAlbumBadge, { borderColor: priorityColor }]}>
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: priorityColor }} />
                <Text style={[styles.listAlbumBadgeText, { color: priorityColor }]}>{priorityLabel}</Text>
              </View>
            )}
          </View>

          <View style={[styles.listAlbumProgressTrack, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.listAlbumProgressFill, { backgroundColor: theme.colors.primary, width: `${Math.round(progress * 100)}%` as any }]} />
          </View>
        </View>
      </Pressable>
    </View>
  );
});

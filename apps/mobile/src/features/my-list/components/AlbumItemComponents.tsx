import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { GripVertical, Lock, Star, Users } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/my-list.styles';
import { DragHandle } from '@/components/DraggableTaskList';

const COVER_GRADIENTS: Array<[string, string]> = [
  ['#1B4D3E', '#0A2E25'],
  ['#C87A2B', '#7A3D00'],
  ['#2B5BA8', '#0D2F6E'],
  ['#6B2FA0', '#3A0070'],
];

export function AlbumCoverThumb({
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
}

export function AlbumCompactItemRow({
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
  const total = item.total_tasks ?? 0;
  const completed = item.completed_tasks ?? 0;
  const isCompleted = total > 0 && completed === total;

  return (
    <Pressable
      key={item.id}
      onPress={onPress}
      style={[
        styles.compactRow,
        isCompleted && styles.compactRowCompleted,
        drag?.isActive && { borderColor: gold[400] },
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
          <GripVertical size={18} color={drag.isActive ? gold[400] : '#8F8F8F'} strokeWidth={2} />
        </View>
      )}

      <View style={{ marginRight: 10 }}>
        <AlbumCoverThumb coverUri={item.cover_path} colorIndex={0} size={32} />
      </View>

      <Text numberOfLines={1} style={[styles.compactTitle, isCompleted && { color: '#888' }]}>
        {item.title}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}>
        {item.is_closed ? <Lock size={12} color="#888" /> : null}
        {item.is_shared ? <Users size={12} color={gold[400]} /> : null}
        <View
          style={{
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 6,
            backgroundColor: isCompleted ? 'rgba(52, 199, 89, 0.15)' : '#222',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: isCompleted ? '#34C759' : '#AAA',
            }}
          >
            {completed}/{total}
          </Text>
        </View>
        {isFav && <Star size={13} color={gold[400]} fill={gold[400]} />}
      </View>
    </Pressable>
  );
}

export function AlbumListItemRow({
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
  const total = item.total_tasks ?? 0;
  const completed = item.completed_tasks ?? 0;
  const progress = total > 0 ? completed / total : 0;
  const priority = item.priority;
  const priorityColor =
    priority === 'high' || priority === 'urgent'
      ? '#EF4444'
      : priority === 'low'
      ? '#10B981'
      : '#D4B13A';
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
          <GripVertical size={20} color={drag.isActive ? gold[400] : '#8F8F8F'} strokeWidth={2} />
        </View>
      )}
      <Pressable
        onPress={onPress}
        style={[
          styles.listAlbumCard,
          drag && { flex: 1 },
          drag?.isActive && { borderColor: gold[400] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={{ marginRight: 12 }}>
          <AlbumCoverThumb coverUri={item.cover_path} colorIndex={index} size={54} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.listAlbumTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Pressable hitSlop={8} onPress={onToggleFavorite}>
              <Star
                size={16}
                color={isFav ? gold[400] : '#666'}
                fill={isFav ? gold[400] : 'transparent'}
              />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Text style={styles.listAlbumMeta}>
              {total} {total === 1 ? 'tarea' : 'tareas'} · {completed} {completed === 1 ? 'hecha' : 'hechas'}
            </Text>

            {item.is_shared && (
              <View style={styles.listAlbumBadge}>
                <Users size={10} color="#AAA" />
                <Text style={styles.listAlbumBadgeText}>Compartido</Text>
              </View>
            )}

            {item.is_closed && (
              <View style={styles.listAlbumBadge}>
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

          <View style={styles.listAlbumProgressTrack}>
            <View style={[styles.listAlbumProgressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

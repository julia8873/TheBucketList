import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { differenceInCalendarDays } from 'date-fns';
import { Pill, ProgressBar, UrgencyChip, fontFamily, gold } from '@bucketlist/ui';
import { BucketCover } from './BucketCover';
import { useAuthStore } from '../stores/auth.store';
import { useCopiedBucketIds, useCopyBucket } from '../hooks/useSocial';

interface PublicTaskRowProps {
  bucket: any;
  /** true si el perfil que se está viendo es el mío. */
  isOwnProfile?: boolean;
  onPress: () => void;
}

function buildMeta(bucket: any): string {
  const subtasks: Array<{ done: boolean }> = bucket.item_subtasks ?? [];
  const done = subtasks.filter((s) => s.done).length;

  let detail: string;
  if (subtasks.length > 0) {
    detail = `${done} de ${subtasks.length} pasos`;
  } else if (bucket.location_text) {
    detail = bucket.location_text;
  } else if (bucket.deadline) {
    detail = new Date(bucket.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } else {
    detail = 'Sin fecha';
  }
  return detail;
}

function buildProgress(bucket: any): number | null {
  const subtasks: Array<{ done: boolean }> = bucket.item_subtasks ?? [];
  if (subtasks.length > 0) return Math.round((subtasks.filter((s) => s.done).length / subtasks.length) * 100);
  if (bucket.counter_enabled && bucket.counter_target > 0) {
    return Math.round(Math.min(1, (bucket.counter_count ?? 0) / bucket.counter_target) * 100);
  }
  return null;
}

/** Fila de tarea de un perfil público (miniatura, título, meta, progreso y chip de estado). */
export function PublicTaskRow({ bucket, isOwnProfile = false, onPress }: PublicTaskRowProps) {
  const { user } = useAuthStore();
  const copyBucket = useCopyBucket();
  const { data: copiedIds } = useCopiedBucketIds(user?.id);

  const completed = bucket.status === 'completed';
  const hasFutureDeadline = !!bucket.deadline && differenceInCalendarDays(new Date(bucket.deadline), new Date()) >= 0;
  const alreadyCopied = !!copiedIds?.includes(bucket.id);
  const photo = bucket.bucket_photos?.[0];
  const progress = completed ? null : buildProgress(bucket);

  const handleCopy = () => {
    if (!user || alreadyCopied || copyBucket.isPending) return;
    copyBucket.mutate(
      { bucketId: bucket.id, userId: user.id },
      { onError: (error: any) => Alert.alert('No se pudo añadir', error?.message ?? 'Inténtalo de nuevo.') }
    );
  };

  let chip: React.ReactNode = null;
  if (completed) {
    chip = <Pill label="Completada" variant="outline-gold" />;
  } else if (hasFutureDeadline) {
    chip = <UrgencyChip deadline={bucket.deadline} />;
  } else if (!isOwnProfile) {
    chip = alreadyCopied ? (
      <Pill label="En tu lista" variant="muted" />
    ) : (
      <Pressable onPress={handleCopy} disabled={copyBucket.isPending} hitSlop={6} accessibilityRole="button" accessibilityLabel="Yo también">
        <Pill label="Yo también" variant="outline-gold" />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? '#202020' : '#161616' }]}
      accessibilityRole="button"
      accessibilityLabel={bucket.title}
    >
      <BucketCover
        value={photo?.storage_path ?? bucket.cover_image ?? null}
        title={bucket.title}
        categorySlug={bucket.category?.slug}
        seed={bucket.id}
        iconSize={56}
        style={styles.thumb}
      />

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {bucket.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {buildMeta(bucket)}
        </Text>
        {progress !== null ? <ProgressBar value={progress} colorOverride={gold[400]} style={styles.progress} /> : null}
      </View>

      {chip ? <View style={styles.chip}>{chip}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  content: { flex: 1, gap: 3 },
  title: { fontFamily: fontFamily.serif, fontSize: 16, lineHeight: 22, color: '#FFFFFF' },
  meta: { fontFamily: fontFamily.regular, fontSize: 13, color: '#9A9A9A' },
  progress: { marginTop: 4 },
  chip: { flexShrink: 0 },
});

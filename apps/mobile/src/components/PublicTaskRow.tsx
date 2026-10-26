import React from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { differenceInCalendarDays } from 'date-fns';
import { Pill, ProgressBar, UrgencyChip, fontFamily, gold, useTheme, useCoverOverlay, toast } from '@bucketlist/ui';
import { Star } from 'lucide-react-native';
import { BucketCover } from './BucketCover';
import { resolveTaskImage } from '../utils/taskImage';
import { useAuthStore } from '../stores/auth.store';
import { useCopiedBucketIds, useCopyBucket } from '../hooks/useSocial';
import { useTranslation } from '@bucketlist/shared';
import type { TaskViewMode } from './ViewModeSelector';

interface PublicTaskRowProps {
  bucket: any;
  /** true si el perfil que se está viendo es el mío. */
  isOwnProfile?: boolean;
  isFavorite?: boolean;
  onPress: () => void;
  mode?: TaskViewMode;
}

function buildMeta(bucket: any, t: (key: any, options?: any) => string, locale: string): string {
  const completed = bucket.status === 'completed';
  const subtasks: Array<{ done: boolean }> = bucket.item_subtasks ?? [];
  const done = subtasks.filter((s) => s.done).length;

  let detail: string;
  if (completed) {
    if (bucket.completed_at) {
      detail = `${t('common.completed')} · ${new Date(bucket.completed_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`;
    } else {
      detail = t('common.completed');
    }
  } else if (subtasks.length > 0) {
    detail = t('tasks.steps_count', { done, total: subtasks.length });
  } else if (bucket.location_text) {
    detail = bucket.location_text;
  } else if (bucket.deadline) {
    detail = new Date(bucket.deadline).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } else {
    detail = t('common.no_date');
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

/** Fila/tarjeta de tarea de un perfil público (soporta list, gallery y compact). */
export function PublicTaskRow({ bucket, isOwnProfile = false, isFavorite = false, onPress, mode = 'list' }: PublicTaskRowProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-ES';
  const { theme } = useTheme();
  const overlay = useCoverOverlay();
  const { user } = useAuthStore();
  const copyBucket = useCopyBucket();
  const { data: copiedIds } = useCopiedBucketIds(user?.id);

  const completed = bucket.status === 'completed';
  const hasFutureDeadline = !!bucket.deadline && differenceInCalendarDays(new Date(bucket.deadline), new Date()) >= 0;
  const alreadyCopied = !!copiedIds?.includes(bucket.id);
  const progress = completed ? null : buildProgress(bucket);

  const handleCopy = () => {
    if (!user || alreadyCopied || copyBucket.isPending) return;
    copyBucket.mutate(
      { bucketId: bucket.id, userId: user.id },
      { onError: (error: any) => toast.error(error?.message ?? t('common.error')) }
    );
  };

  let chip: React.ReactNode = null;
  if (!isOwnProfile) {
    chip = alreadyCopied ? (
      <Pill label={t('tasks.in_your_list')} variant="muted" />
    ) : (
      <Pressable onPress={handleCopy} disabled={copyBucket.isPending} hitSlop={6} accessibilityRole="button" accessibilityLabel={t('tasks.me_too')}>
        <Pill label={t('tasks.me_too')} variant="outline-gold" />
      </Pressable>
    );
  } else if (completed) {
    chip = <Pill label={t('common.completed')} variant="outline-gold" />;
  } else if (hasFutureDeadline) {
    chip = <UrgencyChip deadline={bucket.deadline} />;
  }

  const pressedBg = theme.colors.secondary;

  if (mode === 'gallery') {
    const coverVal = resolveTaskImage(bucket);
    const isImageCover = !!coverVal && !coverVal.startsWith('preset:');
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.galleryCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={bucket.title}
      >
        <BucketCover
          value={coverVal}
            title={bucket.title}
            categorySlug={bucket.category?.slug}
            seed={bucket.id}
            iconSize={90}
            style={styles.galleryCover}
          >
            {!isImageCover && (
              <LinearGradient
                colors={overlay.fadeBoth}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            )}

          {isFavorite ? (
            <View
              style={[
                styles.favoriteBadge,
                {
                  backgroundColor: theme.dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.92)',
                  borderColor: gold[400],
                  borderWidth: 1,
                },
              ]}
            >
              <Star size={13} color={gold[500]} fill={gold[500]} />
            </View>
          ) : null}

          {chip ? <View style={styles.galleryTopChip}>{chip}</View> : null}

          <View style={styles.galleryBottom} pointerEvents="none">
            <Text
              style={[
                styles.galleryTitle,
                { color: overlay.title },
              ]}
              numberOfLines={2}
            >
              {bucket.title}
            </Text>
            <Text style={[styles.galleryMeta, { color: overlay.meta }]} numberOfLines={1}>
              {buildMeta(bucket, t, locale)}
            </Text>
          </View>
        </BucketCover>
      </Pressable>
    );
  }

  if (mode === 'compact') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.compactRow,
          {
            backgroundColor: pressed ? pressedBg : theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={bucket.title}
      >
        <BucketCover
          value={resolveTaskImage(bucket, { preferThumb: true })}
          title={bucket.title}
          categorySlug={bucket.category?.slug}
          seed={bucket.id}
          iconSize={40}
          style={styles.compactThumb}
        />

        <View style={styles.compactContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {isFavorite ? <Star size={13} color={gold[400]} fill={gold[400]} /> : null}
            <Text style={[styles.compactTitle, { color: theme.colors.foreground, flex: 1 }]} numberOfLines={1}>
              {bucket.title}
            </Text>
          </View>
          <Text style={[styles.compactMeta, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
            {buildMeta(bucket, t, locale)}
          </Text>
        </View>

        {chip ? <View style={styles.chip}>{chip}</View> : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? pressedBg : theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={bucket.title}
    >
      <BucketCover
        value={resolveTaskImage(bucket, { preferThumb: true })}
        title={bucket.title}
        categorySlug={bucket.category?.slug}
        seed={bucket.id}
        iconSize={56}
        style={styles.thumb}
      />

      <View style={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isFavorite ? <Star size={14} color={gold[400]} fill={gold[400]} /> : null}
          <Text style={[styles.title, { color: theme.colors.foreground, flex: 1 }]} numberOfLines={2}>
            {bucket.title}
          </Text>
        </View>
        <Text style={[styles.meta, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
          {buildMeta(bucket, t, locale)}
        </Text>
        {progress !== null ? <ProgressBar value={progress} colorOverride={theme.colors.primary} style={styles.progress} /> : null}
      </View>

      {chip ? <View style={styles.chip}>{chip}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Lista detallada (default)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  content: { flex: 1, gap: 3 },
  title: { fontFamily: fontFamily.serif, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: fontFamily.regular, fontSize: 13 },
  progress: { marginTop: 4 },
  chip: { flexShrink: 0 },

  // Galería
  galleryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  galleryCover: {
    width: '100%',
    aspectRatio: 0.85,
  },
  galleryTopChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  galleryTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(0,0,0,0.85)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  galleryMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },

  // Compacto
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  compactThumb: { width: 40, height: 40, borderRadius: 8, overflow: 'hidden' },
  compactContent: { flex: 1, gap: 2 },
  compactTitle: { fontFamily: fontFamily.semibold, fontSize: 14 },
  compactMeta: { fontFamily: fontFamily.regular, fontSize: 12 },
});


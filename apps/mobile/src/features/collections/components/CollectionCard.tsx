import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Copy, Heart, Layers } from 'lucide-react-native';
import { useTheme, gold, fontFamily } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { TaskViewMode } from '../../../components/ViewModeSelector';
import { CollectionItem } from '../types';

interface CollectionCardProps {
  collection: CollectionItem;
  onPress: () => void;
  onClone?: () => void;
  isCloning?: boolean;
  onToggleLike?: () => void;
  mode?: TaskViewMode;
  index?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

export function CollectionCard({
  collection,
  onPress,
  onClone,
  isCloning = false,
  onToggleLike,
  mode = 'list',
  index = 0,
  containerStyle,
}: CollectionCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  // ── MODO GALERÍA (2 columnas simétricas sin solapamiento) ──────────────
  if (mode === 'gallery') {
    const isLeftColumn = index % 2 === 0;
    return (
      <View
        style={[
          styles.galleryCardWrapper,
          isLeftColumn ? styles.galleryLeftCol : styles.galleryRightCol,
          containerStyle,
        ]}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.galleryCard,
            {
              backgroundColor: theme.dark ? '#1E1E1E' : '#F0EDE6',
              borderColor: theme.colors.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('collections.card_a11y', { title: collection.title })}
        >
          <View style={styles.galleryCover}>
            <LinearGradient
              colors={collection.gradientColors}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.88)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Header: badge y contador de tareas */}
            <View style={styles.galleryHeaderRow}>
              <View style={styles.galleryBadgePill}>
                <Text style={styles.galleryBadgeText} numberOfLines={1}>
                  {collection.badge}
                </Text>
              </View>
              <View style={styles.galleryTaskBadge}>
                <Layers size={10} color="#FFF" />
                <Text style={styles.galleryTaskBadgeText}>{collection.tasks.length}</Text>
              </View>
            </View>

            {/* Inferior: emoji, título, autor y acciones */}
            <View style={styles.galleryBottom}>
              <Text style={styles.galleryEmoji}>{collection.emoji}</Text>
              <Text style={styles.galleryTitle} numberOfLines={1}>
                {collection.title}
              </Text>
              <Text style={styles.gallerySubtext} numberOfLines={1}>
                {t('collections.by_author', {
                  name: collection.author?.name || t('collections.community'),
                })}
              </Text>

              <View style={styles.galleryActions}>
                {collection.clonesCount !== undefined && collection.clonesCount > 0 ? (
                  <View style={styles.galleryActionItem}>
                    <Copy size={11} color="#F2EFE8" />
                    <Text style={styles.galleryActionText}>{collection.clonesCount}</Text>
                  </View>
                ) : null}
                {onToggleLike && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onToggleLike();
                    }}
                    hitSlop={6}
                    style={styles.galleryActionItem}
                    accessibilityRole="button"
                    accessibilityLabel={
                      collection.isLiked
                        ? t('collections.unlike')
                        : t('collections.like')
                    }
                  >
                    <Heart
                      size={12}
                      color={collection.isLiked ? '#EF4444' : '#F2EFE8'}
                      fill={collection.isLiked ? '#EF4444' : 'transparent'}
                    />
                    {collection.likesCount !== undefined && collection.likesCount > 0 ? (
                      <Text
                        style={[
                          styles.galleryActionText,
                          collection.isLiked && { color: '#EF4444' },
                        ]}
                      >
                        {collection.likesCount}
                      </Text>
                    ) : null}
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </View>
    );
  }

  // ── MODO COMPACTO (Fila delgada con thumbnail, texto y botones) ──────────────
  if (mode === 'compact') {
    return (
      <View style={[styles.compactCardWrapper, containerStyle]}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.compactCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('collections.card_a11y', { title: collection.title })}
        >
          {/* Thumbnail con degradado y emoji */}
          <View style={styles.compactThumbWrapper}>
            <LinearGradient
              colors={collection.gradientColors}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.compactEmoji}>{collection.emoji}</Text>
          </View>

          {/* Info */}
          <View style={styles.compactInfo}>
            <View style={styles.compactHeaderRow}>
              <Text style={styles.compactBadge} numberOfLines={1}>
                {collection.badge}
              </Text>
              <Text style={[styles.compactDot, { color: theme.colors.foregroundSubtle }]}>·</Text>
              <Text style={[styles.compactTasksCount, { color: theme.colors.foregroundSubtle }]}>
                {collection.tasks.length === 1
                  ? t('collections.tasks_count_single', { count: 1 })
                  : t('collections.tasks_count_plural', { count: collection.tasks.length })}
              </Text>
            </View>
            <Text style={[styles.compactTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
              {collection.title}
            </Text>
          </View>

          {/* Acciones */}
          <View style={styles.compactActions}>
            {onToggleLike && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onToggleLike();
                }}
                hitSlop={6}
                style={styles.compactActionBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  collection.isLiked
                    ? t('collections.unlike')
                    : t('collections.like')
                }
              >
                <Heart
                  size={15}
                  color={collection.isLiked ? '#EF4444' : theme.colors.foregroundSubtle}
                  fill={collection.isLiked ? '#EF4444' : 'transparent'}
                  strokeWidth={1.8}
                />
                {collection.likesCount !== undefined && collection.likesCount > 0 ? (
                  <Text
                    style={[
                      styles.compactActionCount,
                      { color: collection.isLiked ? '#EF4444' : theme.colors.foregroundSubtle },
                    ]}
                  >
                    {collection.likesCount}
                  </Text>
                ) : null}
              </Pressable>
            )}

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                if (onClone) onClone();
                else onPress();
              }}
              disabled={isCloning}
              hitSlop={6}
              style={[
                styles.compactCloneBtn,
                { opacity: isCloning ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('collections.clone_a11y', { title: collection.title })}
            >
              <Copy size={12} color="#000" strokeWidth={2.2} />
              <Text style={styles.compactCloneBtnText}>
                {isCloning ? '...' : t('collections.clone')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  }

  // ── MODO LISTA (Grande por defecto) ─────────────────────────────────────────
  return (
    <View style={[styles.cardWrapper, containerStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('collections.card_a11y', { title: collection.title })}
      >
        {/* Cover con degradado y badge temático */}
        <View style={styles.cover}>
          <LinearGradient
            colors={collection.gradientColors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.coverTopRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{collection.badge}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {collection.clonesCount !== undefined && collection.clonesCount > 0 ? (
                <View style={styles.taskCountBadge}>
                  <Copy size={11} color="#FFF" />
                  <Text style={styles.taskCountBadgeText}>{collection.clonesCount}</Text>
                </View>
              ) : null}
              <View style={styles.taskCountBadge}>
                <Layers size={12} color="#FFF" />
                <Text style={styles.taskCountBadgeText}>
                  {collection.tasks.length === 1
                    ? t('collections.tasks_count_single', { count: 1 })
                    : t('collections.tasks_count_plural', { count: collection.tasks.length })}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.coverBottom}>
            <Text style={styles.emojiIcon}>{collection.emoji}</Text>
            <Text style={styles.coverTitle} numberOfLines={1}>
              {collection.title}
            </Text>
          </View>
        </View>

        {/* Contenido inferior */}
        <View style={styles.content}>
          <Text style={[styles.description, { color: theme.colors.foregroundMuted }]} numberOfLines={2}>
            {collection.description}
          </Text>

          {/* Muestra de las 2 primeras tareas */}
          <View style={styles.taskPreviewContainer}>
            {collection.tasks.slice(0, 2).map((tItem, idx) => (
              <View key={idx} style={styles.taskPreviewRow}>
                <View style={[styles.taskBullet, { backgroundColor: gold[400] }]} />
                <Text style={[styles.taskPreviewText, { color: theme.colors.foreground }]} numberOfLines={1}>
                  {tItem.title}
                </Text>
              </View>
            ))}
            {collection.tasks.length > 2 && (
              <Text style={[styles.taskMoreText, { color: theme.colors.foregroundSubtle }]}>
                {t('collections.more_tasks', {
                  count: collection.tasks.length - 2,
                })}
              </Text>
            )}
          </View>

          {/* Botón inferior: Like / Autor / Clonar */}
          <View style={styles.footerRow}>
            <View style={styles.authorAndLikeRow}>
              <Text style={[styles.authorText, { color: theme.colors.foregroundSubtle }]}>
                {t('collections.by_author', {
                  name: collection.author?.name || t('collections.community'),
                })}
              </Text>
              {onToggleLike && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onToggleLike();
                  }}
                  hitSlop={8}
                  style={styles.likeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={
                    collection.isLiked
                      ? t('collections.unlike')
                      : t('collections.like')
                  }
                >
                  <Heart
                    size={15}
                    color={collection.isLiked ? '#EF4444' : theme.colors.foregroundMuted}
                    fill={collection.isLiked ? '#EF4444' : 'transparent'}
                  />
                  {collection.likesCount !== undefined && collection.likesCount > 0 && (
                    <Text
                      style={[
                        styles.likeCountText,
                        { color: collection.isLiked ? '#EF4444' : theme.colors.foregroundMuted },
                      ]}
                    >
                      {collection.likesCount}
                    </Text>
                  )}
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                if (onClone) onClone();
                else onPress();
              }}
              disabled={isCloning}
              style={({ pressed }) => [
                styles.cloneBtn,
                { opacity: pressed || isCloning ? 0.75 : 1 },
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('collections.clone_a11y', { title: collection.title })}
            >
              <Copy size={13} color="#0E0E0E" strokeWidth={2.2} />
              <Text style={styles.cloneBtnText}>
                {isCloning
                  ? t('collections.cloning')
                  : t('collections.clone')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── MODO LISTA ──────────────────────────────────────────────
  cardWrapper: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cover: {
    height: 125,
    padding: 14,
    justifyContent: 'space-between',
    position: 'relative',
  },
  coverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  taskCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskCountBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  coverBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emojiIcon: {
    fontSize: 22,
  },
  coverTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fontFamily.serifBold,
    color: '#FFF',
    flex: 1,
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(0,0,0,0.6)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  content: {
    padding: 14,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  taskPreviewContainer: {
    gap: 6,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    borderRadius: 10,
  },
  taskPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskPreviewText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  taskMoreText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  authorAndLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorText: {
    fontSize: 11,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  likeCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cloneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gold[400],
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  cloneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E0E0E',
  },

  // ── MODO GALERÍA ──────────────────────────────────────────
  galleryCardWrapper: {
    flex: 1,
    paddingVertical: 5,
  },
  galleryLeftCol: {
    paddingLeft: 16,
    paddingRight: 5,
  },
  galleryRightCol: {
    paddingLeft: 5,
    paddingRight: 16,
  },
  galleryCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
  },
  galleryCover: {
    width: '100%',
    aspectRatio: 0.85,
    position: 'relative',
    justifyContent: 'space-between',
    padding: 10,
  },
  galleryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  galleryBadgePill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    maxWidth: '70%',
  },
  galleryBadgeText: {
    fontSize: 9,
    fontFamily: fontFamily.bold,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  galleryTaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  galleryTaskBadgeText: {
    fontSize: 10,
    fontFamily: fontFamily.semibold,
    color: '#FFF',
  },
  galleryBottom: {
    zIndex: 2,
  },
  galleryEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  galleryTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
    ...Platform.select({
      web: { textShadow: '0 1px 4px rgba(0,0,0,0.9)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  gallerySubtext: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    ...Platform.select({
      web: { textShadow: '0 1px 2px rgba(0,0,0,0.8)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
    }),
  },
  galleryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  galleryActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  galleryActionText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#F2EFE8',
  },

  // ── MODO COMPACTO ─────────────────────────────────────────
  compactCardWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  compactThumbWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactEmoji: {
    fontSize: 20,
    zIndex: 2,
  },
  compactInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactBadge: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: gold[400],
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  compactDot: {
    fontSize: 12,
  },
  compactTasksCount: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  compactTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 14,
    lineHeight: 18,
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactActionCount: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
  compactCloneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: gold[400],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  compactCloneBtnText: {
    fontSize: 11,
    fontFamily: fontFamily.bold,
    color: '#000',
  },
});

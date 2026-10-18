import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Copy, Heart, Layers, ChevronRight } from 'lucide-react-native';
import { useTheme, gold, fontFamily } from '@bucketlist/ui';
import { CollectionItem } from '../types';

interface CollectionCardProps {
  collection: CollectionItem;
  onPress: () => void;
  onClone?: () => void;
  isCloning?: boolean;
  onToggleLike?: () => void;
}

export function CollectionCard({
  collection,
  onPress,
  onClone,
  isCloning = false,
  onToggleLike,
}: CollectionCardProps) {
  const { theme } = useTheme();

  return (
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
      accessibilityLabel={`Colección ${collection.title}`}
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
              <Text style={styles.taskCountBadgeText}>{collection.tasks.length} tareas</Text>
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
          {collection.tasks.slice(0, 2).map((t, idx) => (
            <View key={idx} style={styles.taskPreviewRow}>
              <View style={[styles.taskBullet, { backgroundColor: gold[400] }]} />
              <Text style={[styles.taskPreviewText, { color: theme.colors.foreground }]} numberOfLines={1}>
                {t.title}
              </Text>
            </View>
          ))}
          {collection.tasks.length > 2 && (
            <Text style={[styles.taskMoreText, { color: theme.colors.foregroundSubtle }]}>
              +{collection.tasks.length - 2} tareas más...
            </Text>
          )}
        </View>

        {/* Botón inferior: Like / Autor / Clonar */}
        <View style={styles.footerRow}>
          <View style={styles.authorAndLikeRow}>
            <Text style={[styles.authorText, { color: theme.colors.foregroundSubtle }]}>
              Por {collection.author.name}
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
                accessibilityLabel={collection.isLiked ? 'Quitar me gusta' : 'Dar me gusta'}
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
            accessibilityLabel={`Clonar colección ${collection.title}`}
          >
            <Copy size={13} color="#0E0E0E" strokeWidth={2.2} />
            <Text style={styles.cloneBtnText}>{isCloning ? 'Clonando...' : 'Clonar'}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
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
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
});

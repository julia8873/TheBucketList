import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Layers, Heart, Copy, ChevronRight } from 'lucide-react-native';
import { useTheme, gold, fontFamily } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { CollectionItem } from '../types';

interface FeaturedCollectionsRowProps {
  collections: CollectionItem[];
  onSelectCollection: (c: CollectionItem) => void;
  onViewAll?: () => void;
  title?: string;
  subtitle?: string;
}

export function FeaturedCollectionsRow({
  collections,
  onSelectCollection,
  onViewAll,
  title,
  subtitle,
}: FeaturedCollectionsRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const resolvedTitle = title ?? t('collections.featured_title', { defaultValue: 'Colecciones destacadas' });
  const resolvedSubtitle = subtitle ?? t('collections.featured_subtitle', { defaultValue: 'Álbumes prediseñados para clonar en tu lista' });

  if (!collections || collections.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} color={gold[400]} />
            <Text style={[styles.title, { color: theme.colors.foreground }]}>{resolvedTitle}</Text>
          </View>
          {resolvedSubtitle ? (
            <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>
              {resolvedSubtitle}
            </Text>
          ) : null}
        </View>

        {onViewAll ? (
          <Pressable
            onPress={onViewAll}
            hitSlop={6}
            style={styles.viewAllBtn}
            accessibilityRole="button"
            accessibilityLabel={t('collections.view_all', { defaultValue: 'Ver todas' })}
          >
            <Text style={styles.viewAllText}>{t('collections.view_all', { defaultValue: 'Ver todas' })}</Text>
            <ChevronRight size={14} color={gold[400]} />
          </Pressable>
        ) : null}
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {collections.map((col) => (
          <Pressable
            key={col.id}
            onPress={() => onSelectCollection(col)}
            style={({ pressed }) => [
              styles.itemCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Colección ${col.title}`}
          >
            <View style={styles.cardCover}>
              <LinearGradient
                colors={col.gradientColors}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.7)']}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{col.badge}</Text>
              </View>

              <View style={styles.cardCoverBottom}>
                <Text style={styles.cardEmoji}>{col.emoji}</Text>
              </View>
            </View>

            <View style={styles.cardInfo}>
              <Text
                style={[styles.cardTitle, { color: theme.colors.foreground }]}
                numberOfLines={1}
              >
                {col.title}
              </Text>
              <Text
                style={[styles.cardDesc, { color: theme.colors.foregroundMuted }]}
                numberOfLines={2}
              >
                {col.description}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.tasksTag}>
                  <Layers size={11} color={gold[400]} />
                  <Text style={[styles.tasksTagText, { color: gold[400] }]}>
                    {col.tasks.length}
                  </Text>
                </View>
                {col.likesCount !== undefined && col.likesCount > 0 ? (
                  <View style={styles.metricsTag}>
                    <Heart size={11} color={col.isLiked ? '#EF4444' : theme.colors.foregroundMuted} fill={col.isLiked ? '#EF4444' : 'transparent'} />
                    <Text style={[styles.metricsTagText, { color: col.isLiked ? '#EF4444' : theme.colors.foregroundMuted }]}>
                      {col.likesCount}
                    </Text>
                  </View>
                ) : null}
                {col.clonesCount !== undefined && col.clonesCount > 0 ? (
                  <View style={styles.metricsTag}>
                    <Copy size={11} color={theme.colors.foregroundMuted} />
                    <Text style={[styles.metricsTagText, { color: theme.colors.foregroundMuted }]}>
                      {col.clonesCount}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flex: 1 }} />
                <Text style={styles.clonePrompt}>
                  {t('collections.clone', { defaultValue: 'Clonar' })}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: gold[400],
  },
  scrollContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  itemCard: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardCover: {
    height: 95,
    padding: 10,
    justifyContent: 'space-between',
    position: 'relative',
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  cardCoverBottom: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardInfo: {
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fontFamily.serifBold,
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  tasksTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tasksTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clonePrompt: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  metricsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
  },
  metricsTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

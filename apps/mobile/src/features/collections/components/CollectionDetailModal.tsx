import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Copy, Heart, Check, Sparkles, Layers, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, gold, fontFamily } from '@bucketlist/ui';
import { useRouter } from 'expo-router';
import { CollectionItem } from '../types';
import { useCloneCollection, useToggleCollectionLike } from '../hooks/useCollections';

interface CollectionDetailModalProps {
  visible: boolean;
  collection: CollectionItem | null;
  onClose: () => void;
}

export function CollectionDetailModal({
  visible,
  collection,
  onClose,
}: CollectionDetailModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const cloneMutation = useCloneCollection();
  const toggleLikeMutation = useToggleCollectionLike();
  const [createdAlbumId, setCreatedAlbumId] = useState<string | null>(null);

  if (!collection) return null;

  const handleClone = async () => {
    try {
      const result = await cloneMutation.mutateAsync(collection);
      setCreatedAlbumId(result.albumId);
    } catch {}
  };

  const handleGoToAlbum = () => {
    if (createdAlbumId) {
      onClose();
      router.push(`/album/${createdAlbumId}` as any);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header Cover con degradado temático */}
        <View style={styles.headerCover}>
          <LinearGradient
            colors={collection.gradientColors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.headerTop, { paddingTop: Math.max(insets.top, 14) }]}>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{collection.badge}</Text>
            </View>
            <View style={styles.topActionsRow}>
              <Pressable
                onPress={() => toggleLikeMutation.mutate(collection.id)}
                hitSlop={8}
                style={[
                  styles.likeTopBtn,
                  collection.isLiked && { backgroundColor: 'rgba(239, 68, 68, 0.25)', borderColor: '#EF4444' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={collection.isLiked ? 'Quitar me gusta' : 'Dar me gusta'}
              >
                <Heart
                  size={17}
                  color={collection.isLiked ? '#EF4444' : '#FFF'}
                  fill={collection.isLiked ? '#EF4444' : 'transparent'}
                />
                {collection.likesCount !== undefined && collection.likesCount > 0 ? (
                  <Text style={[styles.likeTopBtnText, collection.isLiked && { color: '#EF4444' }]}>
                    {collection.likesCount}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Cerrar detalle"
              >
                <X size={18} color="#FFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerEmoji}>{collection.emoji}</Text>
            <Text style={styles.headerTitle}>{collection.title}</Text>
            <View style={styles.headerMetaRow}>
              <Text style={styles.authorBadge}>Por {collection.author.name}</Text>
              {collection.clonesCount !== undefined && collection.clonesCount > 0 ? (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.clonesCountText}>
                    Clonado {collection.clonesCount} {collection.clonesCount === 1 ? 'vez' : 'veces'}
                  </Text>
                </>
              ) : null}
              {collection.likesCount !== undefined && collection.likesCount > 0 ? (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.clonesCountText}>
                    {collection.likesCount} {collection.likesCount === 1 ? 'like' : 'likes'}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* Lista de tareas incluidas */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.description, { color: theme.colors.foregroundMuted }]}>
            {collection.description}
          </Text>

          <View style={styles.tasksHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Layers size={16} color={gold[400]} />
              <Text style={[styles.tasksSectionTitle, { color: theme.colors.foreground }]}>
                Tareas incluidas ({collection.tasks.length})
              </Text>
            </View>
            <Text style={[styles.clonableHint, { color: theme.colors.foregroundSubtle }]}>
              Se añadirán a tu cuenta
            </Text>
          </View>

          <View style={styles.tasksList}>
            {collection.tasks.map((task, index) => (
              <View
                key={index}
                style={[
                  styles.taskItemCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={[styles.taskIndexCircle, { borderColor: gold[400] }]}>
                  <Text style={[styles.taskIndexNumber, { color: gold[400] }]}>
                    {index + 1}
                  </Text>
                </View>

                <View style={styles.taskTextContent}>
                  <Text
                    style={[styles.taskItemTitle, { color: theme.colors.foreground }]}
                  >
                    {task.title}
                  </Text>
                  {task.description ? (
                    <Text
                      style={[
                        styles.taskItemDesc,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      {task.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Botón flotante inferior de Clonar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          {createdAlbumId ? (
            <Pressable
              onPress={handleGoToAlbum}
              style={[styles.cloneMainBtn, { backgroundColor: '#10B981' }]}
              accessibilityRole="button"
              accessibilityLabel="Ver nuevo álbum"
            >
              <Check size={18} color="#FFF" strokeWidth={2.5} />
              <Text style={[styles.cloneMainBtnText, { color: '#FFF' }]}>
                ¡Clonada con éxito! Ir al álbum
              </Text>
              <ArrowRight size={16} color="#FFF" />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleClone}
              disabled={cloneMutation.isPending}
              style={({ pressed }) => [
                styles.cloneMainBtn,
                { opacity: pressed || cloneMutation.isPending ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Clonar colección con ${collection.tasks.length} tareas`}
            >
              {cloneMutation.isPending ? (
                <>
                  <ActivityIndicator size="small" color="#0E0E0E" />
                  <Text style={styles.cloneMainBtnText}>Clonando en tu cuenta...</Text>
                </>
              ) : (
                <>
                  <Sparkles size={18} color="#0E0E0E" strokeWidth={2.2} />
                  <Text style={styles.cloneMainBtnText}>
                    Clonar colección (+{collection.tasks.length} tareas)
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCover: {
    height: 220,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 20,
    position: 'relative',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  likeTopBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    gap: 4,
  },
  headerEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: fontFamily.serifBold,
    fontWeight: '700',
    color: '#FFF',
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(0,0,0,0.6)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  authorBadge: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  clonesCountText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  tasksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tasksSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  clonableHint: {
    fontSize: 12,
  },
  tasksList: {
    gap: 10,
  },
  taskItemCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  taskIndexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  taskIndexNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskTextContent: {
    flex: 1,
    gap: 4,
  },
  taskItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  taskItemDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  cloneMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: gold[400],
    height: 50,
    borderRadius: 16,
  },
  cloneMainBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0E0E0E',
  },
});

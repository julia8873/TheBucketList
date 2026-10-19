import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Sparkles,
  Edit3,
  Trash2,
  Plus,
  Search,
  ShieldCheck,
  Layers,
  Heart,
  Copy,
} from 'lucide-react-native';
import { PageTitle, fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
import { useCollections, useDeleteCollection } from '../../src/features/collections/hooks/useCollections';
import { CollectionItem } from '../../src/features/collections/types';

export default function ManageCollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isAdmin = useIsAdmin();

  const { data: collections = [], isLoading, refetch, isRefetching } = useCollections();
  const deleteMutation = useDeleteCollection();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCollections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (c.badge && c.badge.toLowerCase().includes(q))
    );
  }, [collections, searchQuery]);

  const handleDelete = (item: CollectionItem) => {
    Alert.alert(
      'Eliminar Colección',
      `¿Estás seguro de que deseas eliminar permanentemente la colección "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(item.id);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar la colección');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (item: CollectionItem) => {
    router.push({
      pathname: '/(modals)/create-collection',
      params: { id: item.id },
    } as any);
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 40, alignItems: 'center', paddingHorizontal: 24 }]}>
        <ShieldCheck color="#EF4444" size={56} />
        <Text style={[styles.title, { color: theme.colors.foreground, marginTop: 16 }]}>Acceso Restringido</Text>
        <Text style={{ color: theme.colors.foregroundMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          Solo los administradores pueden gestionar y moderar colecciones.
        </Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: '#0D0D0D', fontWeight: 'bold' }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const renderItem = ({ item }: { item: CollectionItem }) => {
    const tasksCount = Array.isArray(item.tasks) ? item.tasks.length : 0;
    const gradient: [string, string, ...string[]] =
      item.gradientColors && item.gradientColors.length >= 2
        ? (item.gradientColors as [string, string, ...string[]])
        : ['#1E1E1E', '#333333'];

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {/* Cover strip con emoji y badge */}
        <View style={styles.cardCover}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.coverRow}>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{item.badge || '✨ Colección'}</Text>
            </View>
            <Text style={styles.coverEmoji}>{item.emoji || '📁'}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: theme.colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.cardDesc, { color: theme.colors.foregroundMuted }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Layers size={13} color={theme.colors.foregroundMuted} />
              <Text style={[styles.statText, { color: theme.colors.foregroundMuted }]}>{tasksCount} tareas</Text>
            </View>
            <View style={styles.statItem}>
              <Copy size={13} color={theme.colors.foregroundMuted} />
              <Text style={[styles.statText, { color: theme.colors.foregroundMuted }]}>{item.clonesCount || 0} clones</Text>
            </View>
            <View style={styles.statItem}>
              <Heart size={13} color={theme.colors.foregroundMuted} />
              <Text style={[styles.statText, { color: theme.colors.foregroundMuted }]}>{item.likesCount || 0} likes</Text>
            </View>
          </View>

          {/* Botones de acción: Editar y Borrar */}
          <View style={[styles.actionsRow, { borderTopColor: theme.colors.border }]}>
            <Pressable
              style={styles.editBtn}
              onPress={() => handleEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={`Editar colección ${item.title}`}
            >
              <Edit3 size={15} color="#000" strokeWidth={2} />
              <Text style={styles.editBtnText}>Editar</Text>
            </Pressable>

            <Pressable
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar colección ${item.title}`}
            >
              <Trash2 size={15} color="#EF4444" strokeWidth={2} />
              <Text style={styles.deleteBtnText}>Eliminar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.circleBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft size={22} color={theme.colors.foreground} />
        </Pressable>

        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <PageTitle gold="Gestionar" rest="colecciones" />
          <Text style={[styles.headerSub, { color: theme.colors.foregroundMuted }]}>
            {collections.length} {collections.length === 1 ? 'colección disponible' : 'colecciones disponibles'}
          </Text>
        </View>

        <Pressable
          style={styles.newBtn}
          onPress={() => router.push('/(modals)/create-collection' as any)}
          accessibilityRole="button"
          accessibilityLabel="Crear nueva colección"
        >
          <Plus size={16} color="#000" strokeWidth={2.5} />
          <Text style={styles.newBtnText}>Nueva</Text>
        </Pressable>
      </View>

      {/* Barra de búsqueda */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Search size={16} color={theme.colors.foregroundMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.foreground }]}
          placeholder="Buscar colección por título o temática..."
          placeholderTextColor={theme.colors.foregroundMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={gold[400]} size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.foregroundMuted }]}>Cargando colecciones...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCollections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={gold[400]}
              colors={[gold[400]]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Layers size={44} color={theme.colors.foregroundMuted} />
              <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
                {searchQuery ? 'No se encontraron colecciones' : 'No hay colecciones creadas'}
              </Text>
              <Text style={[styles.emptySub, { color: theme.colors.foregroundMuted }]}>
                {searchQuery
                  ? 'Prueba con otro término de búsqueda.'
                  : 'Crea tu primera colección comunitaria para que los usuarios puedan clonarla.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSub: {
    color: '#8F8F8F',
    fontSize: 12,
    marginTop: 2,
    fontFamily: fontFamily.regular,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  newBtnText: {
    color: '#000',
    fontFamily: fontFamily.bold,
    fontSize: 13,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141414',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  searchInput: {
    flex: 1,
    color: '#F3EEE3',
    fontSize: 14,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  cardCover: {
    height: 64,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgePillText: {
    color: '#F3EEE3',
    fontSize: 11,
    fontFamily: fontFamily.semibold,
  },
  coverEmoji: {
    fontSize: 24,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    color: '#F3EEE3',
    fontSize: 16,
    fontFamily: fontFamily.serifBold,
    marginBottom: 4,
  },
  cardDesc: {
    color: '#A0A0A0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
    paddingTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    color: '#8F8F8F',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#262626',
    paddingTop: 12,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D4AF37',
    paddingVertical: 10,
    borderRadius: 10,
  },
  editBtnText: {
    color: '#000',
    fontFamily: fontFamily.semibold,
    fontSize: 13,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 10,
    borderRadius: 10,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontFamily: fontFamily.semibold,
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    color: '#8F8F8F',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    color: '#F3EEE3',
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
  },
  emptySub: {
    color: '#8F8F8F',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  backBtn: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

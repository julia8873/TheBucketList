import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Pencil, Plus, Search, Tag as TagIcon, X } from 'lucide-react-native';
import { FilterChip, fontFamily, useTheme } from '@bucketlist/ui';
import { TagBadge } from '../src/components/TagBadge';
import { TagEditSheet } from '../src/components/TagEditSheet';
import { sortTags, useTagUsage, useTags, type Tag } from '../src/hooks/useTags';

const GOLD = '#D4B13A';

type Mode = 'popular' | 'az' | 'recent' | 'unused';
const MODES: Array<{ key: Mode; label: string }> = [
  { key: 'popular', label: 'Más usadas' },
  { key: 'az', label: 'A–Z' },
  { key: 'recent', label: 'Recientes' },
  { key: 'unused', label: 'Sin usar' },
];

export default function TagsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tagsQuery = useTags();
  const usageQuery = useTagUsage();
  const tags = tagsQuery.data ?? [];
  const counts = usageQuery.data?.counts ?? {};

  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('popular');
  const [editing, setEditing] = useState<Tag | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = q ? tags.filter((t) => t.name.toLowerCase().includes(q)) : tags;
    if (mode === 'unused') base = base.filter((t) => (counts[t.id] ?? 0) === 0);
    return sortTags(base, mode === 'unused' ? 'az' : mode, counts);
  }, [tags, query, mode, counts]);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (tag: Tag) => {
    setEditing(tag);
    setSheetOpen(true);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/my-list' as any));

  const refreshing = tagsQuery.isRefetching || usageQuery.isRefetching;
  const onRefresh = () => {
    void tagsQuery.refetch();
    void usageQuery.refetch();
  };

  const countLabel = (n: number) => (n === 0 ? 'Sin tareas' : n === 1 ? '1 tarea' : `${n} tareas`);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Cabecera */}
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={[styles.circleBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <ChevronLeft size={22} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>Etiquetas</Text>
        <Pressable
          onPress={openCreate}
          accessibilityRole="button"
          accessibilityLabel="Nueva etiqueta"
          style={[styles.circleBtn, styles.addBtn]}
        >
          <Plus size={24} color="#111111" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Buscador */}
      <View style={styles.searchBox}>
        <Search color="#9A9A9A" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar etiqueta"
          placeholderTextColor="#8A8A8A"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Borrar búsqueda">
            <X color="#9A9A9A" size={18} />
          </Pressable>
        )}
      </View>

      {/* Orden / filtro */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {MODES.map((m) => (
          <FilterChip key={m.key} label={m.label} active={mode === m.key} onPress={() => setMode(m.key)} />
        ))}
      </ScrollView>

      {/* Lista */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        <Text style={styles.sectionLabel}>
          <Text style={{ color: GOLD }}>TUS</Text> ETIQUETAS · {list.length}
        </Text>

        {tagsQuery.isLoading ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 32 }} />
        ) : tagsQuery.isError ? (
          <View style={styles.stateBox}>
            <Text style={styles.errorText}>No se pudieron cargar tus etiquetas.</Text>
            <Pressable onPress={() => void tagsQuery.refetch()} hitSlop={8}>
              <Text style={styles.retry}>Reintentar</Text>
            </Pressable>
          </View>
        ) : list.length === 0 ? (
          <View style={styles.stateBox}>
            <TagIcon size={34} color="#5A5A5A" strokeWidth={1.5} />
            <Text style={styles.stateTitle}>
              {tags.length === 0 ? 'Aún no tienes etiquetas' : mode === 'unused' && !query.trim() ? 'No tienes etiquetas sin usar' : 'Sin resultados'}
            </Text>
            <Text style={styles.stateText}>
              {tags.length === 0
                ? 'Crea la primera para organizar tus tareas.'
                : query.trim()
                  ? `Ninguna etiqueta coincide con «${query.trim()}».`
                  : 'Todas tus etiquetas están en uso.'}
            </Text>
          </View>
        ) : (
          list.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => openEdit(tag)}
              accessibilityRole="button"
              accessibilityLabel={`Editar etiqueta ${tag.name}`}
              style={styles.row}
            >
              <TagBadge emoji={tag.emoji} color={tag.color} size={42} />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {tag.name}
                </Text>
                <Text style={styles.rowSub}>{countLabel(counts[tag.id] ?? 0)}</Text>
              </View>
              <View style={styles.editBtn}>
                <Pencil size={18} color="#F5F0E6" strokeWidth={1.8} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Pie */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <Pressable style={styles.cta} onPress={openCreate} accessibilityRole="button">
          <Text style={styles.ctaText}>Nueva etiqueta</Text>
        </Pressable>
      </View>

      <TagEditSheet
        visible={sheetOpen}
        tag={editing}
        usageCount={editing ? counts[editing.id] ?? 0 : 0}
        onClose={() => setSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  addBtn: { backgroundColor: GOLD, borderColor: GOLD },
  title: { flex: 1, fontFamily: fontFamily.serifBold, fontSize: 30 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 48,
    marginTop: 20,
    marginHorizontal: 20,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: 16, color: '#F5F5F5', padding: 0 },
  chipsScroll: { flexGrow: 0, marginTop: 14 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  sectionLabel: {
    fontFamily: fontFamily.serifBold,
    fontSize: 14,
    letterSpacing: 1,
    color: '#F5F0E6',
    marginTop: 22,
    marginBottom: 8,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F1F',
  },
  rowText: { flex: 1 },
  rowName: { fontFamily: fontFamily.semibold, fontSize: 17, color: '#F5F0E6' },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 14, color: '#9A9A9A', marginTop: 2 },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateBox: { alignItems: 'center', paddingTop: 48, gap: 8, paddingHorizontal: 24 },
  stateTitle: { fontFamily: fontFamily.serifBold, fontSize: 18, color: '#F5F0E6', marginTop: 6 },
  stateText: { fontFamily: fontFamily.regular, fontSize: 14, color: '#9A9A9A', textAlign: 'center' },
  errorText: { fontFamily: fontFamily.regular, fontSize: 14, color: '#E5877D' },
  retry: { fontFamily: fontFamily.semibold, fontSize: 14, color: GOLD },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    backgroundColor: '#0E0E0E',
  },
  cta: { height: 54, borderRadius: 27, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fontFamily.bold, fontSize: 18, color: '#111111' },
});

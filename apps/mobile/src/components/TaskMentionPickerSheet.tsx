import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, ChevronLeft, Circle, Link2, Search, X } from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

/**
 * Selector de tarea para mencionar desde otra tarea.
 * Lista las tareas del usuario (menos la actual y las ya mencionadas) con buscador.
 */

type TaskOption = { id: string; title: string; status: string | null };

type Props = {
  visible: boolean;
  /** Tarea desde la que se menciona (no aparece en la lista). */
  currentBucketId: string;
  /** Tareas ya mencionadas (no aparecen en la lista). */
  excludeIds: string[];
  onSelect: (bucketId: string) => void;
  onClose: () => void;
};

export function TaskMentionPickerSheet({ visible, currentBucketId, excludeIds, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  useEffect(() => {
    if (!visible || !user?.id) return;
    let mounted = true;
    setLoading(true);

    const timer = setTimeout(
      async () => {
        try {
          let q = supabase
            .from('buckets')
            .select('id, title, status')
            .eq('user_id', user.id)
            .neq('id', currentBucketId)
            .order('created_at', { ascending: false })
            .limit(60);

          const trimmed = query.trim().replace(/[%,()]/g, ' ');
          if (trimmed) q = q.ilike('title', `%${trimmed}%`);

          const { data, error } = await q;
          if (!error && data && mounted) setTasks(data as TaskOption[]);
        } catch (err) {
          console.warn('Error cargando tareas para mencionar:', err);
        } finally {
          if (mounted) setLoading(false);
        }
      },
      query ? 200 : 0,
    );

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [visible, query, user?.id, currentBucketId]);

  if (!visible) return null;

  const excluded = new Set(excludeIds);
  const options = tasks.filter((t) => !excluded.has(t.id));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10} style={styles.backButton}>
              <ChevronLeft color="#FFF" size={26} />
            </Pressable>
            <Text style={styles.headerTitle}>Mencionar tarea</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search color="#9A9A9A" size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar tarea..."
                placeholderTextColor="#666"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <X color="#9A9A9A" size={18} />
                </Pressable>
              )}
            </View>
          </View>

          {loading && options.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color="#D4B13A" size="large" />
            </View>
          ) : options.length === 0 ? (
            <View style={styles.center}>
              <Link2 color="#555" size={48} />
              <Text style={styles.emptyTitle}>
                {query.trim() ? 'No se encontraron tareas' : 'No hay más tareas para mencionar'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={(t) => t.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onSelect(item.id)}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#202020' }]}
                >
                  {item.status === 'completed' ? (
                    <CheckCircle2 color="#D4B13A" size={20} strokeWidth={1.8} />
                  ) : (
                    <Circle color="#777" size={20} strokeWidth={1.8} />
                  )}
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0E' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 20, paddingBottom: 14 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 15, padding: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyTitle: { color: '#9A9A9A', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#161616',
  },
  rowTitle: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600' },
});

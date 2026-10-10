import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { DEFAULT_TAG_COLOR } from '../constants/tagPresets';

export interface Tag {
  id: string;
  user_id?: string;
  name: string;
  color: string;
  emoji?: string | null;
  created_at?: string;
}

export interface TagUsage {
  /** tag_id → nº de tareas que la usan */
  counts: Record<string, number>;
  /** item_id → ids de etiquetas de esa tarea */
  byItem: Record<string, string[]>;
}

export type TagSort = 'popular' | 'az' | 'recent';

/** Error que se muestra tal cual al usuario. */
export class TagError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'TagError';
  }
}

const isMissingTable = (e: any) => e?.code === '42P01';
// PostgREST devuelve PGRST204 cuando se envía una columna que no existe (migración del emoji sin aplicar
// o schema cache sin recargar); Postgres devuelve 42703.
const isMissingEmojiColumn = (e: any) =>
  e?.code === 'PGRST204' || e?.code === '42703' || /column.*emoji|emoji.*column/i.test(e?.message ?? '');

// Antes se reintentaba sin emoji y se daba por guardado: el emoji se perdía en silencio.
const EMOJI_COLUMN_MESSAGE =
  'La base de datos no tiene la columna «emoji» en las etiquetas. Aplica la migración 20261010190000_tags_emoji.sql y recarga el schema cache de Supabase.';

const toTagError = (e: any, fallback: string) => {
  if (e?.code === '23505') return new TagError('Ya existe una etiqueta con ese nombre', '23505');
  return new TagError(e?.message || fallback, e?.code);
};

/** Refresca todo lo que depende de las etiquetas. */
export const invalidateTagQueries = (qc: QueryClient) => {
  void qc.invalidateQueries({ queryKey: ['tags'] });
  void qc.invalidateQueries({ queryKey: ['buckets', 'tag-usage'] });
  void qc.invalidateQueries({ queryKey: ['item_tags'] });
  void qc.invalidateQueries({ queryKey: ['bucketDetail'] });
};

/** Ordena etiquetas según el modo elegido en los filtros "Más usadas / A–Z / Recientes". */
export function sortTags<T extends Tag>(tags: T[], mode: TagSort, counts: Record<string, number> = {}): T[] {
  const list = [...tags];
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (mode === 'az') return list.sort(byName);
  if (mode === 'recent') {
    return list.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  }
  return list.sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || byName(a, b));
}

export const useTags = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async (): Promise<Tag[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('created_at', { ascending: false });

      // If table doesn't exist yet (migration unapplied), fail gracefully returning empty
      if (error && isMissingTable(error)) return [];
      if (error) throw error;
      return (data || []) as Tag[];
    },
    enabled: !!user,
  });
};

/**
 * Uso de las etiquetas: cuántas tareas tiene cada una y qué etiquetas tiene cada tarea.
 * (La clave empieza por 'buckets' para refrescarse cuando cambian las tareas.)
 */
export const useTagUsage = () => {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['buckets', 'tag-usage', user?.id],
    queryFn: async (): Promise<TagUsage> => {
      const { data, error } = await supabase.from('item_tags').select('item_id, tag_id');
      if (error && isMissingTable(error)) return { counts: {}, byItem: {} };
      if (error) throw error;

      const counts: Record<string, number> = {};
      const byItem: Record<string, string[]> = {};
      for (const row of (data ?? []) as Array<{ item_id: string; tag_id: string }>) {
        counts[row.tag_id] = (counts[row.tag_id] ?? 0) + 1;
        (byItem[row.item_id] ??= []).push(row.tag_id);
      }
      return { counts, byItem };
    },
    enabled: !!user,
  });
};

export const useItemTags = (bucketId: string) => {
  return useQuery({
    queryKey: ['item_tags', bucketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('item_tags')
        .select('*, tag:tags(*)')
        .eq('item_id', bucketId);

      if (error && error.code === '42P01') return [];
      if (error) throw error;
      return data || [];
    },
    enabled: !!bucketId,
  });
};

interface TagInput {
  name: string;
  color: string;
  emoji?: string | null;
}

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ name, color, emoji }: TagInput): Promise<Tag> => {
      if (!user) throw new TagError('Debes iniciar sesión');
      const base = { user_id: user.id, name: name.trim(), color: color || DEFAULT_TAG_COLOR };

      let res = await supabase.from('tags').insert({ ...base, emoji: emoji || null }).select().single();
      if (res.error && isMissingEmojiColumn(res.error)) {
        if (emoji) throw new TagError(EMOJI_COLUMN_MESSAGE, res.error.code);
        res = await supabase.from('tags').insert(base).select().single();
      }
      if (res.error) throw toTagError(res.error, 'No se pudo crear la etiqueta');
      return res.data as Tag;
    },
    onSuccess: (saved) => {
      // Se refleja al instante en todas las listas y luego se revalida.
      queryClient.setQueriesData<Tag[]>({ queryKey: ['tags'] }, (old) =>
        old ? [saved, ...old.filter((t) => t.id !== saved.id)] : old,
      );
      invalidateTagQueries(queryClient);
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color, emoji }: TagInput & { id: string }): Promise<Tag> => {
      const base = { name: name.trim(), color };

      let res = await supabase.from('tags').update({ ...base, emoji: emoji || null }).eq('id', id).select().single();
      if (res.error && isMissingEmojiColumn(res.error)) {
        if (emoji) throw new TagError(EMOJI_COLUMN_MESSAGE, res.error.code);
        res = await supabase.from('tags').update(base).eq('id', id).select().single();
      }
      if (res.error) throw toTagError(res.error, 'No se pudieron guardar los cambios');
      return res.data as Tag;
    },
    onSuccess: (saved) => {
      // Se refleja al instante en todas las listas y luego se revalida.
      queryClient.setQueriesData<Tag[]>({ queryKey: ['tags'] }, (old) =>
        old?.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)),
      );
      invalidateTagQueries(queryClient);
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // item_tags se elimina en cascada (ON DELETE CASCADE)
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw toTagError(error, 'No se pudo eliminar la etiqueta');
      return id;
    },
    onSuccess: () => invalidateTagQueries(queryClient),
  });
};

export const useSyncItemTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bucketId, selectedTagIds }: { bucketId: string, selectedTagIds: string[] }) => {
      // 1. Get current tags
      const { data: current, error: fetchError } = await supabase
        .from('item_tags')
        .select('tag_id')
        .eq('item_id', bucketId);

      if (fetchError && fetchError.code === '42P01') return; // Migration not applied
      if (fetchError) throw fetchError;

      const currentIds = (current || []).map(r => r.tag_id);

      // 2. Diff
      const toAdd = selectedTagIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !selectedTagIds.includes(id));

      // 3. Delete removed
      if (toRemove.length > 0) {
        await supabase
          .from('item_tags')
          .delete()
          .eq('item_id', bucketId)
          .in('tag_id', toRemove);
      }

      // 4. Insert new
      if (toAdd.length > 0) {
        await supabase
          .from('item_tags')
          .insert(toAdd.map(id => ({ item_id: bucketId, tag_id: id })));
      }
    },
    onSuccess: (_, { bucketId }) => {
      queryClient.invalidateQueries({ queryKey: ['item_tags', bucketId] });
      queryClient.invalidateQueries({ queryKey: ['bucketDetail', bucketId] });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    }
  });
};
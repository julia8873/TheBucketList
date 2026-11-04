import { i18n } from '@bucketlist/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyTag {
  id: string;
  user_id?: string;
  name: string;
  color: string;
  emoji?: string | null;
  created_at?: string;
}

const STORAGE_PREFIX = '@bucketlist_daily_tags_v2';

export const DAILY_TAGS_QUERY_KEY = ['daily_tags'];

const DEFAULT_DAILY_PRESETS: Array<Omit<DailyTag, 'id'>> = [
  { name: 'Trabajo', color: '#D4B13A', emoji: '💼' },
  { name: 'Personal', color: '#3B82F6', emoji: '🏠' },
  { name: 'Salud', color: '#10B981', emoji: '🏃' },
  { name: 'Compras', color: '#EC4899', emoji: '🛒' },
  { name: 'Estudio', color: '#8B5CF6', emoji: '📚' },
];

const getStorageKey = (userId?: string) => `${STORAGE_PREFIX}_${userId || 'anonymous'}`;

export function useDailyTags() {
  const { user } = useAuthStore();
  const userId = user?.id;

  return useQuery({
    queryKey: [...DAILY_TAGS_QUERY_KEY, userId],
    queryFn: async (): Promise<DailyTag[]> => {
      const storageKey = getStorageKey(userId);
      if (!userId) {
        const cached = await AsyncStorage.getItem(storageKey);
        return cached ? JSON.parse(cached) : [];
      }

      // 1. Probar la tabla exclusiva daily_tags
      const { data, error } = await supabase
        .from('daily_tags')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
        return data as DailyTag[];
      }

      // 2. Si no hay etiquetas en la BD aún, intentar sembrar los presets en daily_tags
      if (!error && data && data.length === 0) {
        try {
          const toInsert = DEFAULT_DAILY_PRESETS.map((p) => ({
            user_id: userId,
            ...p,
          }));
          const { data: seeded } = await supabase
            .from('daily_tags')
            .insert(toInsert)
            .select();
          if (seeded && seeded.length > 0) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(seeded)).catch(() => {});
            return seeded as DailyTag[];
          }
        } catch {}
      }

      // 3. Fallback a almacenamiento local aislado para daily_tags (NUNCA toca la tabla tags de Mi Lista)
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }

      // Presets por defecto para el día a día
      const localPresets = DEFAULT_DAILY_PRESETS.map((p, i) => ({
        id: `daily-preset-${i + 1}`,
        user_id: userId,
        ...p,
      }));
      await AsyncStorage.setItem(storageKey, JSON.stringify(localPresets)).catch(() => {});
      return localPresets as DailyTag[];
    },
    enabled: !!userId,
  });
}

export function useCreateDailyTag() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (payload: { name: string; color?: string; emoji?: string | null }): Promise<DailyTag> => {
      if (!userId) throw new Error(i18n.t('auth.err_not_authenticated', { defaultValue: 'Usuario no autenticado' }));

      const storageKey = getStorageKey(userId);
      const name = payload.name.trim();
      const color = payload.color || '#D4B13A';
      const emoji = payload.emoji?.trim() || null;

      // 1. Insertar exclusivamente en daily_tags
      let createdTag: DailyTag | null = null;
      try {
        const { data, error } = await supabase
          .from('daily_tags')
          .insert({
            user_id: userId,
            name,
            color,
            emoji,
          })
          .select()
          .single();

        if (!error && data) {
          createdTag = data as DailyTag;
        }
      } catch {}

      // 2. Si falla la BD, guardar en almacenamiento local aislado
      if (!createdTag) {
        createdTag = {
          id: 'daily_tag_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          user_id: userId,
          name,
          color,
          emoji,
          created_at: new Date().toISOString(),
        };
      }

      const cached = await AsyncStorage.getItem(storageKey);
      const list: DailyTag[] = cached ? JSON.parse(cached) : [];
      list.push(createdTag);
      await AsyncStorage.setItem(storageKey, JSON.stringify(list)).catch(() => {});

      return createdTag;
    },
    onSuccess: (newTag) => {
      queryClient.setQueryData<DailyTag[]>([...DAILY_TAGS_QUERY_KEY, userId], (old: DailyTag[] | undefined) => [
        ...(old || []),
        newTag,
      ]);
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TAGS_QUERY_KEY, userId] });
    },
  });
}

export function useUpdateDailyTag() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (payload: { id: string; name: string; color?: string; emoji?: string | null }): Promise<DailyTag> => {
      if (!userId) throw new Error(i18n.t('auth.err_not_authenticated', { defaultValue: 'Usuario no autenticado' }));

      const storageKey = getStorageKey(userId);
      const name = payload.name.trim();
      const color = payload.color || '#D4B13A';
      const emoji = payload.emoji?.trim() || null;

      // 1. Actualizar en daily_tags
      try {
        await supabase
          .from('daily_tags')
          .update({ name, color, emoji })
          .eq('id', payload.id)
          .eq('user_id', userId);
      } catch {}

      // 2. Actualizar almacenamiento local
      const cached = await AsyncStorage.getItem(storageKey);
      const list: DailyTag[] = cached ? JSON.parse(cached) : [];
      const updatedList = list.map((t) =>
        t.id === payload.id ? { ...t, name, color, emoji } : t
      );
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList)).catch(() => {});

      return {
        id: payload.id,
        user_id: userId,
        name,
        color,
        emoji,
      };
    },
    onSuccess: (updatedTag) => {
      queryClient.setQueryData<DailyTag[]>([...DAILY_TAGS_QUERY_KEY, userId], (old: DailyTag[] | undefined) =>
        (old || []).map((t: DailyTag) => (t.id === updatedTag.id ? updatedTag : t))
      );
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TAGS_QUERY_KEY, userId] });
    },
  });
}

export function useDeleteDailyTag() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (tagId: string): Promise<void> => {
      if (!userId) return;

      const storageKey = getStorageKey(userId);

      // 1. Borrar en daily_tags
      try {
        await supabase
          .from('daily_tags')
          .delete()
          .eq('id', tagId);
      } catch {}

      // 2. Borrar del almacenamiento local
      const cached = await AsyncStorage.getItem(storageKey);
      if (cached) {
        const list: DailyTag[] = JSON.parse(cached);
        const filtered = list.filter((t) => t.id !== tagId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(filtered)).catch(() => {});
      }
    },
    onSuccess: (_, tagId) => {
      queryClient.setQueryData<DailyTag[]>([...DAILY_TAGS_QUERY_KEY, userId], (old: DailyTag[] | undefined) =>
        (old || []).filter((t: DailyTag) => t.id !== tagId)
      );
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TAGS_QUERY_KEY, userId] });
    },
  });
}


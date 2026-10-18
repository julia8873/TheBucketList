import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import type { Tag } from './useTags';
import type { TagItem } from '../components/TagAssignSheet';

export const getAlbumTagsStorageKey = (albumId: string) => {
  const clean = Array.isArray(albumId) ? albumId[0] : String(albumId || '');
  return `@bucketlist_album_tags_${clean}`;
};

/** Obtiene las etiquetas asociadas a un álbum de forma persistente y resiliente. */
export const useAlbumTags = (albumId?: string | null) => {
  const { user } = useAuthStore();
  const cleanId = Array.isArray(albumId) ? albumId[0] : (albumId ? String(albumId) : '');

  return useQuery({
    queryKey: ['album_tags', cleanId, user?.id],
    queryFn: async (): Promise<TagItem[]> => {
      if (!cleanId || cleanId === 'unassigned') return [];

      const storageKey = getAlbumTagsStorageKey(cleanId);

      // 1. Cargar caché local persistente de AsyncStorage
      let localCached: TagItem[] = [];
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localCached = parsed;
          }
        }
      } catch {
        // Ignorado
      }

      // 2. Intentar consultar tabla relacional album_tags si está presente
      let dbTagIds: string[] = [];
      try {
        const { data, error } = await supabase
          .from('album_tags')
          .select('tag_id, tags(id, name, color, emoji)')
          .eq('album_id', cleanId);

        if (!error && data && data.length > 0) {
          const list: TagItem[] = [];
          for (const row of data as any[]) {
            const t = Array.isArray(row.tags) ? row.tags[0] : (row.tags || row.tag);
            if (t && t.id) {
              list.push({
                id: t.id,
                name: t.name,
                color: t.color,
                emoji: t.emoji ?? null,
              });
            } else if (row.tag_id) {
              dbTagIds.push(row.tag_id);
            }
          }
          if (list.length > 0) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(list)).catch(() => {});
            return list;
          }
        }
      } catch {
        // Ignorado si la tabla no existe en la base de datos
      }

      // 3. Fallback: leer del JSON de cover_path del álbum (compatibilidad total)
      try {
        const { data: album } = await supabase
          .from('albums')
          .select('cover_path')
          .eq('id', cleanId)
          .maybeSingle();

        if (album?.cover_path) {
          try {
            const parsed = JSON.parse(album.cover_path);
            if (Array.isArray(parsed?.tag_ids) && parsed.tag_ids.length > 0) {
              dbTagIds = Array.from(new Set([...dbTagIds, ...parsed.tag_ids]));
            }
          } catch {
            // No era JSON válido
          }
        }
      } catch {
        // Ignorado
      }

      // 4. Si encontramos IDs en la BD o en cover_path, obtener los detalles completos de las etiquetas
      if (dbTagIds.length > 0) {
        try {
          const { data: tagsData } = await supabase
            .from('tags')
            .select('id, name, color, emoji')
            .in('id', dbTagIds);

          if (tagsData && tagsData.length > 0) {
            const list: TagItem[] = tagsData.map((t: any) => ({
              id: t.id,
              name: t.name,
              color: t.color,
              emoji: t.emoji ?? null,
            }));
            await AsyncStorage.setItem(storageKey, JSON.stringify(list)).catch(() => {});
            return list;
          }
        } catch {
          // Ignorado
        }
      }

      // 5. Fallback a caché local persistente: si la BD no arrojó etiquetas (p.ej. tabla no migrada),
      // devolver la caché local para que JAMÁS desaparezcan.
      if (localCached.length > 0) {
        return localCached;
      }

      return [];
    },
    enabled: Boolean(cleanId && cleanId !== 'unassigned'),
  });
};

export interface SyncAlbumTagsParams {
  albumId: string;
  selectedTagIds: string[];
  tags?: TagItem[];
  removedTagIds?: string[];
  removeTagsFromTasks?: boolean;
  taskIds?: string[];
}

/**
 * Sincroniza las etiquetas de un álbum y las propaga a todas las tareas del álbum.
 * Si se indica `removeTagsFromTasks: true`, quita las etiquetas eliminadas también de las tareas.
 */
export const useSyncAlbumTags = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      albumId,
      selectedTagIds,
      tags,
      removedTagIds = [],
      removeTagsFromTasks = false,
      taskIds,
    }: SyncAlbumTagsParams): Promise<TagItem[]> => {
      const cleanAlbumId = Array.isArray(albumId) ? albumId[0] : String(albumId || '');
      if (!cleanAlbumId || cleanAlbumId === 'unassigned') return [];

      const storageKey = getAlbumTagsStorageKey(cleanAlbumId);

      // 1. Guardar de inmediato en AsyncStorage para persistencia local a prueba de fallos
      let finalTagsToStore: TagItem[] = tags || [];
      if (finalTagsToStore.length === 0 && selectedTagIds.length > 0) {
        try {
          const { data: tagsData } = await supabase
            .from('tags')
            .select('id, name, color, emoji')
            .in('id', selectedTagIds);
          if (tagsData) {
            finalTagsToStore = tagsData.map((t: any) => ({
              id: t.id,
              name: t.name,
              color: t.color,
              emoji: t.emoji ?? null,
            }));
          }
        } catch {}
      }
      await AsyncStorage.setItem(storageKey, JSON.stringify(finalTagsToStore)).catch(() => {});

      // 2. Obtener las tareas del álbum (las provistas o mediante consulta a album_items)
      let allTaskIds = taskIds && taskIds.length > 0 ? taskIds : [];
      if (allTaskIds.length === 0) {
        try {
          const { data: items } = await supabase
            .from('album_items')
            .select('bucket_id')
            .eq('album_id', cleanAlbumId);
          allTaskIds = (items || []).map((r: any) => r.bucket_id as string).filter(Boolean);
        } catch {
          // Ignorado
        }
      }

      // 3. Aplicar todas las etiquetas del álbum a todas sus tareas (usando upsert/insert seguro en item_tags)
      if (allTaskIds.length > 0 && selectedTagIds.length > 0) {
        try {
          const { data: existing } = await supabase
            .from('item_tags')
            .select('item_id, tag_id')
            .in('item_id', allTaskIds)
            .in('tag_id', selectedTagIds);

          const existingSet = new Set(
            (existing || []).map((e: any) => `${e.item_id}:${e.tag_id}`)
          );

          const rowsToInsert: Array<{ item_id: string; tag_id: string }> = [];
          for (const bucketId of allTaskIds) {
            for (const tagId of selectedTagIds) {
              if (!existingSet.has(`${bucketId}:${tagId}`)) {
                rowsToInsert.push({ item_id: bucketId, tag_id: tagId });
              }
            }
          }

          if (rowsToInsert.length > 0) {
            const { error: insErr } = await supabase.from('item_tags').upsert(rowsToInsert, {
              onConflict: 'item_id,tag_id',
              ignoreDuplicates: true,
            });
            if (insErr) {
              // Si upsert falla por restricciones de RLS por fila, intentar individualmente
              for (const row of rowsToInsert) {
                try {
                  await supabase.from('item_tags').insert(row);
                } catch {}
              }
            }
          }
        } catch (err) {
          console.warn('Error syncing task tags in album:', err);
        }
      }

      // 4. Si el usuario eligió quitar la etiqueta también de las tareas
      if (removeTagsFromTasks && allTaskIds.length > 0 && removedTagIds.length > 0) {
        try {
          await supabase
            .from('item_tags')
            .delete()
            .in('item_id', allTaskIds)
            .in('tag_id', removedTagIds);
        } catch (err) {
          console.warn('Error removing item_tags:', err);
        }
      }

      // 5. Actualizar la tabla album_tags (si está disponible en la base de datos)
      try {
        if (removedTagIds.length > 0) {
          await supabase
            .from('album_tags')
            .delete()
            .eq('album_id', cleanAlbumId)
            .in('tag_id', removedTagIds);
        }

        if (selectedTagIds.length > 0) {
          const { data: existingAlbumTags } = await supabase
            .from('album_tags')
            .select('tag_id')
            .eq('album_id', cleanAlbumId)
            .in('tag_id', selectedTagIds);

          const existingSet = new Set((existingAlbumTags || []).map((r: any) => r.tag_id));
          const rowsToInsert = selectedTagIds
            .filter((tid) => !existingSet.has(tid))
            .map((tid) => ({ album_id: cleanAlbumId, tag_id: tid }));

          if (rowsToInsert.length > 0) {
            await supabase.from('album_tags').insert(rowsToInsert);
          }
        }
      } catch {
        // Ignorado si la tabla album_tags no existe todavía en Supabase
      }

      // 6. Respaldar tag_ids en cover_path JSON para persistencia garantizada en la BD
      try {
        const { data: album } = await supabase
          .from('albums')
          .select('cover_path')
          .eq('id', cleanAlbumId)
          .maybeSingle();

        let parsed: any = {};
        if (album?.cover_path) {
          try {
            parsed = JSON.parse(album.cover_path);
            if (!parsed || typeof parsed !== 'object') {
              parsed = { id: album.cover_path };
            }
          } catch {
            parsed = { id: album.cover_path };
          }
        }
        parsed.tag_ids = selectedTagIds;
        await supabase
          .from('albums')
          .update({ cover_path: JSON.stringify(parsed) })
          .eq('id', cleanAlbumId);
      } catch (err) {
        console.warn('Error updating cover_path with tag_ids:', err);
      }

      return finalTagsToStore;
    },
    onSuccess: (finalTags, variables) => {
      const cleanAlbumId = Array.isArray(variables.albumId) ? variables.albumId[0] : String(variables.albumId);
      const tagsToSet = finalTags && finalTags.length > 0 ? finalTags : (variables.tags || []);

      // Establecer datos en caché para ambas variantes de clave (limpia y original)
      queryClient.setQueryData(['album_tags', cleanAlbumId, user?.id], tagsToSet);
      if (variables.albumId !== cleanAlbumId) {
        queryClient.setQueryData(['album_tags', variables.albumId, user?.id], tagsToSet);
      }

      // No invalidamos album_tags para evitar sobrescribir con una consulta vacía
      void queryClient.invalidateQueries({ queryKey: ['item_tags'] });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
      void queryClient.invalidateQueries({ queryKey: ['album', cleanAlbumId] });
      void queryClient.invalidateQueries({ queryKey: ['album', variables.albumId] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      void queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
};

/**
 * Propaga las etiquetas de un álbum a un conjunto de tareas (p. ej. al añadirlas al álbum).
 */
export async function applyAlbumTagsToTasks(albumId: string, taskIds: string[]) {
  const cleanAlbumId = Array.isArray(albumId) ? albumId[0] : (albumId ? String(albumId) : '');
  if (!cleanAlbumId || cleanAlbumId === 'unassigned' || !taskIds.length) return;

  try {
    let tagIds: string[] = [];

    // 1. Obtener de AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(getAlbumTagsStorageKey(cleanAlbumId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          tagIds = parsed.map((t: any) => t.id).filter(Boolean);
        }
      }
    } catch {}

    // 2. Si no están en AsyncStorage, probar album_tags
    if (!tagIds.length) {
      try {
        const { data, error } = await supabase
          .from('album_tags')
          .select('tag_id')
          .eq('album_id', cleanAlbumId);

        if (!error && data && data.length > 0) {
          tagIds = data.map((r: any) => r.tag_id).filter(Boolean);
        }
      } catch {
        // Ignorado
      }
    }

    // 3. Fallback a cover_path JSON
    if (!tagIds.length) {
      try {
        const { data: album } = await supabase
          .from('albums')
          .select('cover_path')
          .eq('id', cleanAlbumId)
          .maybeSingle();
        if (album?.cover_path) {
          const parsed = JSON.parse(album.cover_path);
          if (Array.isArray(parsed?.tag_ids)) {
            tagIds = parsed.tag_ids;
          }
        }
      } catch {
        // Ignorado
      }
    }

    if (!tagIds.length) return;

    // 4. Insertar solo las relaciones faltantes en item_tags
    const { data: existing } = await supabase
      .from('item_tags')
      .select('item_id, tag_id')
      .in('item_id', taskIds)
      .in('tag_id', tagIds);

    const existingSet = new Set((existing || []).map((e: any) => `${e.item_id}:${e.tag_id}`));
    const rowsToInsert: Array<{ item_id: string; tag_id: string }> = [];

    for (const bucketId of taskIds) {
      for (const tagId of tagIds) {
        if (!existingSet.has(`${bucketId}:${tagId}`)) {
          rowsToInsert.push({ item_id: bucketId, tag_id: tagId });
        }
      }
    }

    if (rowsToInsert.length > 0) {
      const { error: insErr } = await supabase.from('item_tags').upsert(rowsToInsert, {
        onConflict: 'item_id,tag_id',
        ignoreDuplicates: true,
      });
      if (insErr) {
        for (const row of rowsToInsert) {
          try {
            await supabase.from('item_tags').insert(row);
          } catch {}
        }
      }
    }
  } catch (err) {
    console.error('Error applying album tags to tasks:', err);
  }
}


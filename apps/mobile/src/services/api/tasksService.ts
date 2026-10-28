import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface UnassignedTask {
  id: string;
  title: string;
  /** Vacío si la tarea no tiene categoría (no se muestra nada en ese caso). */
  categoryName: string;
  coverKey: string;
  location?: string;
  /** true si la tarea ya está dentro del álbum que se está editando. */
  inAlbum?: boolean;
  /** Visibilidad de la tarea: public, followers o private. */
  visibility?: 'public' | 'followers' | 'private';
  /** Prioridad de la tarea (las ideas por defecto no tienen: se crean con prioridad media). */
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  /** Valor para `BucketCover` (foto elegida/última, portada o null = degradado automático). */
  imageValue?: string | null;
  categorySlug?: string | null;
  /** Idea por defecto: aún no es una tarea real, no tiene fotos y conserva su degradado. */
  isDefault?: boolean;
}

const MOCK_TASKS: UnassignedTask[] = [
  { id: '1', title: 'Aprender a surfear', categoryName: 'Deporte', coverKey: 'atardecer' },
  { id: '2', title: 'Senderismo en Dolomitas', categoryName: 'Aventura', location: 'Italia', coverKey: 'aurora' },
  { id: '3', title: 'Amanecer en Machu Picchu', categoryName: 'Viajes', location: 'Perú', coverKey: 'cielo' },
  { id: '4', title: 'Probar sushi en Tokio', categoryName: 'Comida', location: 'Japón', coverKey: 'dorado' },
  { id: '5', title: 'Aprender a tocar la guitarra', categoryName: 'Aprender', coverKey: 'violeta' },
  { id: '6', title: 'Dormir en un iglú', categoryName: 'Aventura', location: 'Finlandia', coverKey: 'cielo' },
  // 6 more to make it 12 total
  { id: '7', title: 'Bucear en la Gran Barrera', categoryName: 'Deporte', coverKey: 'cielo' },
  { id: '8', title: 'Ver los cerezos en flor', categoryName: 'Viajes', location: 'Japón', coverKey: 'violeta' },
  { id: '9', title: 'Aprender fotografía', categoryName: 'Aprender', coverKey: 'aurora' },
  { id: '10', title: 'Correr una maratón', categoryName: 'Deporte', coverKey: 'dorado' },
  { id: '11', title: 'Visitar el Coliseo', categoryName: 'Viajes', location: 'Italia', coverKey: 'atardecer' },
  { id: '12', title: 'Cocinar pasta fresca', categoryName: 'Comida', coverKey: 'atardecer' },
];

const DEFAULT_TASKS: UnassignedTask[] = [
  { id: 'd1', title: 'Ver una aurora boreal', categoryName: 'Viajes', coverKey: 'aurora' },
  { id: 'd2', title: 'Volar en globo al amanecer', categoryName: 'Viajes', coverKey: 'atardecer' },
  { id: 'd3', title: 'Dormir en un iglú', categoryName: 'Aventura', coverKey: 'cielo' },
  { id: 'd4', title: 'Nadar con delfines', categoryName: 'Aventura', coverKey: 'cielo' },
  { id: 'd5', title: 'Cenar en un faro', categoryName: 'Comida', coverKey: 'dorado' },
];

export const defaultTasks: UnassignedTask[] = DEFAULT_TASKS.map((t) => ({ ...t, isDefault: true }));

import { supabase } from '../supabase';
import { resolveTaskImage } from '../../utils/taskImage';
import { applyAlbumTagsToTasks } from '../../hooks/useAlbumTags';
import {
  applyAddToAlbum,
  beginOptimistic,
  rollbackOptimistic,
  settleTaskCaches,
} from '../../utils/optimisticCache';

export const tasksService = {
  /**
   * Todas las tareas que el usuario puede añadir a un álbum:
   *  - las suyas,
   *  - las de colaboraciones aceptadas,
   *  - las de álbumes compartidos donde es dueño o miembro aceptado.
   * Cada una lleva `inAlbum` para que la pantalla oculte las que ya están en el álbum destino
   * (una tarea puede estar en varios álbumes, así que estar en OTRO álbum no la excluye).
   */
  async getUnassignedTasks(albumId?: string): Promise<UnassignedTask[]> {
    const { data: userAuth, error: userError } = await supabase.auth.getUser();
    if (userError || !userAuth.user) throw new Error('Not authenticated');
    const userId = userAuth.user.id;

    const select =
      'id, title, location_text, created_at, cover_image, thumbnail_mode, thumbnail_photo_id, visibility, priority, ' +
      'categories(name_es, name_en, slug), album_items(album_id), bucket_photos(id, storage_path, thumb_path, created_at, completed_at, title)';

    const { data: own, error } = await supabase
      .from('buckets')
      .select(select)
      .eq('user_id', userId);
    if (error) throw error;

    const extraIds = new Set<string>();

    try {
      const { data: collab } = await supabase
        .from('bucket_collaborators')
        .select('bucket_id')
        .eq('user_id', userId)
        .in('status', ['accepted', 'pending']);
      (collab ?? []).forEach((c: any) => extraIds.add(c.bucket_id));
    } catch {
      // sin colaboraciones
    }

    try {
      const [{ data: memberRows }, { data: ownedAlbums }] = await Promise.all([
        supabase.from('album_members').select('album_id').eq('user_id', userId).eq('status', 'accepted'),
        supabase.from('albums').select('id').eq('owner_id', userId),
      ]);
      const albumIds = Array.from(
        new Set([
          ...(memberRows ?? []).map((m: any) => m.album_id),
          ...(ownedAlbums ?? []).map((a: any) => a.id),
        ]),
      );
      if (albumIds.length > 0) {
        const { data: items } = await supabase
          .from('album_items')
          .select('bucket_id')
          .in('album_id', albumIds);
        (items ?? []).forEach((i: any) => extraIds.add(i.bucket_id));
      }
    } catch {
      // sin álbumes compartidos
    }

    const ownIds = new Set((own ?? []).map((b: any) => b.id));
    const missing = Array.from(extraIds).filter((id) => !ownIds.has(id));

    let others: any[] = [];
    if (missing.length > 0) {
      const { data: otherData } = await supabase.from('buckets').select(select).in('id', missing);
      others = otherData ?? [];
    }

    return [...(own ?? []), ...others]
      .sort((a: any, b: any) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .map((b: any) => ({
        id: b.id,
        title: b.title,
        categoryName: (b.categories)?.name_es || '',
        location: b.location_text || undefined,
        coverKey: 'aurora',
        imageValue: resolveTaskImage(b, { preferThumb: true }),
        categorySlug: (b.categories)?.slug ?? null,
        visibility: (b.visibility) || 'public',
        priority: (b.priority) || 'medium',
        inAlbum: !!albumId && (b.album_items ?? []).some((ai: any) => ai.album_id === albumId),
      }));
  },

  async assignTasksToAlbum(
    albumId: string,
    taskIds: string[],
    updateVisibility?: 'public' | 'followers' | 'private',
    updatePriority?: 'low' | 'medium' | 'high' | 'urgent'
  ): Promise<void> {
    if (!taskIds.length) return;

    const patch: Record<string, string> = {};
    if (updateVisibility) patch.visibility = updateVisibility;
    if (updatePriority) patch.priority = updatePriority;
    if (Object.keys(patch).length > 0) {
      await supabase.from('buckets').update(patch).in('id', taskIds);
    }
    
    // Las tareas nuevas van al final del orden manual del álbum.
    const { data: last } = await supabase
      .from('album_items')
      .select('position')
      .eq('album_id', albumId)
      .order('position', { ascending: false })
      .limit(1);
    const start = ((last?.[0] as any)?.position ?? -1) + 1;

    const itemsToUpsert = taskIds.map((id, i) => ({
      album_id: albumId,
      bucket_id: id,
      position: start + i,
    }));

    const { error } = await supabase
      .from('album_items')
      .upsert(itemsToUpsert);

    if (error) throw error;

    // Propagar automáticamente las etiquetas del álbum a las tareas asignadas
    await applyAlbumTagsToTasks(albumId, taskIds);
  },

  async createTasksFromDefaults(
    ids: string[],
    visibility?: 'public' | 'followers' | 'private'
  ): Promise<string[]> {
    const { data: userAuth, error: userError } = await supabase.auth.getUser();
    if (userError || !userAuth.user) throw new Error('Not authenticated');

    const defaultItems = DEFAULT_TASKS.filter(dt => ids.includes(dt.id));
    if (!defaultItems.length) return [];
    
    // Map categories if available
    const { data: categories } = await supabase.from('categories').select('id, slug, name_es');
    const catMap = new Map<string, string>();
    (categories ?? []).forEach((c: any) => {
      if (c.slug) catMap.set(c.slug.toLowerCase(), c.id);
      if (c.name_es) catMap.set(c.name_es.toLowerCase(), c.id);
    });

    const categorySlugMap: Record<string, string> = {
      'viajes': 'travel',
      'comida': 'food',
      'deporte': 'sport',
      'aventura': 'sport',
      'creatividad': 'creative',
      'social': 'social',
    };

    const inserts = defaultItems.map(dt => {
      const catLower = dt.categoryName.toLowerCase();
      const mappedSlug = categorySlugMap[catLower] || catLower;
      const categoryId = catMap.get(catLower) || catMap.get(mappedSlug) || null;

      return {
        user_id: userAuth.user.id,
        title: dt.title,
        location_text: null,
        category_id: categoryId,
        status: 'pending' as const,
        visibility: visibility || ('public' as const),
      };
    });

    const { data, error } = await supabase
      .from('buckets')
      .insert(inserts)
      .select('id');

    if (error) throw error;

    return data.map(b => b.id);
  }
};

export function useUnassignedTasks(albumId?: string) {
  return useQuery({
    queryKey: ['unassigned_tasks', albumId ?? null],
    queryFn: () => tasksService.getUnassignedTasks(albumId),
  });
}

export function useAssignTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      albumId,
      taskIds,
      updateVisibility,
      updatePriority,
    }: {
      albumId: string;
      taskIds: string[];
      updateVisibility?: 'public' | 'followers' | 'private';
      updatePriority?: 'low' | 'medium' | 'high' | 'urgent';
    }) => tasksService.assignTasksToAlbum(albumId, taskIds, updateVisibility, updatePriority),
    // Las tareas aparecen en el álbum al instante (si tenemos sus datos en caché).
    onMutate: async ({ albumId, taskIds }: { albumId: string; taskIds: string[]; updateVisibility?: 'public' | 'followers' | 'private'; updatePriority?: 'low' | 'medium' | 'high' | 'urgent' }) => {
      const snap = await beginOptimistic(queryClient);
      applyAddToAlbum(queryClient, taskIds, albumId);
      return { snap };
    },
    onError: (_e, _vars, ctx) => {
      rollbackOptimistic(queryClient, ctx?.snap);
    },
    onSettled: () => {
      settleTaskCaches(queryClient);
    },
  });
}

export function useCreateTasksFromDefaults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: string[] | { ids: string[]; visibility?: 'public' | 'followers' | 'private' }) => {
      if (Array.isArray(args)) {
        return tasksService.createTasksFromDefaults(args);
      }
      return tasksService.createTasksFromDefaults(args.ids, args.visibility);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
    },
  });
}

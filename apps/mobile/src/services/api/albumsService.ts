import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useAuthStore } from '../../stores/auth.store';
import { resolveTaskImage } from '../../utils/taskImage';

export interface TaskItem {
  id: string;
  title: string;
  categoryName: string;
  coverKey: string;
  isCompleted: boolean;
  dueDate?: string;
  /** Fecha en que se completó (para ordenar). */
  completedAt?: string | null;
  /** Fecha de creación (para ordenar). */
  createdAt?: string | null;
  /** Posición manual dentro del álbum (album_items.position). */
  position?: number | null;
  stepsTotal?: number;
  stepsCompleted?: number;
  location?: string;
  /** Valor para `BucketCover` (foto elegida/última, portada o null = degradado automático). */
  imageValue?: string | null;
  categorySlug?: string | null;
  priority?: string | null;
  tags?: Array<{ id: string; name: string; color: string; emoji?: string | null }>;
}

export interface AlbumDetail {
  id: string;
  title: string;
  description?: string;
  coverKey: string;
  coverPath?: string;
  visibility?: 'public' | 'followers' | 'private' | string;
  isShared: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  is_closed?: boolean;
  closed_at?: string | null;
  /** Fecha de creación del álbum. */
  createdAt?: string | null;
  /** Última modificación del álbum (si la tabla tiene `updated_at`). */
  updatedAt?: string | null;
  ownerId?: string;
  owner?: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  };
  tasks: TaskItem[];
}

export const albumsService = {
  async getAlbum(id: string, userId?: string): Promise<AlbumDetail> {
    if (!userId) throw new Error('Not authenticated');

    if (id === 'unassigned') {
      const selectCols = `
          id, title, deadline, created_at, completed_at, cover_image, thumbnail_mode, thumbnail_photo_id, status, priority,
          category_id, counter_count, counter_target,
          categories ( name_es, color, slug ),
          item_subtasks ( id, done ),
          bucket_photos ( id, storage_path, thumb_path, created_at, completed_at, title ),
          album_items ( album_id )
      `;
      const { data: allUserBuckets, error: bucketsError } = await supabase
        .from('buckets')
        .select(selectCols)
        .eq('user_id', userId);

      if (bucketsError) throw bucketsError;

      let collabBuckets: any[] = [];
      try {
        const { data: collabData } = await supabase
          .from('bucket_collaborators')
          .select('bucket_id')
          .eq('user_id', userId)
          .in('status', ['accepted', 'pending']);
        const collabIds = (collabData ?? []).map((c: any) => c.bucket_id);
        const ownIds = new Set((allUserBuckets ?? []).map((b: any) => b.id));
        const missingCollabIds = collabIds.filter((cid: string) => !ownIds.has(cid));
        if (missingCollabIds.length > 0) {
          const { data: extraCollab } = await supabase
            .from('buckets')
            .select(selectCols)
            .in('id', missingCollabIds);
          collabBuckets = extraCollab ?? [];
        }
      } catch {
        // sin colaboraciones
      }

      const mergedBuckets = [...(allUserBuckets ?? []), ...collabBuckets];
      const unassignedBuckets = mergedBuckets.filter(b => !b.album_items || b.album_items.length === 0);

      const tasks = unassignedBuckets.map(b => {
        const cat = b.categories;
        const subtasks = b.item_subtasks as any[];
        
        let stepsTotal = subtasks ? subtasks.length : 0;
        let stepsCompleted = subtasks ? subtasks.filter(s => s.done).length : 0;
        
        if (stepsTotal === 0 && b.counter_target && b.counter_target > 0) {
           stepsTotal = b.counter_target;
           stepsCompleted = b.counter_count || 0;
        }

        return {
          id: b.id,
          title: b.title,
          categoryName: cat?.name_es || 'Sin categoría',
          coverKey: 'aurora',
          imageValue: resolveTaskImage(b, { preferThumb: true }),
          categorySlug: cat?.slug ?? null,
          isCompleted: b.status === 'completed',
          dueDate: b.deadline || undefined,
          completedAt: (b).completed_at ?? null,
          createdAt: (b).created_at ?? null,
          position: null,
          priority: b.priority || 'medium',
          stepsTotal,
          stepsCompleted,
        };
      });

      return {
        id: 'unassigned',
        title: 'Sin álbum',
        coverKey: 'aurora',
        visibility: 'private',
        isShared: false,
        ownerId: userId,
        tasks,
      };
    }

    // Detalle del álbum y sus items en PARALELO (antes eran dos viajes seguidos al servidor).
    const [albumRes, itemsRes] = await Promise.all([
      supabase
        .from('albums')
        .select('*, owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)')
        .eq('id', id)
        .single(),
      supabase.from('album_items').select('bucket_id, position').eq('album_id', id),
    ]);
    const { data: album, error: albumError } = albumRes;

    if (albumError) throw albumError;

    let coverKey = 'aurora';
    if (album.cover_path) {
      try {
        const parsed = JSON.parse(album.cover_path);
        coverKey = parsed.id || 'aurora';
      } catch {
        // Ignored
      }
    }

    const { data: albumItems, error: itemsError } = itemsRes;

    if (itemsError) throw itemsError;
    const positionByBucket = new Map<string, number | null>(
      (albumItems ?? []).map((ai: any) => [ai.bucket_id as string, (ai.position ?? null) as number | null]),
    );

    let tasks: TaskItem[] = [];

    if (albumItems && albumItems.length > 0) {
      const bucketIds = albumItems.map(ai => ai.bucket_id);
      // Etiquetas en paralelo con las tareas (antes se pedían una detrás de otra).
      const tagsPromise: Promise<{ data: any[] | null }> = Promise.resolve(
        supabase
          .from('item_tags')
          .select('item_id, tag:tags(id, name, color, emoji)')
          .in('item_id', bucketIds),
      ).then(
        (r: any) => r,
        () => ({ data: null }),
      );
      const { data: buckets, error: bucketsError } = await supabase
        .from('buckets')
        .select(`
          id, title, deadline, created_at, completed_at, cover_image, thumbnail_mode, thumbnail_photo_id, status, priority,
          category_id, counter_count, counter_target,
          categories ( name_es, color, slug ),
          item_subtasks ( id, done ),
          bucket_photos ( id, storage_path, thumb_path, created_at, completed_at, title )
        `)
        .in('id', bucketIds);

      if (bucketsError) throw bucketsError;

      const tagsByTask = new Map<string, Array<{ id: string; name: string; color: string; emoji?: string | null }>>();
      try {
        const { data: itemTags } = await tagsPromise;
        if (itemTags) {
          for (const it of itemTags) {
            const t = (it).tag;
            if (t && it.item_id) {
              const arr = tagsByTask.get(it.item_id) || [];
              arr.push({ id: t.id, name: t.name, color: t.color, emoji: t.emoji });
              tagsByTask.set(it.item_id, arr);
            }
          }
        }
      } catch {
        // Ignorado
      }

      tasks = (buckets || []).map(b => {
        const cat = b.categories as any;
        const subtasks = b.item_subtasks as any[];
        
        let stepsTotal = subtasks ? subtasks.length : 0;
        let stepsCompleted = subtasks ? subtasks.filter(s => s.done).length : 0;
        
        // Use counter if it's not a list of subtasks and has a target
        if (stepsTotal === 0 && b.counter_target && b.counter_target > 0) {
           stepsTotal = b.counter_target;
           stepsCompleted = b.counter_count || 0;
        }

        return {
          id: b.id,
          title: b.title,
          categoryName: cat?.name_es || 'Sin categoría',
          coverKey: coverKey,
          imageValue: resolveTaskImage(b as any, { preferThumb: true }),
          categorySlug: cat?.slug ?? null,
          isCompleted: b.status === 'completed',
          dueDate: b.deadline || undefined,
          completedAt: (b as any).completed_at ?? null,
          createdAt: (b as any).created_at ?? null,
          position: positionByBucket.get(b.id) ?? null,
          priority: b.priority || 'medium',
          stepsTotal,
          stepsCompleted,
          tags: tagsByTask.get(b.id) || [],
        };
      });
    }

    let ownerProfile = Array.isArray(album.owner) ? album.owner[0] : album.owner;
    if (!ownerProfile && album.owner_id) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', album.owner_id)
        .single();
      if (p) ownerProfile = p;
    }

    return {
      id: album.id,
      title: album.title,
      description: album.description || undefined,
      coverKey: coverKey,
      coverPath: album.cover_path || undefined,
      visibility: album.visibility || 'private',
      isShared: album.is_shared || false,
      priority: (album.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
      is_closed: Boolean(album.is_closed),
      closed_at: album.closed_at || null,
      createdAt: album.created_at || null,
      updatedAt: album.updated_at || null,
      ownerId: album.owner_id,
      owner: ownerProfile ? {
        id: ownerProfile.id,
        username: ownerProfile.username,
        display_name: ownerProfile.display_name,
        avatar_url: ownerProfile.avatar_url,
      } : undefined,
      tasks,
    };
  },

  async deleteAlbum(id: string): Promise<void> {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

export function useAlbumDetail(albumId: string) {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: ['album', albumId, user?.id],
    queryFn: () => albumsService.getAlbum(albumId, user?.id),
    enabled: !!user?.id && !!albumId,
  });
}

export function useDeleteAlbumDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (albumId: string) => albumsService.deleteAlbum(albumId),
    onMutate: async (albumId: string) => {
      await queryClient.cancelQueries({ queryKey: ['albums'] });
      const prevQueries = queryClient.getQueriesData<any[]>({ queryKey: ['albums'] });

      // Eliminación optimista inmediata en la caché
      queryClient.setQueriesData<any[]>({ queryKey: ['albums'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((a: any) => a.id !== albumId);
      });
      queryClient.removeQueries({ queryKey: ['album', albumId] });

      return { prevQueries };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevQueries) {
        ctx.prevQueries.forEach(([qKey, qData]) => {
          queryClient.setQueryData(qKey, qData);
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['album'] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
  });
}

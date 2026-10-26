import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { toast } from '@bucketlist/ui';

export const ALBUMS_QUERY_KEY = ['albums'];

export interface AlbumWithProgress {
  id: string;
  title: string;
  description: string | null;
  cover_path: string | null;
  visibility: string;
  is_shared: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  is_closed?: boolean;
  closed_at?: string | null;
  created_at?: string;
  total_tasks: number;
  completed_tasks: number;
  tags?: string[];
}

export async function fetchAlbums(userId: string): Promise<AlbumWithProgress[]> {
  if (!userId) return [];

  // 1. Fetch own albums and shared memberships in parallel
  const [ownResult, memberRowsResult] = await Promise.all([
    supabase
      .from('albums')
      .select('id, title, description, cover_path, visibility, is_shared, priority, is_closed, closed_at, created_at, owner_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('album_members')
      .select('album_id')
      .eq('user_id', userId)
      .eq('status', 'accepted'),
  ]);

  if (ownResult.error) throw ownResult.error;

  const ownAlbums = ownResult.data ?? [];
  const ownIds = new Set(ownAlbums.map((a: any) => a.id));

  // 2. Fetch member albums only if there are shared albums not owned
  const sharedAlbumIds = (memberRowsResult.data ?? [])
    .map((m: any) => m.album_id)
    .filter((id: string) => !ownIds.has(id));

  let sharedAlbums: any[] = [];
  if (sharedAlbumIds.length > 0) {
    try {
      const { data: memberAlbums } = await supabase
        .from('albums')
        .select('id, title, description, cover_path, visibility, is_shared, priority, is_closed, closed_at, created_at, owner_id')
        .in('id', sharedAlbumIds)
        .order('created_at', { ascending: false });
      sharedAlbums = memberAlbums ?? [];
    } catch {
      // Ignored
    }
  }

  const allAlbums = [...ownAlbums, ...sharedAlbums];
  if (allAlbums.length === 0) return [];

  const allAlbumIds = allAlbums.map((a) => a.id);

  // 3. Fetch progress and tags in parallel
  const [progressResult, atRowsResult] = await Promise.all([
    supabase
      .from('album_progress')
      .select('album_id, total_tasks, completed_tasks')
      .in('album_id', allAlbumIds),
    supabase
      .from('album_tags')
      .select('album_id, tag_id')
      .in('album_id', allAlbumIds),
  ]);

  const progressData = progressResult.data ?? [];
  const atRows = atRowsResult.data ?? [];

  const albumTagsMap: Record<string, string[]> = {};
  for (const row of atRows) {
    if (row?.album_id && row?.tag_id) {
      const list = albumTagsMap[row.album_id] || [];
      list.push(row.tag_id);
      albumTagsMap[row.album_id] = list;
    }
  }

  allAlbums.forEach((album) => {
    if (album.cover_path && typeof album.cover_path === 'string' && album.cover_path.startsWith('{')) {
      try {
        const parsed = JSON.parse(album.cover_path);
        if (Array.isArray(parsed?.tag_ids) && parsed.tag_ids.length > 0) {
          const existing = albumTagsMap[album.id] || [];
          albumTagsMap[album.id] = Array.from(new Set([...existing, ...parsed.tag_ids]));
        }
      } catch {}
    }
  });

  return allAlbums.map((album) => {
    const prog = progressData.find((p) => p.album_id === album.id);

    return {
      id: album.id,
      title: album.title,
      description: album.description,
      cover_path: album.cover_path,
      visibility: album.visibility,
      is_shared: album.is_shared,
      priority: (album.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
      is_closed: Boolean(album.is_closed),
      closed_at: album.closed_at || null,
      created_at: album.created_at || undefined,
      total_tasks: prog?.total_tasks || 0,
      completed_tasks: prog?.completed_tasks || 0,
      tags: albumTagsMap[album.id] || [],
    };
  });
}

export function useAlbums(userId?: string) {
  return useQuery({
    queryKey: [...ALBUMS_QUERY_KEY, userId],
    queryFn: () => (userId ? fetchAlbums(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché fresca
    gcTime: 1000 * 60 * 30, // 30 minutos en memoria
    placeholderData: (prev) => prev,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      visibility: string;
      cover_path?: string;
      is_shared?: boolean;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }) => {
      const { data: newAlbum, error } = await supabase
        .from('albums')
        .insert({
          title: data.title,
          description: data.description || '',
          visibility: data.visibility,
          owner_id: user?.id,
          cover_path: data.cover_path || null,
          is_shared: data.is_shared || false,
          priority: data.priority || 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      return newAlbum;
    },
    onSuccess: () => {
      toast.success('Álbum creado con éxito');
      queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
    },
  });
}

export function useUpdateAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        title?: string;
        description?: string;
        visibility?: string;
        cover_path?: string;
        is_shared?: boolean;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        is_closed?: boolean;
        closed_at?: string | null;
      };
    }) => {
      const { data: updatedAlbum, error } = await (supabase as any)
        .from('albums')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedAlbum;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['album', variables.id] });
    },
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('albums')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ALBUMS_QUERY_KEY });
      // Guardar snapshot de todas las queries de álbumes
      const prevQueries = queryClient.getQueriesData<AlbumWithProgress[]>({ queryKey: ALBUMS_QUERY_KEY });

      // Eliminación optimista inmediata en la caché
      queryClient.setQueriesData<AlbumWithProgress[]>({ queryKey: ALBUMS_QUERY_KEY }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((a: any) => a.id !== id);
      });
      queryClient.removeQueries({ queryKey: ['album', id] });

      return { prevQueries };
    },
    onError: (_err, _id, ctx) => {
      // Revertir en caso de error
      if (ctx?.prevQueries) {
        ctx.prevQueries.forEach(([qKey, qData]) => {
          queryClient.setQueryData(qKey, qData);
        });
      }
    },
    onSuccess: () => {
      toast.success('Álbum eliminado');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
  });
}



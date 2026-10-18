import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

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

export function useAlbums(userId?: string) {
  return useQuery({
    queryKey: [...ALBUMS_QUERY_KEY, userId],
    queryFn: async (): Promise<AlbumWithProgress[]> => {
      if (!userId) return [];

      // 1. Albums owned by user
      const { data: ownAlbums, error: ownErr } = await supabase
        .from('albums')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (ownErr) throw ownErr;

      // 2. Shared albums where user is an accepted member
      let sharedAlbums: any[] = [];
      try {
        const { data: memberRows } = await supabase
          .from('album_members')
          .select('album_id')
          .eq('user_id', userId)
          .eq('status', 'accepted');

        const sharedAlbumIds = (memberRows ?? []).map((m: any) => m.album_id);
        if (sharedAlbumIds.length > 0) {
          const { data: memberAlbums } = await supabase
            .from('albums')
            .select('*')
            .in('id', sharedAlbumIds)
            .order('created_at', { ascending: false });
          sharedAlbums = memberAlbums ?? [];
        }
      } catch {
        // Ignored
      }

      const ownIds = new Set((ownAlbums ?? []).map((a: any) => a.id));
      const allAlbums = [
        ...(ownAlbums ?? []),
        ...sharedAlbums.filter((a: any) => !ownIds.has(a.id)),
      ];

      if (allAlbums.length === 0) return [];

      const { data: progressData } = await supabase
        .from('album_progress')
        .select('*')
        .in('album_id', allAlbums.map(a => a.id));

      const albumTagsMap: Record<string, string[]> = {};
      try {
        const { data: atRows } = await supabase
          .from('album_tags')
          .select('album_id, tag_id')
          .in('album_id', allAlbums.map(a => a.id));
        if (atRows) {
          for (const row of atRows) {
            if (row?.album_id && row?.tag_id) {
              const list = albumTagsMap[row.album_id] || [];
              list.push(row.tag_id);
              albumTagsMap[row.album_id] = list;
            }
          }
        }
      } catch {
        // Ignored
      }

      allAlbums.forEach(album => {
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

      return allAlbums.map(album => {
        const prog = progressData?.find(p => p.album_id === album.id);

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
    },
    enabled: !!userId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
    },
  });
}



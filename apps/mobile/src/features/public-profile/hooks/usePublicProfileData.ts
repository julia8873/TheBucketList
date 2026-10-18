import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import type { AlbumWithProgress } from '../../../hooks/useAlbums';

interface UsePublicProfileDataParams {
  id?: string;
  isOwnProfile: boolean;
  isLocked: boolean;
  followStatus: string;
  publicOnly?: boolean;
}

export function usePublicProfileData({
  id,
  isOwnProfile,
  isLocked,
  followStatus,
  publicOnly,
}: UsePublicProfileDataParams) {
  // Query for profile data
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Query for public buckets
  const { data: buckets, isLoading: bucketsLoading, refetch: refetchBuckets } = useQuery({
    queryKey: ['buckets', 'public', id, followStatus, !!publicOnly],
    queryFn: async () => {
      const baseSelect = `
        *,
        category:categories(slug, name_es),
        item_subtasks(done),
        bucket_photos(id, storage_path, thumb_path, created_at)
      `;

      let ownQuery = supabase
        .from('buckets')
        .select(baseSelect)
        .eq('user_id', id!)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (!isOwnProfile || publicOnly) {
        ownQuery = ownQuery.neq('visibility', 'private');
      }

      const [ownRes, collabRowsRes, memberAlbumsRes] = await Promise.all([
        ownQuery,
        supabase
          .from('bucket_collaborators')
          .select('bucket_id')
          .eq('user_id', id!)
          .eq('status', 'accepted'),
        supabase
          .from('album_members')
          .select('album_id')
          .eq('user_id', id!)
          .eq('status', 'accepted'),
      ]);

      if (ownRes.error) throw ownRes.error;
      const ownData = ownRes.data ?? [];

      const collabIds = (collabRowsRes.data ?? []).map((c: any) => c.bucket_id);
      const memberAlbumIds = (memberAlbumsRes.data ?? []).map((m: any) => m.album_id);

      let sharedQuery = supabase
        .from('buckets')
        .select(baseSelect)
        .in('id', collabIds.length > 0 ? collabIds : ['00000000-0000-0000-0000-000000000000'])
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      if (!isOwnProfile || publicOnly) {
        sharedQuery = sharedQuery.neq('visibility', 'private');
      }

      const [sharedRes, albumItemRes] = await Promise.all([
        collabIds.length > 0 ? sharedQuery : Promise.resolve({ data: [] }),
        memberAlbumIds.length > 0
          ? supabase.from('album_items').select('bucket_id').in('album_id', memberAlbumIds)
          : Promise.resolve({ data: [] }),
      ]);

      const collabBuckets = sharedRes.data ?? [];
      const albumBucketIds = (albumItemRes.data ?? []).map((ai: any) => ai.bucket_id);

      let albumTasks: any[] = [];
      if (albumBucketIds.length > 0) {
        let albumQuery = supabase
          .from('buckets')
          .select(baseSelect)
          .in('id', albumBucketIds)
          .neq('status', 'archived')
          .order('created_at', { ascending: false });

        if (!isOwnProfile || publicOnly) {
          albumQuery = albumQuery.neq('visibility', 'private');
        }

        const { data: sharedAlbumBuckets } = await albumQuery;
        albumTasks = sharedAlbumBuckets ?? [];
      }

      const existingIds = new Set((ownData ?? []).map((b: any) => b.id));
      const merged = [...(ownData ?? [])];
      for (const b of collabBuckets) {
        if (!existingIds.has(b.id)) {
          existingIds.add(b.id);
          merged.push(b);
        }
      }
      for (const b of albumTasks) {
        if (!existingIds.has(b.id)) {
          existingIds.add(b.id);
          merged.push(b);
        }
      }
      return merged;
    },
    enabled: !!id && !isLocked,
  });

  // Query for public albums
  const { data: publicAlbums, isLoading: albumsLoading, refetch: refetchAlbums } = useQuery({
    queryKey: ['albums', 'public', id, followStatus],
    queryFn: async (): Promise<AlbumWithProgress[]> => {
      if (!id) return [];

      const { data: ownAlbums, error: ownErr } = await supabase
        .from('albums')
        .select('*')
        .eq('owner_id', id)
        .neq('visibility', 'private')
        .order('created_at', { ascending: false });

      if (ownErr) throw ownErr;

      let sharedAlbums: any[] = [];
      try {
        const { data: memberRows } = await supabase
          .from('album_members')
          .select('album_id')
          .eq('user_id', id)
          .eq('status', 'accepted');

        const sharedAlbumIds = (memberRows ?? []).map((m: any) => m.album_id);
        if (sharedAlbumIds.length > 0) {
          const { data: memberAlbums } = await supabase
            .from('albums')
            .select('*')
            .in('id', sharedAlbumIds)
            .neq('visibility', 'private')
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
        .in('album_id', allAlbums.map((a: any) => a.id));

      return allAlbums.map((album: any) => {
        const prog = progressData?.find((p: any) => p.album_id === album.id);
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
        };
      });
    },
    enabled: !!id && !isLocked,
  });

  const refetch = async () => {
    await Promise.all([refetchProfile(), refetchBuckets(), refetchAlbums()]);
  };

  return {
    profile,
    profileLoading,
    buckets,
    bucketsLoading,
    publicAlbums,
    albumsLoading,
    refetch,
    refetchProfile,
    refetchBuckets,
    refetchAlbums,
  };
}

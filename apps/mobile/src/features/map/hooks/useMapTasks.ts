import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@bucketlist/shared';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../stores/auth.store';
import { formatLocalizedLocation, getLocationSynonyms } from '../../../utils/locationI18n';
import type { MapTaskItem, MapFilterType } from '../types';

export function useMapTasks({
  filter = 'all',
  searchQuery = '',
}: {
  filter?: MapFilterType;
  searchQuery?: string;
} = {}) {
  const { user } = useAuthStore();
  const { i18n } = useTranslation();
  const currentUserId = user?.id;

  const {
    data: rawTasks = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['map-tasks', currentUserId || 'anon'],
    queryFn: async (): Promise<MapTaskItem[]> => {
      // 1 & 2. Ejecutar consultas de amigos y de tareas con ubicación en PARALELO
      const [followingRes, followersRes, bucketsRes] = await Promise.all([
        currentUserId
          ? supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', currentUserId)
              .eq('status', 'accepted')
          : Promise.resolve({ data: [] }),
        currentUserId
          ? supabase
              .from('follows')
              .select('follower_id')
              .eq('following_id', currentUserId)
              .eq('status', 'accepted')
          : Promise.resolve({ data: [] }),
        supabase
          .from('buckets')
          .select(`
            id,
            title,
            description,
            location_text,
            location_lat,
            location_lng,
            status,
            visibility,
            cover_image,
            thumbnail_mode,
            thumbnail_photo_id,
            user_id,
            created_at,
            completed_at,
            user:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
            category:categories(slug, name_es, name_en),
            bucket_photos(id, thumb_path, storage_path, created_at)
          `)
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null),
      ]);

      const set = new Set<string>();
      (followingRes.data || []).forEach((f: any) => set.add(f.following_id));
      (followersRes.data || []).forEach((f: any) => set.add(f.follower_id));
      const friendIds = Array.from(set);

      const { data, error } = bucketsRes;
      if (error) {
        console.warn('Error fetching map tasks from Supabase:', error);
        return [];
      }

      const accessible = (data || []).filter((item: any) => {
        // Tareas propias siempre visibles
        if (item.user_id === currentUserId) return true;
        // Tareas públicas de cualquier usuario
        if (item.visibility === 'public' || !item.visibility) return true;
        // Tareas de amigos para visibilidad 'followers'
        if (item.visibility === 'followers' && friendIds.includes(item.user_id)) return true;
        return false;
      });

      const tasksWithCoords: MapTaskItem[] = [];
      for (const item of accessible) {
        const lat =
          item.location_lat != null && !isNaN(Number(item.location_lat))
            ? Number(item.location_lat)
            : null;
        const lng =
          item.location_lng != null && !isNaN(Number(item.location_lng))
            ? Number(item.location_lng)
            : null;

        if (lat === null || lng === null) continue;

        const catData = Array.isArray(item.category) ? item.category[0] : item.category;
        const category = catData
          ? {
              slug: String(catData.slug || ''),
              name: String(catData.name_es || catData.name_en || ''),
              name_es: catData.name_es,
              name_en: catData.name_en,
            }
          : null;

        tasksWithCoords.push({
          ...item,
          category,
          location_lat: lat,
          location_lng: lng,
          is_mine: item.user_id === currentUserId,
          is_friend: friendIds.includes(item.user_id),
        } as unknown as MapTaskItem);
      }

      return tasksWithCoords;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché fresca (reutilización instantánea sin spinner)
    gcTime: 1000 * 60 * 30, // 30 minutos en memoria
  });

  // Filter tasks in memory according to filter & search query
  const isEn = i18n.language?.startsWith('en');
  const filteredTasks = rawTasks
    .filter((task) => {
      // Filter by type
      if (filter === 'mine' && !task.is_mine) return false;
      if (filter === 'friends' && (!task.is_friend || task.is_mine)) return false;
      if (filter === 'completed' && task.status !== 'completed') return false;
      if (filter === 'pending' && task.status === 'completed') return false;

      // Filter by search query (búsqueda unificada multilingüe para títulos, descripciones y sitios)
      if (searchQuery.trim().length > 0) {
        const synonyms = getLocationSynonyms(searchQuery);
        const locLower = (task.location_text || '').toLowerCase();
        const titleLower = (task.title || '').toLowerCase();
        const descLower = (task.description || '').toLowerCase();
        const authorLower = (
          (task.user?.display_name || '') + ' ' + (task.user?.username || '')
        ).toLowerCase();

        const matches = synonyms.some((q) => {
          return (
            titleLower.includes(q) ||
            locLower.includes(q) ||
            descLower.includes(q) ||
            authorLower.includes(q)
          );
        });

        if (!matches) {
          return false;
        }
      }

      return true;
    })
    .map((task) => {
      const localizedLocation = formatLocalizedLocation(
        task.location_text,
        isEn ? 'en' : 'es'
      );

      const catData = task.category;
      const localizedCatName = catData
        ? (isEn
            ? catData.name_en || catData.name_es || catData.name
            : catData.name_es || catData.name_en || catData.name)
        : undefined;

      return {
        ...task,
        location_text: localizedLocation || task.location_text,
        category: catData
          ? {
              ...catData,
              name: localizedCatName || catData.name,
            }
          : null,
      };
    });

  return {
    tasks: filteredTasks,
    allTasksCount: rawTasks.length,
    isLoading,
    isRefetching,
    refetch,
  };
}

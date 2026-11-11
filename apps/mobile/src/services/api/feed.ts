import { supabase } from '../supabase';
import { blockReportApi } from './blockReport';

const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  'AIzaSyD_D_O0H5-j9EtKlu9-Nl3QHNP2fB_IbUg';

const PAGE_SIZE = 10;
// Máximo de IDs que se envían en el filtro `not in` del servidor (evita URLs enormes).
// Siempre se vuelve a filtrar en cliente, así que el resultado es correcto aunque se supere.
const MAX_SERVER_EXCLUDE_IDS = 150;

// Caché en memoria de corta duración (45 segundos) para evitar consultas duplicadas
// simultáneas entre pestañas del feed y acelerar la paginación a 0ms de subconsultas.
const CACHE_TTL_MS = 45 * 1000;
const collabBucketCache = new Map<string, { ids: string[]; expires: number }>();
const followsCache = new Map<string, { ids: string[]; expires: number }>();

/**
 * IDs de tareas (de otras personas) en las que el usuario ya es colaborador
 * (aceptado o con invitación pendiente, ya sea directo o vía álbum compartido).
 * Esas tareas ya pertenecen a "Mi lista", por lo que no deben salir en
 * "Momentos de amigos" ni en "Explorar".
 */
const getCollaboratingBucketIds = async (userId?: string, forceFresh: boolean = false): Promise<string[]> => {
  if (!userId) return [];
  const now = Date.now();
  if (!forceFresh) {
    const cached = collabBucketCache.get(userId);
    if (cached && cached.expires > now) return cached.ids;
  }

  try {
    const [directCollabRes, memberAlbumsRes, ownedAlbumsRes] = await Promise.all([
      supabase
        .from('bucket_collaborators')
        .select('bucket_id')
        .eq('user_id', userId)
        .in('status', ['accepted', 'pending']),
      supabase
        .from('album_members')
        .select('album_id')
        .eq('user_id', userId)
        .eq('status', 'accepted'),
      supabase
        .from('albums')
        .select('id')
        .eq('owner_id', userId),
    ]);

    const directIds = (directCollabRes.data ?? []).map((c: any) => c.bucket_id as string);
    const albumIds = Array.from(
      new Set([
        ...(memberAlbumsRes.data ?? []).map((m: any) => m.album_id as string),
        ...(ownedAlbumsRes.data ?? []).map((a: any) => a.id as string),
      ])
    );

    let albumTaskIds: string[] = [];
    if (albumIds.length > 0) {
      const { data: albumItems } = await supabase
        .from('album_items')
        .select('bucket_id')
        .in('album_id', albumIds);
      albumTaskIds = (albumItems ?? []).map((ai: any) => ai.bucket_id as string);
    }

    const result = Array.from(new Set([...directIds, ...albumTaskIds]));
    collabBucketCache.set(userId, { ids: result, expires: now + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.warn('Error fetching collaborating bucket ids:', err);
    return [];
  }
};

const getAcceptedFollowingIds = async (userId: string, forceFresh: boolean = false): Promise<string[]> => {
  const now = Date.now();
  if (!forceFresh) {
    const cached = followsCache.get(userId);
    if (cached && cached.expires > now) return cached.ids;
  }

  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');

  if (error) throw error;
  const ids = (data ?? []).map((f: any) => f.following_id as string);
  followsCache.set(userId, { ids, expires: now + CACHE_TTL_MS });
  return ids;
};

export const feedApi = {
  /**
   * "Momentos de amigos": todas las tareas públicas y para seguidores de la gente a la que sigo.
   * Se excluyen las tareas del propio usuario y de usuarios bloqueados.
   */
  getFeed: async (userId: string, pageParam: number = 0) => {
    const [followingIds, blockedIds, collabBucketIds] = await Promise.all([
      getAcceptedFollowingIds(userId),
      blockReportApi.getMutualBlockedUserIds(userId),
      getCollaboratingBucketIds(userId),
    ]);

    const blockedSet = new Set(blockedIds);
    const collabSet = new Set(collabBucketIds);

    // Solo amigos seguidos (excluyendo al propio usuario y a usuarios con bloqueo)
    const targetIds = followingIds.filter((id: string) => id !== userId && !blockedSet.has(id));

    if (targetIds.length === 0) {
      return {
        items: [],
        nextCursor: undefined,
      };
    }

    // Tareas donde amigos son colaboradores aceptados
    let friendCollabBucketIds: string[] = [];
    try {
      const { data: collabData } = await supabase
        .from('bucket_collaborators')
        .select('bucket_id')
        .in('user_id', targetIds)
        .eq('status', 'accepted')
        .limit(100);
      friendCollabBucketIds = Array.from(
        new Set(
          (collabData ?? [])
            .map((c: any) => c.bucket_id as string)
            .filter((id: string) => !collabSet.has(id))
        )
      );
    } catch (err) {
      console.warn('Error fetching friends collaborative bucket ids:', err);
    }

    // Obtenemos todas las tareas públicas y visibles para seguidores de nuestros amigos
    let feedQuery = supabase
      .from('buckets')
      .select(
        `
        *,
        actor:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
        category:categories(slug),
        bucket_photos(id, thumb_path, storage_path, created_at),
        reactions(emoji, user_id),
        comments:comments(count)
      `
      )
      .in('visibility', ['public', 'followers']);

    if (friendCollabBucketIds.length > 0) {
      feedQuery = feedQuery.or(`user_id.in.(${targetIds.join(',')}),id.in.(${friendCollabBucketIds.join(',')})`);
    } else {
      feedQuery = feedQuery.in('user_id', targetIds);
    }

    // Excluir tareas en las que ya soy colaborador
    if (collabBucketIds.length > 0 && collabBucketIds.length <= MAX_SERVER_EXCLUDE_IDS) {
      feedQuery = feedQuery.not('id', 'in', `(${collabBucketIds.join(',')})`);
    }

    const { data, error } = await feedQuery
      .order('created_at', { ascending: false })
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    // Mapear al formato que espera FeedCard y unificar las tareas que tengan colaboradores
    // para que la misma tarea solo se muestre una vez y nunca si el usuario actual colabora en ella.
    const seenBucketIds = new Set<string>();
    const items: any[] = [];
    for (const b of (data ?? [])) {
      if (!b || b.user_id === userId || collabSet.has(b.id) || blockedSet.has(b.user_id)) {
        continue;
      }
      if (seenBucketIds.has(b.id)) {
        continue;
      }
      seenBucketIds.add(b.id);
      items.push({
        id: b.id,
        actor_id: b.user_id,
        bucket_id: b.id,
        actor: b.actor,
        bucket: b,
        type: b.status === 'completed' ? 'completed' : 'new_bucket',
        created_at: b.completed_at || b.created_at,
      });
    }

    return {
      items,
      nextCursor: (data ?? []).length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  },

  /**
   * "Explorar": tareas públicas de personas a las que el usuario NO sigue (y que no sean del propio usuario ni usuarios bloqueados).
   */
  getExploreFeed: async (pageParam: number = 0, userId?: string) => {
    const limit = 15;
    let excludedUserIds: string[] = [];
    let collabBucketIds: string[] = [];

    if (userId) {
      const [friendIds, blockedIds, collabIds] = await Promise.all([
        getAcceptedFollowingIds(userId),
        blockReportApi.getMutualBlockedUserIds(userId),
        getCollaboratingBucketIds(userId),
      ]);
      collabBucketIds = collabIds;
      // Excluir al propio usuario, a todos sus amigos Y a usuarios con bloqueo
      excludedUserIds = Array.from(new Set([userId, ...friendIds, ...blockedIds]));
    }

    let query = supabase
      .from('buckets')
      .select(
        `
        *,
        user:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
        category:categories(slug),
        bucket_photos(id, thumb_path, storage_path, created_at),
        reactions(emoji, user_id),
        comments:comments(count)
      `
      )
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    // Excluir al usuario, amigos y bloqueados para que solo salgan personas permitidas
    if (excludedUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludedUserIds.join(',')})`);
    }

    // Excluir tareas en las que ya soy colaborador
    if (collabBucketIds.length > 0 && collabBucketIds.length <= MAX_SERVER_EXCLUDE_IDS) {
      query = query.not('id', 'in', `(${collabBucketIds.join(',')})`);
    }

    const { data, error } = await query.range(
      pageParam * limit,
      (pageParam + 1) * limit - 1
    );

    if (error) throw error;

    const excludedSet = new Set(excludedUserIds);
    const collabSet = new Set(collabBucketIds);
    const items = (data ?? []).filter(
      (b: any) => !excludedSet.has(b.user_id) && !collabSet.has(b.id)
    );

    return {
      items,
      nextCursor: (data ?? []).length === limit ? pageParam + 1 : undefined,
    };
  },

  /**
   * Álbumes de amigos: álbumes públicos o para seguidores de la gente que sigo.
   */
  getFriendsAlbums: async (userId: string, pageParam: number = 0) => {
    const PAGE = 10;
    const [followingIds, blockedIds] = await Promise.all([
      getAcceptedFollowingIds(userId),
      blockReportApi.getMutualBlockedUserIds(userId),
    ]);

    const blockedSet = new Set(blockedIds);
    const targetIds = followingIds.filter((id: string) => id !== userId && !blockedSet.has(id));

    if (targetIds.length === 0) return { items: [], nextCursor: undefined };

    const { data, error } = await supabase
      .from('albums')
      .select(`
        id, title, description, cover_path, visibility, is_shared, priority,
        is_closed, closed_at, created_at, owner_id,
        owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)
      `)
      .in('owner_id', targetIds)
      .in('visibility', ['public', 'followers'])
      .order('created_at', { ascending: false })
      .range(pageParam * PAGE, (pageParam + 1) * PAGE - 1);

    if (error) throw error;

    // Fetch task counts from album_progress
    const albumIds = (data ?? []).map((a: any) => a.id);
    const progressMap = new Map<string, { total: number; completed: number }>();
    if (albumIds.length > 0) {
      const { data: prog } = await supabase
        .from('album_progress')
        .select('album_id, total_tasks, completed_tasks')
        .in('album_id', albumIds);
      (prog ?? []).forEach((p: any) => {
        progressMap.set(p.album_id, { total: p.total_tasks || 0, completed: p.completed_tasks || 0 });
      });
    }

    const items = (data ?? []).map((a: any) => {
      const prog = progressMap.get(a.id) || { total: 0, completed: 0 };
      const ownerProfile = Array.isArray(a.owner) ? a.owner[0] : a.owner;
      return {
        _type: 'album' as const,
        id: a.id,
        title: a.title,
        description: a.description || null,
        cover_path: a.cover_path || null,
        visibility: a.visibility,
        is_shared: a.is_shared,
        priority: a.priority || 'medium',
        is_closed: Boolean(a.is_closed),
        created_at: a.created_at,
        total_tasks: prog.total,
        completed_tasks: prog.completed,
        owner: ownerProfile || null,
      };
    });

    return {
      items,
      nextCursor: (data ?? []).length === PAGE ? pageParam + 1 : undefined,
    };
  },

  /**
   * Álbumes para explorar: álbumes públicos de personas que no sigo (excluyendo bloqueados).
   */
  getExploreAlbums: async (pageParam: number = 0, userId?: string) => {
    const LIMIT = 12;
    let excludedUserIds: string[] = [];

    if (userId) {
      const [friendIds, blockedIds] = await Promise.all([
        getAcceptedFollowingIds(userId),
        blockReportApi.getMutualBlockedUserIds(userId),
      ]);
      excludedUserIds = Array.from(new Set([userId, ...friendIds, ...blockedIds]));
    }

    let query = supabase
      .from('albums')
      .select(`
        id, title, description, cover_path, visibility, is_shared, priority,
        is_closed, closed_at, created_at, owner_id,
        owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (excludedUserIds.length > 0) {
      query = query.not('owner_id', 'in', `(${excludedUserIds.join(',')})`);
    }

    const { data, error } = await query.range(pageParam * LIMIT, (pageParam + 1) * LIMIT - 1);
    if (error) throw error;

    const albumIds = (data ?? []).map((a: any) => a.id);
    const progressMap = new Map<string, { total: number; completed: number }>();
    if (albumIds.length > 0) {
      const { data: prog } = await supabase
        .from('album_progress')
        .select('album_id, total_tasks, completed_tasks')
        .in('album_id', albumIds);
      (prog ?? []).forEach((p: any) => {
        progressMap.set(p.album_id, { total: p.total_tasks || 0, completed: p.completed_tasks || 0 });
      });
    }

    const excludedSet = new Set(excludedUserIds);
    const items = (data ?? [])
      .filter((a: any) => !excludedSet.has(a.owner_id))
      .map((a: any) => {
        const prog = progressMap.get(a.id) || { total: 0, completed: 0 };
        const ownerProfile = Array.isArray(a.owner) ? a.owner[0] : a.owner;
        return {
          _type: 'album' as const,
          id: a.id,
          title: a.title,
          description: a.description || null,
          cover_path: a.cover_path || null,
          visibility: a.visibility,
          is_shared: a.is_shared,
          priority: a.priority || 'medium',
          is_closed: Boolean(a.is_closed),
          created_at: a.created_at,
          total_tasks: prog.total,
          completed_tasks: prog.completed,
          owner: ownerProfile || null,
        };
      });

    return {
      items,
      nextCursor: (data ?? []).length === LIMIT ? pageParam + 1 : undefined,
    };
  },

  /**
   * Búsqueda integral en el feed: ideas (tareas), álbumes y personas.
   * Busca en títulos, descripciones, etiquetas (tags), categorías, ubicaciones y subtareas.
   */
  searchFeed: async ({
    query,
    scope = 'all',
    userId,
    limit = 30,
  }: {
    query: string;
    scope?: 'explore' | 'friends' | 'all';
    userId?: string;
    limit?: number;
  }) => {
    const clean = query.trim().replace(/[%_()]/g, '');
    if (clean.length < 2) {
      return { tasks: [], places: [], albums: [], users: [] };
    }

    // 1. Resolver usuarios bloqueados y amigos si aplica
    let blockedIds: string[] = [];
    let friendIds: string[] = [];
    let collabBucketIds: string[] = [];
    if (userId) {
      const [bIds, followsRes, collabIds] = await Promise.all([
        blockReportApi.getMutualBlockedUserIds(userId),
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('status', 'accepted'),
        getCollaboratingBucketIds(userId),
      ]);
      blockedIds = bIds;
      collabBucketIds = collabIds;
      friendIds = (followsRes.data ?? []).map((f: any) => f.following_id as string);
    }

    // 2. Buscar categorías coincidentes
    const { data: matchingCategories } = await supabase
      .from('categories')
      .select('id')
      .or(`name_es.ilike.%${clean}%,name_en.ilike.%${clean}%,slug.ilike.%${clean}%`);
    const categoryIds = (matchingCategories || []).map((c: any) => c.id);

    // 3. Buscar etiquetas coincidentes y relacionar con tareas y álbumes
    const { data: matchingTags } = await supabase
      .from('tags')
      .select('id')
      .ilike('name', `%${clean}%`);
    const tagIds = (matchingTags || []).map((t: any) => t.id);

    let taggedTaskIds: string[] = [];
    let taggedAlbumIds: string[] = [];
    if (tagIds.length > 0) {
      const [itRes, atRes] = await Promise.all([
        supabase.from('item_tags').select('item_id').in('tag_id', tagIds),
        supabase.from('album_tags').select('album_id').in('tag_id', tagIds),
      ]);
      taggedTaskIds = (itRes.data || []).map((r: any) => r.item_id);
      taggedAlbumIds = (atRes.data || []).map((r: any) => r.album_id);
    }

    // 4. Buscar subtareas coincidentes
    const { data: matchingSubtasks } = await supabase
      .from('item_subtasks')
      .select('bucket_id')
      .ilike('title', `%${clean}%`)
      .limit(50);
    const subtaskBucketIds = (matchingSubtasks || []).map((s: any) => s.bucket_id);

    const extraTaskIds = Array.from(new Set([...taggedTaskIds, ...subtaskBucketIds]));

    // 5. Query de tareas/ideas con búsqueda flexible de texto y sitios
    const cleanNoAccents = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const searchTerms = new Set<string>([clean]);
    if (cleanNoAccents && cleanNoAccents !== clean) {
      searchTerms.add(cleanNoAccents);
    }
    const words = clean.split(/\s+/).filter((w) => w.length >= 3);
    words.forEach((w) => {
      searchTerms.add(w);
      const wNoAcc = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (wNoAcc !== w) searchTerms.add(wNoAcc);
    });

    const taskOrParts: string[] = [];
    searchTerms.forEach((term) => {
      taskOrParts.push(`title.ilike.%${term}%`);
      taskOrParts.push(`description.ilike.%${term}%`);
      taskOrParts.push(`location_text.ilike.%${term}%`);
    });
    if (categoryIds.length > 0) {
      taskOrParts.push(`category_id.in.(${categoryIds.join(',')})`);
    }
    if (extraTaskIds.length > 0) {
      taskOrParts.push(`id.in.(${extraTaskIds.slice(0, 50).join(',')})`);
    }

    let taskQuery = supabase
      .from('buckets')
      .select(
        `
        *,
        actor:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
        user:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
        category:categories(id, slug, name_es, name_en),
        bucket_photos(id, thumb_path, storage_path, created_at),
        reactions(emoji, user_id),
        comments:comments(count),
        item_tags(tag:tags(id, name, color, emoji))
      `
      )
      .or(taskOrParts.join(','));

    // 6. Query de álbumes
    const albumOrParts: string[] = [
      `title.ilike.%${clean}%`,
      `description.ilike.%${clean}%`,
    ];
    if (taggedAlbumIds.length > 0) {
      albumOrParts.push(`id.in.(${taggedAlbumIds.slice(0, 50).join(',')})`);
    }

    let albumQuery = supabase
      .from('albums')
      .select(
        `
        id, title, description, cover_path, visibility, is_shared, priority,
        is_closed, closed_at, created_at, owner_id,
        owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)
      `
      )
      .or(albumOrParts.join(','));

    // 7. Query de usuarios
    let userQuery = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio')
      .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`);

    if (scope === 'friends') {
      const targetIds = friendIds.filter((id) => !blockedIds.includes(id) && id !== userId);
      if (targetIds.length === 0) {
        return { tasks: [], places: [], albums: [], users: [] };
      }
      taskQuery = taskQuery
        .in('user_id', targetIds)
        .in('visibility', ['public', 'followers']);
      albumQuery = albumQuery
        .in('owner_id', targetIds)
        .in('visibility', ['public', 'followers']);
      userQuery = userQuery.in('id', targetIds);
    } else if (scope === 'explore') {
      const excluded = Array.from(new Set([userId, ...friendIds, ...blockedIds].filter(Boolean))) as string[];
      taskQuery = taskQuery.eq('visibility', 'public');
      albumQuery = albumQuery.eq('visibility', 'public');
      if (excluded.length > 0) {
        taskQuery = taskQuery.not('user_id', 'in', `(${excluded.join(',')})`);
        albumQuery = albumQuery.not('owner_id', 'in', `(${excluded.join(',')})`);
        userQuery = userQuery.not('id', 'in', `(${excluded.join(',')})`);
      }
    } else {
      const excluded = Array.from(new Set([userId, ...blockedIds].filter(Boolean))) as string[];
      taskQuery = taskQuery.eq('visibility', 'public');
      albumQuery = albumQuery.eq('visibility', 'public');
      if (excluded.length > 0) {
        taskQuery = taskQuery.not('user_id', 'in', `(${excluded.join(',')})`);
        albumQuery = albumQuery.not('owner_id', 'in', `(${excluded.join(',')})`);
        userQuery = userQuery.not('id', 'in', `(${excluded.join(',')})`);
      }
    }

    // Excluir tareas en las que ya soy colaborador
    if (collabBucketIds.length > 0 && collabBucketIds.length <= MAX_SERVER_EXCLUDE_IDS) {
      taskQuery = taskQuery.not('id', 'in', `(${collabBucketIds.join(',')})`);
    }

    const [taskRes, albumRes, userRes] = await Promise.all([
      taskQuery.order('created_at', { ascending: false }).limit(limit),
      albumQuery.order('created_at', { ascending: false }).limit(limit),
      userQuery.limit(limit),
    ]);

    if (taskRes.error) console.warn('Search tasks error:', taskRes.error);
    if (albumRes.error) console.warn('Search albums error:', albumRes.error);
    if (userRes.error) console.warn('Search users error:', userRes.error);

    // Mapear tareas para FeedCard
    const collabSet = new Set(collabBucketIds);
    const mappedTasks = (taskRes.data ?? [])
      .filter((b: any) => !collabSet.has(b.id))
      .map((b: any) => ({
        id: b.id,
        actor_id: b.user_id,
        bucket_id: b.id,
        actor: b.actor || b.user,
        user: b.user || b.actor,
        bucket: b,
        type: b.status === 'completed' ? 'completed' : 'new_bucket',
        created_at: b.completed_at || b.created_at,
        _type: 'task' as const,
      }));

    // Mapear álbumes
    const foundAlbumIds = (albumRes.data ?? []).map((a: any) => a.id);
    const progressMap = new Map<string, { total: number; completed: number }>();
    if (foundAlbumIds.length > 0) {
      const { data: prog } = await supabase
        .from('album_progress')
        .select('album_id, total_tasks, completed_tasks')
        .in('album_id', foundAlbumIds);
      (prog ?? []).forEach((p: any) => {
        progressMap.set(p.album_id, { total: p.total_tasks || 0, completed: p.completed_tasks || 0 });
      });
    }

    const mappedAlbums = (albumRes.data ?? []).map((a: any) => {
      const prog = progressMap.get(a.id) || { total: 0, completed: 0 };
      const ownerProfile = Array.isArray(a.owner) ? a.owner[0] : a.owner;
      return {
        _type: 'album' as const,
        id: a.id,
        title: a.title,
        description: a.description || null,
        cover_path: a.cover_path || null,
        visibility: a.visibility,
        is_shared: a.is_shared,
        priority: a.priority || 'medium',
        is_closed: Boolean(a.is_closed),
        created_at: a.created_at,
        total_tasks: prog.total,
        completed_tasks: prog.completed,
        owner: ownerProfile || null,
      };
    });

    // Extraer y agrupar sitios únicos que coinciden con la búsqueda
    const placeMap = new Map<string, {
      location_text: string;
      lat?: number;
      lng?: number;
      tasks: any[];
    }>();

    mappedTasks.forEach((item: any) => {
      const b = item.bucket || item;
      const loc = (b.location_text || '').trim();
      if (!loc) return;
      const norm = loc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const existing = placeMap.get(norm);
      if (existing) {
        existing.tasks.push(item);
      } else {
        placeMap.set(norm, {
          location_text: loc,
          lat: typeof b.location_lat === 'number' ? b.location_lat : parseFloat(b.location_lat),
          lng: typeof b.location_lng === 'number' ? b.location_lng : parseFloat(b.location_lng),
          tasks: [item],
        });
      }
    });

    const places = Array.from(placeMap.values()).map((p) => ({
      location_text: p.location_text,
      lat: isNaN(p.lat as number) ? undefined : p.lat,
      lng: isNaN(p.lng as number) ? undefined : p.lng,
      taskCount: p.tasks.length,
      tasks: p.tasks,
    }));

    // Si no hay sitios con momentos publicados, buscar en Google Places para sugerir el lugar exacto y poder verlo en el mapa
    if (GOOGLE_PLACES_API_KEY && places.length === 0 && clean.length >= 3) {
      try {
        const pRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          },
          body: JSON.stringify({
            input: clean,
            languageCode: 'es',
          }),
        });
        const pData = await pRes.json();
        const suggestions = (pData?.suggestions || []).slice(0, 3);
        for (const s of suggestions) {
          const pred = s.placePrediction;
          const fullText = pred?.text?.text || pred?.structuredFormat?.mainText?.text;
          const rawId = pred?.placeId || (pred?.place?.startsWith('places/') ? pred.place.replace('places/', '') : pred?.place);
          if (rawId && fullText) {
            let lat: number | undefined;
            let lng: number | undefined;
            try {
              const dRes = await fetch(`https://places.googleapis.com/v1/places/${rawId}`, {
                headers: {
                  'Content-Type': 'application/json',
                  'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
                  'X-Goog-FieldMask': 'location',
                },
              });
              const dData = await dRes.json();
              if (dData?.location) {
                lat = Number(dData.location.latitude);
                lng = Number(dData.location.longitude);
              }
            } catch {}

            places.push({
              location_text: fullText,
              lat,
              lng,
              taskCount: 0,
              tasks: [],
            });
          }
        }
      } catch (err) {
        console.warn('Error fetching Google Places in feed search:', err);
      }
    }

    return {
      tasks: mappedTasks,
      places,
      albums: mappedAlbums,
      users: userRes.data ?? [],
    };
  },
};

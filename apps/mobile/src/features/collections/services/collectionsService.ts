import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../services/supabase';
import { CollectionItem } from '../types';
import { DEFAULT_COLLECTIONS } from '../data/defaultCollections';
import { getAlbumTagsStorageKey } from '../../../hooks/useAlbumTags';

const STORAGE_CUSTOM_COLLECTIONS = '@bucketlist_custom_collections';
const STORAGE_COLLECTION_CLONES = '@bucketlist_collection_clones';
const STORAGE_COLLECTION_LIKES = '@bucketlist_collection_likes';

export const collectionsService = {
  /**
   * Obtiene la lista completa de colecciones con métricas reales de likes y clones.
   * Diseñado para combinar:
   * 1. Colecciones por defecto precargadas
   * 2. Colecciones en Supabase si la tabla existe o álbumes destacados
   * 3. Colecciones creadas/ofrecidas por usuarios
   * 4. Métricas reales de clones y likes del usuario
   */
  getCollections: async (userId?: string): Promise<CollectionItem[]> => {
    let customList: CollectionItem[] = [];
    try {
      const raw = await AsyncStorage.getItem(STORAGE_CUSTOM_COLLECTIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) customList = parsed;
      }
    } catch {}

    // 1. Cargar clones reales registrados en la app
    let realClonesMap: Record<string, number> = {};
    try {
      const rawClones = await AsyncStorage.getItem(STORAGE_COLLECTION_CLONES);
      if (rawClones) realClonesMap = JSON.parse(rawClones);
    } catch {}

    // 2. Cargar likes reales y qué colecciones ha marcado el usuario actual
    let realLikesMap: Record<string, number> = {};
    try {
      const rawLikes = await AsyncStorage.getItem(STORAGE_COLLECTION_LIKES);
      if (rawLikes) realLikesMap = JSON.parse(rawLikes);
    } catch {}

    const userLikesKey = userId ? `@bucketlist_liked_collections_${userId}` : '@bucketlist_liked_collections_anon';
    let userLikedSet = new Set<string>();
    try {
      const rawUserLikes = await AsyncStorage.getItem(userLikesKey);
      if (rawUserLikes) {
        const arr = JSON.parse(rawUserLikes);
        if (Array.isArray(arr)) userLikedSet = new Set(arr);
      }
    } catch {}

    // Intentar consultar Supabase en caso de que exista tabla 'collections' remota
    let remoteList: CollectionItem[] = [];
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        remoteList = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          category: item.category || 'general',
          badge: item.badge || '✨ Colección',
          emoji: item.emoji || '📁',
          gradientColors: item.gradient_colors || ['#1E1E1E', '#333333'],
          cover_path: item.cover_path || JSON.stringify({ type: 'gradient', colors: ['#1E1E1E', '#333333'], diagonal: true }),
          author: {
            name: item.author_name || 'Comunidad',
            isOfficial: Boolean(item.is_official),
            avatar_url: item.author_avatar || undefined,
            user_id: item.user_id,
          },
          clonesCount: item.clones_count || 0,
          likesCount: item.likes_count || 0,
          isLiked: false,
          tags: item.tags || [],
          tasks: Array.isArray(item.tasks) ? item.tasks : [],
        }));
      }
    } catch {
      // Ignorado si la tabla collections remota no existe aún
    }

    const map = new Map<string, CollectionItem>();
    DEFAULT_COLLECTIONS.forEach((c) => map.set(c.id, { ...c }));
    remoteList.forEach((c) => map.set(c.id, { ...c }));
    customList.forEach((c) => map.set(c.id, { ...c }));

    // Aplicar métricas reales (clones reales + likes reales) a todas las colecciones
    const result = Array.from(map.values()).map((col) => {
      const realClones = realClonesMap[col.id] ?? (col.clonesCount ?? 0);
      const realLikes = realLikesMap[col.id] ?? (col.likesCount ?? 0);
      return {
        ...col,
        clonesCount: realClones,
        likesCount: realLikes,
        isLiked: userLikedSet.has(col.id),
      };
    });

    return result;
  },

  /**
   * Permite dar / quitar like a una colección
   */
  toggleLikeCollection: async (
    collectionId: string,
    userId?: string
  ): Promise<{ isLiked: boolean; likesCount: number }> => {
    const userLikesKey = userId ? `@bucketlist_liked_collections_${userId}` : '@bucketlist_liked_collections_anon';

    let likedIds: string[] = [];
    try {
      const raw = await AsyncStorage.getItem(userLikesKey);
      if (raw) likedIds = JSON.parse(raw);
    } catch {}

    const isCurrentlyLiked = likedIds.includes(collectionId);
    let nextLikedIds: string[];
    if (isCurrentlyLiked) {
      nextLikedIds = likedIds.filter((id) => id !== collectionId);
    } else {
      nextLikedIds = [...likedIds, collectionId];
    }
    await AsyncStorage.setItem(userLikesKey, JSON.stringify(nextLikedIds));

    // Actualizar conteo global de likes
    let likesMap: Record<string, number> = {};
    try {
      const rawLikes = await AsyncStorage.getItem(STORAGE_COLLECTION_LIKES);
      if (rawLikes) likesMap = JSON.parse(rawLikes);
    } catch {}

    const currentLikes = likesMap[collectionId] || 0;
    const nextLikes = isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    likesMap[collectionId] = nextLikes;
    await AsyncStorage.setItem(STORAGE_COLLECTION_LIKES, JSON.stringify(likesMap));

    return { isLiked: !isCurrentlyLiked, likesCount: nextLikes };
  },

  /**
   * Clona una colección dentro de la cuenta del usuario actual.
   * Crea:
   * 1. Un nuevo álbum con el título, descripción y portada de la colección.
   * 2. Todas las tareas asociadas a dicho álbum.
   * 3. Los registros de unión en `album_items`.
   * 4. Etiquetas asociadas al álbum.
   */
  cloneCollection: async (userId: string, collection: CollectionItem): Promise<{ albumId: string; tasksCount: number }> => {
    if (!userId) throw new Error('Usuario no autenticado');

    // 1. Crear el nuevo álbum para el usuario
    const { data: newAlbum, error: albumError } = await supabase
      .from('albums')
      .insert({
        owner_id: userId,
        title: collection.title,
        description: collection.description || '',
        cover_path: collection.cover_path || null,
        visibility: 'private',
        is_shared: false,
        priority: 'medium',
      })
      .select('id, title')
      .single();

    if (albumError || !newAlbum) {
      throw new Error(albumError?.message || 'Error al crear el álbum');
    }

    // 2. Crear las tareas en `buckets`
    let createdTasksCount = 0;
    if (collection.tasks && collection.tasks.length > 0) {
      const taskRows = collection.tasks.map((task) => ({
        user_id: userId,
        title: task.title,
        description: task.description || null,
        priority: task.priority || 'medium',
        visibility: 'private',
        status: 'pending',
      }));

      const { data: insertedTasks, error: tasksError } = await supabase
        .from('buckets')
        .insert(taskRows)
        .select('id');

      if (tasksError) {
        console.error('Error insertando tareas al clonar colección:', tasksError);
      } else if (insertedTasks && insertedTasks.length > 0) {
        createdTasksCount = insertedTasks.length;

        // 3. Vincular tareas al álbum en `album_items`
        const albumItemRows = insertedTasks.map((t, index) => ({
          album_id: newAlbum.id,
          bucket_id: t.id,
          position: index,
        }));

        const { error: itemsError } = await supabase
          .from('album_items')
          .insert(albumItemRows);

        if (itemsError) {
          console.error('Error vinculando tareas al álbum:', itemsError);
        }
      }
    }

    // 4. Copiar tags si existen
    if (collection.tags && collection.tags.length > 0) {
      try {
        const storageKey = getAlbumTagsStorageKey(newAlbum.id);
        const tagItems = collection.tags.map((name, i) => ({
          id: `tag-${i}-${Date.now()}`,
          name,
          color: '#D4AF37',
          emoji: null,
        }));
        await AsyncStorage.setItem(storageKey, JSON.stringify(tagItems));
      } catch {}
    }

    // 5. Incrementar contador de clonados real
    try {
      const rawClones = await AsyncStorage.getItem(STORAGE_COLLECTION_CLONES);
      const clonesMap: Record<string, number> = rawClones ? JSON.parse(rawClones) : {};
      clonesMap[collection.id] = (clonesMap[collection.id] || 0) + 1;
      await AsyncStorage.setItem(STORAGE_COLLECTION_CLONES, JSON.stringify(clonesMap));
    } catch {}

    return { albumId: newAlbum.id, tasksCount: createdTasksCount };
  },

  /**
   * Permite que en el futuro un usuario ofrezca/convierta uno de sus álbumes en colección
   */
  publishUserAlbumAsCollection: async (album: any, tasks: any[], author: { name: string; avatarUrl?: string }): Promise<CollectionItem> => {
    const newCollection: CollectionItem = {
      id: `user-coll-${album.id}-${Date.now()}`,
      title: album.title,
      description: album.description || '',
      category: 'community',
      badge: '🌟 Comunidad',
      emoji: '📁',
      gradientColors: ['#1E1E1E', '#3A3A3A'],
      cover_path: album.cover_path || JSON.stringify({ type: 'gradient', colors: ['#1E1E1E', '#3A3A3A'], diagonal: true }),
      author: {
        name: author.name,
        avatar_url: author.avatarUrl,
        user_id: album.owner_id,
        isOfficial: false,
      },
      tasks: (tasks || []).map((t) => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
      })),
      clonesCount: 1,
    };

    try {
      const raw = await AsyncStorage.getItem(STORAGE_CUSTOM_COLLECTIONS);
      const list: CollectionItem[] = raw ? JSON.parse(raw) : [];
      list.unshift(newCollection);
      await AsyncStorage.setItem(STORAGE_CUSTOM_COLLECTIONS, JSON.stringify(list));
    } catch {}

    return newCollection;
  },
};

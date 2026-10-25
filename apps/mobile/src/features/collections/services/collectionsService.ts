import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../services/supabase';
import { CollectionItem } from '../types';
import { DEFAULT_COLLECTIONS, getDefaultCollections } from '../data/defaultCollections';
import { getAlbumTagsStorageKey } from '../../../hooks/useAlbumTags';

const STORAGE_CUSTOM_COLLECTIONS = '@bucketlist_custom_collections';
const STORAGE_COLLECTION_CLONES = '@bucketlist_collection_clones';
const STORAGE_COLLECTION_LIKES = '@bucketlist_collection_likes';
const STORAGE_DELETED_COLLECTIONS = '@bucketlist_deleted_collections';

export const collectionsService = {
  /**
   * Obtiene la lista completa de colecciones con métricas reales de likes y clones.
   * Diseñado para combinar:
   * 1. Colecciones por defecto precargadas (según idioma)
   * 2. Colecciones en Supabase si la tabla existe o álbumes destacados
   * 3. Colecciones creadas/ofrecidas por usuarios
   * 4. Métricas reales de clones y likes del usuario
   */
  getCollections: async (userId?: string, lang: string = 'es'): Promise<CollectionItem[]> => {
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

    let deletedLocalSet = new Set<string>();
    try {
      const rawDeleted = await AsyncStorage.getItem(STORAGE_DELETED_COLLECTIONS);
      if (rawDeleted) {
        const arr = JSON.parse(rawDeleted);
        if (Array.isArray(arr)) deletedLocalSet = new Set(arr);
      }
    } catch {}

    // Intentar consultar Supabase en caso de que exista tabla 'collections' remota
    let remoteList: CollectionItem[] = [];
    let deletedRemoteSet = new Set<string>();
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        data.forEach((item: any) => {
          if (item.is_deleted) {
            deletedRemoteSet.add(item.id);
            return;
          }
          remoteList.push({
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
          });
        });
      }
    } catch {
      // Ignorado si la tabla collections remota no existe aún
    }

    const map = new Map<string, CollectionItem>();
    getDefaultCollections(lang).forEach((c) => {
      if (!deletedRemoteSet.has(c.id) && !deletedLocalSet.has(c.id)) {
        map.set(c.id, { ...c });
      }
    });
    remoteList.forEach((c) => {
      if (!deletedRemoteSet.has(c.id) && !deletedLocalSet.has(c.id)) {
        map.set(c.id, { ...c });
      }
    });
    customList.forEach((c) => {
      if (!deletedRemoteSet.has(c.id) && !deletedLocalSet.has(c.id)) {
        map.set(c.id, { ...c });
      }
    });

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

  /**
   * Crea una nueva colección oficial (exclusivo para administradores).
   * Se guarda directamente en la base de datos de Supabase para que sea visible por todos.
   */
  createCollection: async (params: {
    title: string;
    description?: string;
    category?: string;
    badge?: string;
    emoji?: string;
    gradientColors?: [string, string, ...string[]];
    cover_path?: string;
    authorName?: string;
    authorAvatar?: string;
    tags?: string[];
    tasks?: { title: string; description?: string; priority?: 'low' | 'medium' | 'high' }[];
    isOfficial?: boolean;
    userId?: string;
  }): Promise<CollectionItem> => {
    const { data: userAuth } = await supabase.auth.getUser();
    const currentUserId = params.userId || userAuth.user?.id;

    const row = {
      title: params.title.trim(),
      description: params.description?.trim() || '',
      category: params.category || 'general',
      badge: params.badge || '✨ Colección',
      emoji: params.emoji || '📁',
      gradient_colors: params.gradientColors || ['#1E1E1E', '#333333'],
      cover_path: params.cover_path || JSON.stringify({ type: 'gradient', colors: params.gradientColors || ['#1E1E1E', '#333333'], diagonal: true }),
      author_name: params.authorName || 'The Bucket List',
      author_avatar: params.authorAvatar || null,
      user_id: currentUserId || null,
      is_official: params.isOfficial ?? true,
      tags: params.tags || [],
      tasks: params.tasks || [],
    };

    const { data, error } = await (supabase.from('collections') as any)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating collection:', error);
      throw new Error(error.message || 'Error al crear la colección');
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      category: data.category || 'general',
      badge: data.badge || '✨ Colección',
      emoji: data.emoji || '📁',
      gradientColors: (data.gradient_colors as [string, string, ...string[]]) || ['#1E1E1E', '#333333'],
      cover_path: data.cover_path || '',
      author: {
        name: data.author_name || 'The Bucket List',
        isOfficial: Boolean(data.is_official),
        avatar_url: data.author_avatar || undefined,
        user_id: data.user_id || undefined,
      },
      clonesCount: data.clones_count || 0,
      likesCount: data.likes_count || 0,
      isLiked: false,
      tags: (data.tags as string[]) || [],
      tasks: (data.tasks as any[]) || [],
    };
  },

  /**
   * Promociona un álbum de usuario existente a colección comunitaria (Admin)
   */
  promoteAlbumToCollection: async (params: {
    albumId: string;
    category?: string;
    badge?: string;
    emoji?: string;
  }): Promise<string> => {
    const { data, error } = await (supabase.rpc as any)('promote_album_to_collection', {
      p_album_id: params.albumId,
      p_category: params.category || 'general',
      p_badge: params.badge || '⭐ Destacada',
      p_emoji: params.emoji || '🌟',
    });

    if (error) {
      console.error('Error promoting album to collection:', error);
      throw new Error(error.message || 'Error al promocionar el álbum');
    }

    return data as string;
  },

  /**
   * Actualiza una colección existente (Admin)
   */
  updateCollection: async (params: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    badge?: string;
    emoji?: string;
    gradientColors?: [string, string, ...string[]];
    cover_path?: string;
    tags?: string[];
    tasks?: { title: string; description?: string; priority?: 'low' | 'medium' | 'high' }[];
  }): Promise<CollectionItem> => {
    const row = {
      id: params.id,
      title: params.title.trim(),
      description: params.description?.trim() || '',
      category: params.category || 'general',
      badge: params.badge || '✨ Colección',
      emoji: params.emoji || '📁',
      gradient_colors: params.gradientColors || ['#1E1E1E', '#333333'],
      cover_path: params.cover_path || JSON.stringify({ type: 'gradient', colors: params.gradientColors || ['#1E1E1E', '#333333'], diagonal: true }),
      tags: params.tags || [],
      tasks: params.tasks || [],
      is_deleted: false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await (supabase.from('collections') as any)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating collection in Supabase:', error);
      try {
        const raw = await AsyncStorage.getItem(STORAGE_CUSTOM_COLLECTIONS);
        if (raw) {
          const list: CollectionItem[] = JSON.parse(raw);
          const idx = list.findIndex((c) => c.id === params.id);
          const existing = list[idx];
          if (idx !== -1 && existing) {
            const updatedItem: CollectionItem = {
              ...existing,
              id: params.id,
              title: row.title,
              description: row.description,
              category: row.category,
              badge: row.badge,
              emoji: row.emoji,
              gradientColors: row.gradient_colors,
              cover_path: row.cover_path,
              tags: row.tags,
              tasks: row.tasks,
            };
            list[idx] = updatedItem;
            await AsyncStorage.setItem(STORAGE_CUSTOM_COLLECTIONS, JSON.stringify(list));
            return updatedItem;
          }
        }
      } catch {}
      throw new Error(error.message || 'Error al actualizar la colección');
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_CUSTOM_COLLECTIONS);
      if (raw) {
        const list: CollectionItem[] = JSON.parse(raw);
        const idx = list.findIndex((c) => c.id === params.id);
        const existing = list[idx];
        if (idx !== -1 && existing) {
          list[idx] = {
            ...existing,
            title: data.title,
            description: data.description,
            category: data.category,
            badge: data.badge,
            emoji: data.emoji,
            gradientColors: data.gradient_colors,
            cover_path: data.cover_path,
            tasks: data.tasks,
          };
          await AsyncStorage.setItem(STORAGE_CUSTOM_COLLECTIONS, JSON.stringify(list));
        }
      }
    } catch {}

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      category: data.category || 'general',
      badge: data.badge || '✨ Colección',
      emoji: data.emoji || '📁',
      gradientColors: (data.gradient_colors as [string, string, ...string[]]) || ['#1E1E1E', '#333333'],
      cover_path: data.cover_path || '',
      author: {
        name: data.author_name || 'The Bucket List',
        isOfficial: Boolean(data.is_official),
        avatar_url: data.author_avatar || undefined,
        user_id: data.user_id || undefined,
      },
      clonesCount: data.clones_count || 0,
      likesCount: data.likes_count || 0,
      isLiked: false,
      tags: (data.tags as string[]) || [],
      tasks: (data.tasks as any[]) || [],
    };
  },

  /**
   * Elimina una colección (Admin)
   */
  deleteCollection: async (collectionId: string): Promise<void> => {
    // 1. Marcar como eliminada en Supabase mediante upsert (funciona tanto para colecciones por defecto como creadas)
    try {
      await (supabase.from('collections') as any).upsert(
        {
          id: collectionId,
          title: 'Deleted',
          is_deleted: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('Error marking collection as deleted in Supabase:', e);
    }

    // 2. Guardar en almacenamiento local de eliminadas
    try {
      const raw = await AsyncStorage.getItem(STORAGE_DELETED_COLLECTIONS);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(collectionId)) {
        list.push(collectionId);
        await AsyncStorage.setItem(STORAGE_DELETED_COLLECTIONS, JSON.stringify(list));
      }
    } catch {}

    // 3. Eliminar de colecciones locales en caso de que estuviera ahí
    try {
      const raw = await AsyncStorage.getItem(STORAGE_CUSTOM_COLLECTIONS);
      if (raw) {
        const list: CollectionItem[] = JSON.parse(raw);
        const filtered = list.filter((c) => c.id !== collectionId);
        await AsyncStorage.setItem(STORAGE_CUSTOM_COLLECTIONS, JSON.stringify(filtered));
      }
    } catch {}
  },
};

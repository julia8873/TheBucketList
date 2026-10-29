import { Alert } from '@bucketlist/ui';
import { useState, useEffect, useMemo } from 'react';

import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@bucketlist/ui';
import { useCreateAlbum, useUpdateAlbum } from '../../../hooks/useAlbums';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../stores/auth.store';
import { uploadAlbumCover, isLocalUri } from '../../../services/api/albumCover';
import type { CollaboratorItem } from '../../../components/CollaboratorPickerSheet';
import type { TagItem } from '../../../components/TagAssignSheet';
import type { AlbumPickableTask } from '../../../components/AlbumTaskPickerSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncAlbumTags, getAlbumTagsStorageKey } from '../../../hooks/useAlbumTags';
import { useTranslation } from '@bucketlist/shared';
import { COVERS, SOLID_COVERS, type Cover, type AlbumPriority, type AlbumVisibility } from '../types';

export function useAlbumFormData(id?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isEditing = Boolean(id && id !== 'unassigned');

  const { user, session } = useAuthStore();
  const currentUserId = user?.id || session?.user?.id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<AlbumPriority>('medium');
  const [selectedCover, setSelectedCover] = useState<Cover>({ ...COVERS[1]!, aspectRatio: '1:1' });
  const [visibility, setVisibility] = useState<AlbumVisibility>('private');
  const [isShared, setIsShared] = useState(false);
  const [albumOwner, setAlbumOwner] = useState<{ id: string; username?: string; display_name?: string | null; avatar_url?: string | null } | null>(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState<CollaboratorItem[]>([]);
  const [initialCollaboratorIds, setInitialCollaboratorIds] = useState<string[]>([]);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
  const [initialTagIds, setInitialTagIds] = useState<string[]>([]);
  const [tagsToRemoveFromTasks, setTagsToRemoveFromTasks] = useState<Set<string>>(new Set());
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<AlbumPickableTask[]>([]);
  const [existingTaskIds, setExistingTaskIds] = useState<string[]>([]);
  const [existingMaxPosition, setExistingMaxPosition] = useState(-1);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditing);

  const createAlbum = useCreateAlbum();
  const updateAlbum = useUpdateAlbum();
  const syncAlbumTags = useSyncAlbumTags();

  const isSelf = (targetId?: string | null) => {
    if (!targetId || !currentUserId) return false;
    return String(targetId).toLowerCase() === String(currentUserId).toLowerCase();
  };

  const isOwner = !isEditing || !albumOwner?.id || isSelf(albumOwner.id);
  const readOnlyIds = useMemo(() => {
    return albumOwner?.id && !isSelf(albumOwner.id) ? [albumOwner.id] : [];
  }, [albumOwner?.id, currentUserId]);

  useEffect(() => {
    if (!isEditing || !id) return;

    let isMounted = true;
    async function loadAlbumData() {
      try {
        const { data: album, error } = await supabase
          .from('albums')
          .select('*, owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)')
          .eq('id', id)
          .single();

        if (error || !album) {
          Alert.alert(t('common.error'), t('albums.error_load'));
          return;
        }

        if (!isMounted) return;
        setName(album.title || '');
        setDescription(album.description || '');
        setPriority((album.priority) || 'medium');
        setVisibility((album.visibility) || 'private');
        setIsShared(Boolean(album.is_shared));

        const ownerProf = Array.isArray(album.owner) ? album.owner[0] : album.owner;
        let ownerObj = ownerProf;
        if (!ownerObj && album.owner_id) {
          const { data: p } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', album.owner_id)
            .single();
          ownerObj = p || { id: album.owner_id };
        }
        setAlbumOwner(ownerObj);

        if (album.cover_path) {
          try {
            const parsed = JSON.parse(album.cover_path);
            const foundCover =
              COVERS.find((c) => c.id === parsed.id) ||
              SOLID_COVERS.find((c) => c.id === parsed.id) ||
              parsed;
            setSelectedCover({
              ...foundCover,
              aspectRatio: parsed.aspectRatio || foundCover.aspectRatio || '1:1',
              uri: parsed.uri || foundCover.uri,
            });
          } catch {
            // Ignored
          }
        }

        // Load existing members
        const { data: members } = await supabase
          .from('album_members')
          .select('user_id, status, profiles:user_id(id, username, display_name, avatar_url)')
          .eq('album_id', id);

        if (members && isMounted) {
          const collabs: CollaboratorItem[] = members.map((m: any) => {
            const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            return {
              id: m.user_id,
              username: p?.username || '',
              display_name: p?.display_name || null,
              avatar_url: p?.avatar_url || null,
              status: m.status,
            };
          });

          const isUserOwner = !album.owner_id || isSelf(album.owner_id);
          const filteredCollabs = collabs.filter((c) => !isSelf(c.id) && c.id !== album.owner_id);
          const ownerEntry: CollaboratorItem | null = (!isUserOwner && ownerObj) ? {
            id: ownerObj.id,
            username: ownerObj.username || '',
            display_name: ownerObj.display_name || null,
            avatar_url: ownerObj.avatar_url || null,
            status: 'accepted',
          } : null;

          const initialSelected = [
            ...(ownerEntry ? [ownerEntry] : []),
            ...filteredCollabs,
          ];
          setSelectedCollaborators(initialSelected);
          setInitialCollaboratorIds(collabs.map((c) => c.id));
        }

        // Tareas que ya están en el álbum (no se vuelven a ofrecer en el selector)
        try {
          const { data: items } = await supabase
            .from('album_items')
            .select('bucket_id, position')
            .eq('album_id', id);
          if (items && isMounted) {
            setExistingTaskIds(items.map((i: any) => i.bucket_id));
            setExistingMaxPosition(items.reduce((m: number, i: any) => Math.max(m, i.position ?? 0), -1));
          }
        } catch {
          // Ignorado
        }

        // Load existing album tags
        try {
          const { data: albumTagsData } = await supabase
            .from('album_tags')
            .select('tag_id, tag:tags(*)')
            .eq('album_id', id);

          let initialTags: TagItem[] = [];
          if (albumTagsData && albumTagsData.length > 0) {
            initialTags = albumTagsData
              .map((r: any) => r.tag)
              .filter(Boolean)
              .map((t: any) => ({
                id: t.id,
                name: t.name,
                color: t.color,
                emoji: t.emoji ?? null,
              }));
          } else if (album.cover_path) {
            try {
              const parsed = JSON.parse(album.cover_path);
              if (Array.isArray(parsed.tag_ids) && parsed.tag_ids.length > 0) {
                const { data: tagsData } = await supabase
                  .from('tags')
                  .select('*')
                  .in('id', parsed.tag_ids);
                initialTags = (tagsData || []).map((t: any) => ({
                  id: t.id,
                  name: t.name,
                  color: t.color,
                  emoji: t.emoji ?? null,
                }));
              }
            } catch {}
          }

          // Fallback a almacenamiento local AsyncStorage
          if (initialTags.length === 0 && id) {
            try {
              const raw = await AsyncStorage.getItem(getAlbumTagsStorageKey(id));
              if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  initialTags = parsed;
                }
              }
            } catch {}
          }

          if (isMounted) {
            setSelectedTags(initialTags);
            setInitialTagIds(initialTags.map((t) => t.id));
          }
        } catch {
          // Ignorado
        }
      } catch (err) {
        console.error('Error loading album for edit:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    void loadAlbumData();

    return () => {
      isMounted = false;
    };
  }, [id, isEditing]);

  const handleTagPickerChange = (newTags: TagItem[]) => {
    if (isEditing && id) {
      const removed = selectedTags.filter((tg) => !newTags.some((nt) => nt.id === tg.id));
      if (removed.length > 0) {
        Alert.alert(
          t('album_form.remove_tags_title'),
          t(removed.length === 1 ? 'album_form.remove_tags_msg_single' : 'album_form.remove_tags_msg_plural', {
            tags: removed.map((tg) => `«${tg.name}»`).join(', '),
          }),
          [
            {
              text: t('album_form.only_from_album'),
              onPress: () => setSelectedTags(newTags),
            },
            {
              text: t('album_form.remove_from_all_tasks'),
              onPress: () => {
                setSelectedTags(newTags);
                setTagsToRemoveFromTasks((prev) => {
                  const updated = new Set(prev);
                  removed.forEach((tg) => updated.add(tg.id));
                  return updated;
                });
              },
            },
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
          ]
        );
        return;
      }
    }
    setSelectedTags(newTags);
  };

  const handleRemoveTag = (tag: TagItem) => {
    if (isEditing && id) {
      Alert.alert(
        t('album_form.remove_tag_title'),
        t('album_form.remove_tag_msg', { name: tag.name }),
        [
          {
            text: t('album_form.only_from_album'),
            onPress: () => setSelectedTags((prev) => prev.filter((tg) => tg.id !== tag.id)),
          },
          {
            text: t('album_form.remove_from_all_tasks'),
            onPress: () => {
              setSelectedTags((prev) => prev.filter((tg) => tg.id !== tag.id));
              setTagsToRemoveFromTasks((prev) => {
                const updated = new Set(prev);
                updated.add(tag.id);
                return updated;
              });
            },
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
        ]
      );
      return;
    }
    setSelectedTags((prev) => prev.filter((tg) => tg.id !== tag.id));
  };

  const toggleTask = (task: AlbumPickableTask) => {
    setSelectedTasks((prev) =>
      prev.some((x) => x.id === task.id) ? prev.filter((x) => x.id !== task.id) : [...prev, task],
    );
  };

  const removeTask = (taskId: string) => {
    setSelectedTasks((prev) => prev.filter((x) => x.id !== taskId));
  };

  /** Enlaza las tareas elegidas con el álbum (tabla album_items). No interrumpe el guardado si falla. */
  const addSelectedTasksToAlbum = async (albumId: string) => {
    if (selectedTasks.length === 0) return;
    try {
      const rows = selectedTasks.map((task, idx) => ({
        album_id: albumId,
        bucket_id: task.id,
        position: existingMaxPosition + 1 + idx,
      }));
      const { error } = await supabase
        .from('album_items')
        .upsert(rows, { onConflict: 'album_id,bucket_id', ignoreDuplicates: true });
      if (error) throw error;
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      void queryClient.invalidateQueries({ queryKey: ['album'] });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    } catch (err) {
      console.error('Error adding tasks to album:', err);
      toast.error(t('album_form.error_add_tasks'));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      let coverToSave: any = selectedCover;
      const isOurStorage = !!selectedCover.uri && (
        selectedCover.uri.includes('/storage/v1/object/public/photos/') ||
        (selectedCover.uri.startsWith('album-covers/') && !selectedCover.uri.includes('://'))
      );
      if (selectedCover.type === 'image' && selectedCover.uri && !isOurStorage) {
        if (!user?.id) throw new Error(t('album_form.error_login_cover'));
        let publicUrl: string;
        try {
          publicUrl = await uploadAlbumCover(user.id, selectedCover.uri);
        } catch (e: any) {
          console.error('Error uploading album cover:', e);
          throw new Error(e?.message || t('album_form.error_cover_upload'));
        }
        coverToSave = { ...selectedCover, uri: publicUrl };
        setSelectedCover(coverToSave);
      }
      if (selectedTags.length > 0) {
        coverToSave = {
          ...coverToSave,
          tag_ids: selectedTags.map((t) => t.id),
        };
      }
      const coverJson = JSON.stringify(coverToSave);

      if (isEditing && id) {
        await updateAlbum.mutateAsync({
          id,
          data: {
            title: name.trim(),
            description: description.trim(),
            priority,
            visibility,
            cover_path: coverJson,
            is_shared: isShared,
          },
        });

        // Sincronizar etiquetas con las tareas del álbum
        const currentTagIds = selectedTags.map((t) => t.id);
        const removedTagIds = initialTagIds.filter((tid) => !currentTagIds.includes(tid));
        const tagsToDeleteFromTasks = removedTagIds.filter((tid) => tagsToRemoveFromTasks.has(tid));

        await syncAlbumTags.mutateAsync({
          albumId: id,
          selectedTagIds: currentTagIds,
          tags: selectedTags,
          removedTagIds: tagsToDeleteFromTasks,
          removeTagsFromTasks: tagsToDeleteFromTasks.length > 0,
        });

        // Sync members
        if (isShared) {
          const currentSet = new Set(initialCollaboratorIds);
          const newSet = new Set(selectedCollaborators.map((c) => c.id));

          const toAdd = selectedCollaborators.filter(
            (c) => !currentSet.has(c.id) && c.id !== albumOwner?.id && c.id !== user?.id
          );
          const toRemove = initialCollaboratorIds.filter(
            (uid) => !newSet.has(uid) && uid !== albumOwner?.id && uid !== user?.id
          );

          if (toAdd.length > 0) {
            await supabase.from('album_members').insert(
              toAdd.map((c) => ({
                album_id: id,
                user_id: c.id,
                role: 'member',
                status: 'pending',
              }))
            );
          }

          if (toRemove.length > 0) {
            await supabase
              .from('album_members')
              .delete()
              .eq('album_id', id)
              .in('user_id', toRemove);
          }
        } else if (isOwner) {
          await supabase.from('album_members').delete().eq('album_id', id);
        }

        await addSelectedTasksToAlbum(id);

        router.back();
      } else {
        const newAlbum = await createAlbum.mutateAsync({
          title: name.trim(),
          description: description.trim(),
          priority,
          visibility,
          cover_path: coverJson,
          is_shared: isShared,
        });

        if (newAlbum?.id && selectedTags.length > 0) {
          await syncAlbumTags.mutateAsync({
            albumId: newAlbum.id,
            selectedTagIds: selectedTags.map((t) => t.id),
            tags: selectedTags,
          });
        }

        if (isShared && selectedCollaborators.length > 0 && newAlbum?.id) {
          await supabase.from('album_members').insert(
            selectedCollaborators.map((c) => ({
              album_id: newAlbum.id,
              user_id: c.id,
              role: 'member',
              status: 'pending',
            }))
          );
        }

        if (newAlbum?.id) await addSelectedTasksToAlbum(newAlbum.id);

        router.back();
      }
    } catch (err: any) {
      console.error('Error saving album:', err);
      toast.error(err?.message || t('albums.error_save_album'));
    }
  };

  const isSaving = createAlbum.isPending || updateAlbum.isPending || syncAlbumTags.isPending;

  return {
    isEditing,
    name,
    setName,
    description,
    setDescription,
    priority,
    setPriority,
    selectedCover,
    setSelectedCover,
    visibility,
    setVisibility,
    isShared,
    setIsShared,
    isOwner,
    selectedCollaborators,
    setSelectedCollaborators,
    readOnlyIds,
    existingCollaboratorIds: useMemo(
      () => [...initialCollaboratorIds, ...(albumOwner?.id ? [albumOwner.id] : [])],
      [initialCollaboratorIds, albumOwner?.id],
    ),
    showCollaboratorPicker,
    setShowCollaboratorPicker,
    selectedTags,
    setSelectedTags,
    showTagPicker,
    setShowTagPicker,
    handleTagPickerChange,
    handleRemoveTag,
    selectedTasks,
    toggleTask,
    removeTask,
    existingTaskIds,
    showTaskPicker,
    setShowTaskPicker,
    loadingInitial,
    isSaving,
    handleSave,
  };
}

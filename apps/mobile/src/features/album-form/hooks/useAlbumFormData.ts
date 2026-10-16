import { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateAlbum, useUpdateAlbum } from '../../../hooks/useAlbums';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../stores/auth.store';
import { uploadAlbumCover, isLocalUri } from '../../../services/api/albumCover';
import type { CollaboratorItem } from '../../../components/CollaboratorPickerSheet';
import { COVERS, SOLID_COVERS, type Cover, type AlbumPriority, type AlbumVisibility } from '../types';

export function useAlbumFormData(id?: string) {
  const router = useRouter();
  const isEditing = Boolean(id && id !== 'unassigned');

  const { user, session } = useAuthStore();
  const currentUserId = user?.id || session?.user?.id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<AlbumPriority>('medium');
  const [selectedCover, setSelectedCover] = useState<Cover>(COVERS[1]!);
  const [visibility, setVisibility] = useState<AlbumVisibility>('private');
  const [isShared, setIsShared] = useState(false);
  const [albumOwner, setAlbumOwner] = useState<{ id: string; username?: string; display_name?: string | null; avatar_url?: string | null } | null>(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState<CollaboratorItem[]>([]);
  const [initialCollaboratorIds, setInitialCollaboratorIds] = useState<string[]>([]);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditing);

  const createAlbum = useCreateAlbum();
  const updateAlbum = useUpdateAlbum();

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
          Alert.alert('Error', 'No se pudo cargar la información del álbum');
          return;
        }

        if (!isMounted) return;
        setName(album.title || '');
        setDescription(album.description || '');
        setPriority((album.priority as any) || 'medium');
        setVisibility((album.visibility as any) || 'private');
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
            setSelectedCover(foundCover);
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

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      let coverToSave = selectedCover;
      if (selectedCover.type === 'image' && isLocalUri(selectedCover.uri)) {
        if (!user?.id) throw new Error('Debes iniciar sesión para subir la portada.');
        let publicUrl: string;
        try {
          publicUrl = await uploadAlbumCover(user.id, selectedCover.uri!);
        } catch {
          throw new Error('No se pudo subir la portada. Vuelve a elegir la imagen e inténtalo de nuevo.');
        }
        coverToSave = { ...selectedCover, uri: publicUrl };
        setSelectedCover(coverToSave);
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

        router.back();
      }
    } catch (err: any) {
      console.error('Error saving album:', err);
      Alert.alert('Error', err?.message || 'No se pudo guardar el álbum.');
    }
  };

  const isSaving = createAlbum.isPending || updateAlbum.isPending;

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
    showCollaboratorPicker,
    setShowCollaboratorPicker,
    loadingInitial,
    isSaving,
    handleSave,
  };
}

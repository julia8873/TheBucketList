import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Users, Plus, Globe, Lock, Check, X, Image as ImageIcon, Palette, Flag } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useCreateAlbum, useUpdateAlbum } from '../../src/hooks/useAlbums';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { CollaboratorPickerSheet, type CollaboratorItem } from '../../src/components/CollaboratorPickerSheet';
import * as ImagePicker from 'expo-image-picker';

type Cover = {
  id: string;
  type: 'gradient' | 'solid' | 'image';
  colors?: readonly [string, string, ...string[]];
  diagonal?: boolean;
  uri?: string;
};

const COVERS: Cover[] = [
  { id: 'aurora', type: 'gradient', colors: ['#0E4B43', '#1F8560'] },
  { id: 'atardecer', type: 'gradient', colors: ['#F4A460', '#C8602F'] },
  { id: 'cielo', type: 'gradient', colors: ['#3A78C4', '#8CC8F4'] },
  { id: 'violeta', type: 'gradient', colors: ['#5B2F98', '#2E1A5E'] },
  { id: 'dorado', type: 'gradient', colors: ['#3A2F18', '#5E4E1F'], diagonal: true },
];

const SOLID_COVERS: Cover[] = [
  { id: 'rojo', type: 'solid', colors: ['#E53935', '#E53935'] },
  { id: 'azul', type: 'solid', colors: ['#1E88E5', '#1E88E5'] },
  { id: 'verde', type: 'solid', colors: ['#43A047', '#43A047'] },
  { id: 'amarillo', type: 'solid', colors: ['#FDD835', '#FDD835'] },
  { id: 'morado', type: 'solid', colors: ['#8E24AA', '#8E24AA'] },
];

export default function CreateAlbumScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id && id !== 'unassigned');

  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedCover, setSelectedCover] = useState<Cover>(COVERS[1]!); // Atardecer
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('private');
  const [isShared, setIsShared] = useState(false);
  const [albumOwner, setAlbumOwner] = useState<{ id: string; username?: string; display_name?: string | null; avatar_url?: string | null } | null>(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState<CollaboratorItem[]>([]);
  const [initialCollaboratorIds, setInitialCollaboratorIds] = useState<string[]>([]);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditing);

  const createAlbum = useCreateAlbum();
  const updateAlbum = useUpdateAlbum();

  const { session } = useAuthStore();
  const currentUserId = user?.id || session?.user?.id;
  const isSelf = (targetId?: string | null) => {
    if (!targetId || !currentUserId) return false;
    return String(targetId).toLowerCase() === String(currentUserId).toLowerCase();
  };

  const isOwner = !isEditing || !albumOwner?.id || isSelf(albumOwner.id);
  const readOnlyIds = React.useMemo(() => {
    if (isOwner) return [];
    const ids: string[] = [];
    if (albumOwner?.id) ids.push(albumOwner.id);
    selectedCollaborators.forEach((c) => {
      if (initialCollaboratorIds.includes(c.id) && !isSelf(c.id)) {
        ids.push(c.id);
      }
    });
    return ids;
  }, [isOwner, albumOwner, selectedCollaborators, initialCollaboratorIds, currentUserId]);

  // Load existing album data if in edit mode
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
          // Filter out current user and album owner from members list
          const filteredCollabs = collabs.filter((c) => !isSelf(c.id) && c.id !== album.owner_id);
          // Prepend owner entry if current user is an invited collaborator
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedCover({
        id: 'custom-img',
        type: 'image',
        uri: result.assets[0].uri,
      });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      if (isEditing && id) {
        await updateAlbum.mutateAsync({
          id,
          data: {
            title: name.trim(),
            description: description.trim(),
            priority,
            visibility,
            cover_path: JSON.stringify(selectedCover),
            is_shared: isShared,
          },
        });

        // Sync members
        if (isShared) {
          const currentSet = new Set(initialCollaboratorIds);
          const newSet = new Set(selectedCollaborators.map((c) => c.id));

          // Only add items that are not already in members, not the owner, and not self
          const toAdd = selectedCollaborators.filter(
            (c) => !currentSet.has(c.id) && c.id !== albumOwner?.id && c.id !== user?.id
          );
          // Only owner can remove existing members
          const toRemove = isOwner
            ? initialCollaboratorIds.filter((uid) => !newSet.has(uid))
            : [];

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
          // If toggled off shared, remove members (owner only)
          await supabase.from('album_members').delete().eq('album_id', id);
        }

        router.back();
      } else {
        const newAlbum = await createAlbum.mutateAsync({
          title: name.trim(),
          description: description.trim(),
          priority,
          visibility,
          cover_path: JSON.stringify(selectedCover),
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

  const SectionTitle = ({ highlight, rest }: { highlight: string; rest: string }) => (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitleHighlight}>{highlight}</Text>
      <Text style={styles.sectionTitleRest}>{rest}</Text>
    </View>
  );

  const isSaving = createAlbum.isPending || updateAlbum.isPending;

  if (loadingInitial) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4B13A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* Cabecera */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 52) }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft color="#F3EEE3" size={22} strokeWidth={2} />
            </Pressable>
            <Text style={styles.headerTitle}>{isEditing ? 'Editar álbum' : 'Nuevo álbum'}</Text>
          </View>

          {/* Vista previa en vivo */}
          <View style={styles.previewContainer}>
            {selectedCover.type === 'image' && selectedCover.uri ? (
              <Image source={{ uri: selectedCover.uri }} style={StyleSheet.absoluteFill} />
            ) : (
              <LinearGradient
                colors={selectedCover.colors || ['#000', '#000']}
                start={selectedCover.diagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
                end={selectedCover.diagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.78)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.previewBadgesRow}>
              {isShared && (
                <View style={styles.previewSharedBadge}>
                  <Text style={styles.previewSharedText}>Compartido</Text>
                </View>
              )}
              <View style={styles.previewVisibilityBadge}>
                <Text style={styles.previewVisibilityText}>
                  {visibility === 'public'
                    ? 'Público'
                    : visibility === 'followers'
                    ? 'Solo amigos'
                    : 'Privado'}
                </Text>
              </View>
            </View>

            <View style={styles.previewBottom}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {name.trim() ? name : 'Nuevo álbum'}
              </Text>
              <Text style={styles.previewSubtitle}>
                {isShared && selectedCollaborators.length > 0
                  ? `${selectedCollaborators.length} colaborador${selectedCollaborators.length > 1 ? 'es' : ''}`
                  : '0 tareas · 0 hechas'}
              </Text>
              <View style={styles.progressBarTrack} />
            </View>
          </View>

          {/* Sección Nombre */}
          <View style={styles.section}>
            <SectionTitle highlight="NOMBRE" rest=" DEL ÁLBUM" />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Viaje a Noruega"
              placeholderTextColor="#8F8F8F"
              accessibilityLabel="Nombre del álbum"
            />
          </View>

          {/* Sección Descripción */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            <SectionTitle highlight="DESCRIPCIÓN" rest=" DEL ÁLBUM" />
            <TextInput
              style={[
                styles.input,
                {
                  minHeight: 88,
                  textAlignVertical: 'top',
                  fontSize: 16,
                  fontFamily: 'Inter_400Regular',
                  paddingTop: 16,
                  paddingBottom: 16,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Añade una descripción (opcional)"
              placeholderTextColor="#8F8F8F"
              accessibilityLabel="Descripción del álbum"
              multiline
            />
          </View>

          {/* Sección Prioridad */}
          <View style={styles.section}>
            <SectionTitle highlight="PRIORIDAD" rest=" DEL ÁLBUM" />
            <View style={styles.priorityRow}>
              {[
                { id: 'low' as const, label: 'Baja', color: '#10B981', bgActive: 'rgba(16, 185, 129, 0.14)', borderActive: '#10B981' },
                { id: 'medium' as const, label: 'Media', color: '#D4B13A', bgActive: 'rgba(212, 177, 58, 0.14)', borderActive: '#D4B13A' },
                { id: 'high' as const, label: 'Alta', color: '#EF4444', bgActive: 'rgba(239, 68, 68, 0.14)', borderActive: '#EF4444' },
              ].map((p) => {
                const active = priority === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPriority(p.id)}
                    style={[
                      styles.priorityPill,
                      active && { backgroundColor: p.bgActive, borderColor: p.borderActive },
                    ]}
                  >
                    <Flag size={15} color={active ? p.color : '#8A8A8A'} strokeWidth={active ? 2.2 : 1.8} />
                    <Text style={[styles.priorityText, active && { color: p.color, fontWeight: '700' }]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Sección Visibilidad */}
          <View style={styles.section}>
            <SectionTitle highlight="VISIBILIDAD" rest=" DEL ÁLBUM" />
            <View style={styles.visibilityContainer}>
              {/* Opción 1: Público */}
              <Pressable
                style={[
                  styles.visibilityOption,
                  visibility === 'public' && styles.visibilityOptionActive,
                ]}
                onPress={() => setVisibility('public')}
              >
                <View style={[styles.visibilityIconBox, visibility === 'public' && styles.visibilityIconBoxActive]}>
                  <Globe color={visibility === 'public' ? '#D4B13A' : '#8F8F8F'} size={20} strokeWidth={2} />
                </View>
                <View style={styles.visibilityTexts}>
                  <Text style={[styles.visibilityTitle, visibility === 'public' && styles.visibilityTitleActive]}>
                    Público
                  </Text>
                  <Text style={styles.visibilitySubtitle}>Visible para toda la comunidad</Text>
                </View>
                {visibility === 'public' && <Check color="#D4B13A" size={18} strokeWidth={2.5} />}
              </Pressable>

              {/* Opción 2: Solo amigos */}
              <Pressable
                style={[
                  styles.visibilityOption,
                  visibility === 'followers' && styles.visibilityOptionActive,
                ]}
                onPress={() => setVisibility('followers')}
              >
                <View style={[styles.visibilityIconBox, visibility === 'followers' && styles.visibilityIconBoxActive]}>
                  <Users color={visibility === 'followers' ? '#D4B13A' : '#8F8F8F'} size={20} strokeWidth={2} />
                </View>
                <View style={styles.visibilityTexts}>
                  <Text style={[styles.visibilityTitle, visibility === 'followers' && styles.visibilityTitleActive]}>
                    Solo amigos
                  </Text>
                  <Text style={styles.visibilitySubtitle}>Visible solo para tus seguidores</Text>
                </View>
                {visibility === 'followers' && <Check color="#D4B13A" size={18} strokeWidth={2.5} />}
              </Pressable>

              {/* Opción 3: Privado */}
              <Pressable
                style={[
                  styles.visibilityOption,
                  visibility === 'private' && styles.visibilityOptionActive,
                ]}
                onPress={() => setVisibility('private')}
              >
                <View style={[styles.visibilityIconBox, visibility === 'private' && styles.visibilityIconBoxActive]}>
                  <Lock color={visibility === 'private' ? '#D4B13A' : '#8F8F8F'} size={20} strokeWidth={2} />
                </View>
                <View style={styles.visibilityTexts}>
                  <Text style={[styles.visibilityTitle, visibility === 'private' && styles.visibilityTitleActive]}>
                    Privado
                  </Text>
                  <Text style={styles.visibilitySubtitle}>Solo tú y los colaboradores que invites</Text>
                </View>
                {visibility === 'private' && <Check color="#D4B13A" size={18} strokeWidth={2.5} />}
              </Pressable>
            </View>
          </View>

          {/* Sección Portada */}
          <View style={styles.section}>
            <SectionTitle highlight="TU" rest=" PORTADA" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coversRow}>
              <Pressable
                style={[
                  styles.coverOption,
                  selectedCover.type === 'image' && styles.coverOptionSelected,
                  { justifyContent: 'center', alignItems: 'center', backgroundColor: '#151515' },
                ]}
                onPress={pickImage}
              >
                <ImageIcon color="#8F8F8F" size={24} />
              </Pressable>
              {COVERS.map((cover) => {
                const isSelected = selectedCover.id === cover.id;
                return (
                  <Pressable
                    key={cover.id}
                    style={[styles.coverOption, isSelected && styles.coverOptionSelected]}
                    onPress={() => setSelectedCover(cover)}
                  >
                    <LinearGradient
                      colors={cover.colors!}
                      start={cover.diagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
                      end={cover.diagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={styles.coversRow}>
              <Pressable
                style={[
                  styles.coverOption,
                  selectedCover.id === 'custom-color' && styles.coverOptionSelected,
                  { justifyContent: 'center', alignItems: 'center', backgroundColor: '#151515' },
                ]}
                onPress={() => setSelectedCover({ id: 'custom-color', type: 'solid', colors: ['#D4B13A', '#D4B13A'] })}
              >
                <Palette color="#8F8F8F" size={24} />
              </Pressable>
              {SOLID_COVERS.map((cover) => {
                const isSelected = selectedCover.id === cover.id;
                return (
                  <Pressable
                    key={cover.id}
                    style={[
                      styles.coverOption,
                      isSelected && styles.coverOptionSelected,
                      { backgroundColor: cover.colors![0] },
                    ]}
                    onPress={() => setSelectedCover(cover)}
                  />
                );
              })}
            </ScrollView>
          </View>

          {/* Sección Compartir / Colaboradores */}
          <View style={styles.section}>
            <SectionTitle highlight="COLABORADORES" rest=" DEL ÁLBUM" />
            <View style={styles.card}>
              <View style={[styles.cardRow, isShared && styles.cardRowBorder]}>
                <Users color="#D4B13A" size={22} strokeWidth={2} />
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>Álbum compartido</Text>
                  <Text style={styles.cardSubtitle}>Comparte las tareas y completadlas juntos</Text>
                </View>
                <Pressable
                  style={[
                    styles.switchTrack,
                    isShared && styles.switchTrackActive,
                    !isOwner && { opacity: 0.6 },
                  ]}
                  onPress={() => {
                    if (isOwner) setIsShared(!isShared);
                  }}
                >
                  <View style={[styles.switchKnob, isShared && styles.switchKnobActive]} />
                </Pressable>
              </View>

              {isShared && (
                <View style={styles.collaboratorsContainer}>
                  <Pressable
                    style={styles.addCollabRow}
                    onPress={() => setShowCollaboratorPicker(true)}
                  >
                    <View style={styles.addCollabIconCircle}>
                      <Text style={{ fontSize: 16 }}>👤</Text>
                      <Text style={{ fontSize: 15, color: '#D4B13A', fontWeight: '800', marginLeft: 1 }}>+</Text>
                    </View>
                    <Text style={styles.addCollabText}>
                      {selectedCollaborators.length === 0
                        ? 'Añadir colaboradores al álbum...'
                        : `${selectedCollaborators.length} colaborador${selectedCollaborators.length > 1 ? 'es' : ''} seleccionado${selectedCollaborators.length > 1 ? 's' : ''}`}
                    </Text>
                    <Plus color="#D4B13A" size={18} strokeWidth={2.5} />
                  </Pressable>

                  {selectedCollaborators.length > 0 && (
                    <View style={styles.collaboratorChips}>
                      {selectedCollaborators.map((c) => {
                        const isReadOnly = readOnlyIds.includes(c.id);
                        return (
                          <Pressable
                            key={c.id}
                            style={styles.collaboratorChip}
                            onPress={() => {
                              if (!isReadOnly) {
                                setSelectedCollaborators((prev) => prev.filter((x) => x.id !== c.id));
                              }
                            }}
                          >
                            <Text style={styles.collaboratorChipText}>
                              {c.display_name || `@${c.username}`}
                            </Text>
                            {isReadOnly ? (
                              <Lock color="#D4B13A" size={13} style={{ marginLeft: 4 }} />
                            ) : (
                              <X color="#D4B13A" size={14} />
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CollaboratorPickerSheet
        visible={showCollaboratorPicker}
        selected={selectedCollaborators}
        onChange={setSelectedCollaborators}
        onClose={() => setShowCollaboratorPicker(false)}
        readOnlyIds={readOnlyIds}
      />

      {/* Barra inferior fija */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable
          style={[styles.createBtn, (!name.trim() || isSaving) && styles.createBtnDisabled]}
          disabled={!name.trim() || isSaving}
          onPress={handleSave}
        >
          {isSaving ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text style={styles.createBtnText}>
              {isEditing ? 'Guardar cambios' : 'Crear álbum'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 30,
    color: '#F3EEE3',
  },
  previewContainer: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  previewBadgesRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewSharedBadge: {
    height: 30,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(13, 13, 13, 0.76)',
    borderWidth: 1,
    borderColor: '#6B5A22',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSharedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#D4B13A',
  },
  previewVisibilityBadge: {
    height: 30,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(13, 13, 13, 0.76)',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewVisibilityText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#E2DCCF',
  },
  previewBottom: {
    position: 'absolute',
    bottom: 18,
    left: 22,
    right: 22,
  },
  previewTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    color: '#F3EEE3',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#E2DCCF',
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    width: '100%',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleHighlight: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: '#D4B13A',
    letterSpacing: 0.6,
  },
  sectionTitleRest: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  input: {
    height: 64,
    borderRadius: 16,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 18,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 20,
    color: '#F3EEE3',
  },
  visibilityContainer: {
    gap: 10,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
  },
  visibilityOptionActive: {
    borderColor: '#D4B13A',
    backgroundColor: 'rgba(212, 177, 58, 0.06)',
  },
  visibilityIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  visibilityIconBoxActive: {
    backgroundColor: 'rgba(212, 177, 58, 0.16)',
  },
  visibilityTexts: {
    flex: 1,
  },
  visibilityTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F3EEE3',
    marginBottom: 2,
  },
  visibilityTitleActive: {
    color: '#D4B13A',
  },
  visibilitySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#8F8F8F',
  },
  coversRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coverOption: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  coverOptionSelected: {
    borderWidth: 2,
    borderColor: '#D4B13A',
  },
  card: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingHorizontal: 16,
  },
  cardRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  cardTexts: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F3EEE3',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#8F8F8F',
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#262626',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#D4B13A',
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8F8F8F',
  },
  switchKnobActive: {
    backgroundColor: '#0D0D0D',
    transform: [{ translateX: 20 }],
  },
  collaboratorsContainer: {
    padding: 16,
  },
  addCollabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addCollabIconCircle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCollabText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#BDB7AA',
  },
  collaboratorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  collaboratorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
    borderWidth: 1,
    borderColor: '#D4B13A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  collaboratorChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#D4B13A',
  },
  bottomBar: {
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 14,
    paddingHorizontal: 20,
  },
  createBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4B13A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4B13A',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#0D0D0D',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  priorityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#262626',
    backgroundColor: '#161616',
  },
  priorityText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#E5E5E5',
  },
});


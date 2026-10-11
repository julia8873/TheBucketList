import React, { useState } from 'react';
import { Modal, View, Pressable, Animated, ActivityIndicator, Alert, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Typography } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { X, Camera, FolderPlus, ListPlus, Trash2, Circle, MoreHorizontal, CheckCircle2, Check, Eye, Users, Lock, ArrowLeft, FolderOpen, Image as ImageIcon, Tag, LogOut } from 'lucide-react-native';
import { styles } from '../../app/bucket/BucketDetail.styles';

type BucketBottomSheetProps = {
  sheetVisible: boolean;
  sheetMode: 'menu' | 'status' | 'visibility' | 'albums' | 'category';
  sheetTranslateY: Animated.Value;
  closeSheet: (after?: () => void) => void;
  theme: any;
  isOwner: boolean;
  canEdit?: boolean;
  isCollaborator?: boolean;
  onLeaveCollaboration?: () => void;
  uploadPhotos: () => void;
  uploadCover: () => void;
  loadAlbums: () => void;
  user: any;
  copyBucket: any;
  id: string;
  handleDelete: () => void;
  bucket: any;
  handleChangeStatus: (status: string) => void;
  handleChangeVisibility: (visibility: 'public' | 'followers' | 'private') => void;
  handleChangeCategory?: (categoryId: string) => void;
  setSheetMode: (mode: 'menu' | 'status' | 'visibility' | 'albums' | 'category') => void;
  albumsLoading: boolean;
  toggleAlbum: (albumId: string) => void;
  removeAllAlbums: () => void;
  albums: any[];
  bucketAlbums: any[];
  categories?: any[];
};

export function BucketBottomSheet({
  sheetVisible, sheetMode, sheetTranslateY, closeSheet, theme, isOwner, canEdit, isCollaborator, onLeaveCollaboration, uploadPhotos, uploadCover, loadAlbums, user, copyBucket, id, handleDelete, bucket, handleChangeStatus, handleChangeVisibility, handleChangeCategory, setSheetMode, albumsLoading, toggleAlbum, removeAllAlbums, albums, bucketAlbums, categories
}: BucketBottomSheetProps) {
  const [albumSearchQuery, setAlbumSearchQuery] = useState('');
  const visibilityLabel = (v: string) => {
    switch (v) {
      case 'public': return 'Pública';
      case 'private': return 'Privada';
      case 'followers': return 'Seguidores';
      default: return v;
    }
  };

  return (
    <Modal
      visible={sheetVisible}
      transparent
      animationType="none"
      onRequestClose={() => closeSheet()}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet()} />
        <Animated.View
          style={[
            styles.bottomSheet,
            { backgroundColor: theme.colors.background, transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.sheetHandle} />

          {sheetMode === 'menu' && (
            <>
              <View style={styles.sheetHeader}>
                <Typography variant="h3" color={theme.colors.foreground}>Opciones</Typography>
                <Pressable style={styles.sheetClose} onPress={() => closeSheet()}>
                  <X color={theme.colors.foregroundMuted} size={20} />
                </Pressable>
              </View>

              <View style={styles.sheetOptions}>
                {canEdit && (
                  <Pressable style={styles.sheetOption} onPress={() => void uploadPhotos()}>
                    <View style={styles.sheetIcon}><Camera color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Subir fotos</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Añade recuerdos a este momento</Typography>
                    </View>
                  </Pressable>
                )}

                {canEdit && (
                  <Pressable style={styles.sheetOption} onPress={() => void uploadCover()}>
                    <View style={styles.sheetIcon}><ImageIcon color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Cambiar portada</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Sube una imagen para la cabecera</Typography>
                    </View>
                  </Pressable>
                )}

                {canEdit && (
                  <Pressable style={styles.sheetOption} onPress={() => setSheetMode('category')}>
                    <View style={styles.sheetIcon}><Tag color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Cambiar categoría</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>
                        {bucket.category?.name_es || 'Sin categoría'}
                      </Typography>
                    </View>
                  </Pressable>
                )}

                {canEdit && (
                  <Pressable style={styles.sheetOption} onPress={() => void loadAlbums()}>
                    <View style={styles.sheetIcon}><FolderPlus color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Mover a carpetas</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Organiza esta tarea en un álbum</Typography>
                    </View>
                  </Pressable>
                )}

                {!canEdit && user && (
                  <Pressable
                    style={styles.sheetOption}
                    onPress={() => {
                      closeSheet(() => copyBucket.mutate({ bucketId: id, userId: user.id }, {
                        onSuccess: () => Alert.alert('Añadido a tu lista', 'La tarea se ha copiado a tu lista.'),
                        onError: (error: any) => Alert.alert('No se pudo copiar', error.message),
                      }));
                    }}
                  >
                    <View style={styles.sheetIcon}><ListPlus color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Yo también quiero hacerlo</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Añádelo a tu lista</Typography>
                    </View>
                  </Pressable>
                )}

                {isCollaborator && (
                  <Pressable style={[styles.sheetOption, styles.dangerOption]} onPress={onLeaveCollaboration}>
                    <View style={styles.sheetIcon}><LogOut color={theme.colors.error} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold" color={theme.colors.error}>Dejar de colaborar</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Sale de la colaboración en esta tarea</Typography>
                    </View>
                  </Pressable>
                )}

                {isOwner && (
                  <Pressable style={[styles.sheetOption, styles.dangerOption]} onPress={handleDelete}>
                    <View style={styles.sheetIcon}><Trash2 color={theme.colors.error} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold" color={theme.colors.error}>Eliminar</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Esta acción no se puede deshacer</Typography>
                    </View>
                  </Pressable>
                )}
              </View>
            </>
          )}

          {sheetMode === 'status' && (
            <>
              <View style={[styles.sheetHeader, { justifyContent: 'center' }]}>
                <Typography variant="h3" color={theme.colors.foreground}>Estado</Typography>
              </View>
              <View style={styles.sheetOptions}>
                {([
                  { value: 'pending', title: 'Pendiente', subtitle: 'La tarea está por hacer', icon: Circle },
                  { value: 'in_progress', title: 'En progreso', subtitle: 'La tarea está en curso', icon: MoreHorizontal },
                  { value: 'completed', title: 'Completada', subtitle: 'La tarea ya se ha realizado', icon: CheckCircle2 },
                  { value: 'expired', title: 'Cancelada', subtitle: 'La tarea ha sido cancelada o caducada', icon: X },
                ] as const).map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Pressable key={item.value} style={styles.sheetOption} onPress={() => void handleChangeStatus(item.value)}>
                      <View style={styles.sheetIcon}><IconComponent color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{item.title}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{item.subtitle}</Typography>
                      </View>
                      {bucket.status === item.value && <Check color={gold[400]} size={21} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {sheetMode === 'visibility' && (
            <>
              <View style={[styles.sheetHeader, { justifyContent: 'center' }]}>
                <Typography variant="h3" color={theme.colors.foreground}>Visibilidad</Typography>
              </View>
              <View style={styles.sheetOptions}>
                {([
                  { value: 'public', title: 'Pública', subtitle: 'Cualquiera puede ver este momento', icon: Eye },
                  { value: 'followers', title: 'Seguidores', subtitle: 'Solo tus seguidores pueden verlo', icon: Users },
                  { value: 'private', title: 'Privada', subtitle: 'Solo tú puedes verlo', icon: Lock },
                ] as const).map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Pressable key={item.value} style={styles.sheetOption} onPress={() => void handleChangeVisibility(item.value as 'public' | 'followers' | 'private')}>
                      <View style={styles.sheetIcon}><IconComponent color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{item.title}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{item.subtitle}</Typography>
                      </View>
                      {bucket.visibility === item.value && <Check color={gold[400]} size={21} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {sheetMode === 'category' && (
            <>
              <View style={styles.sheetHeader}>
                <Pressable style={styles.backSheetButton} onPress={() => setSheetMode('menu')}>
                  <ArrowLeft color={theme.colors.foreground} size={20} />
                </Pressable>
                <Typography variant="h3" color={theme.colors.foreground}>Categoría</Typography>
                <View style={{ width: 36 }} />
              </View>
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={styles.sheetOptions}>
                  {(categories || []).map((cat) => {
                    const isSelected = bucket.category_id === cat.id || bucket.category?.id === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        style={styles.sheetOption}
                        onPress={() => handleChangeCategory?.(cat.id)}
                      >
                        <View style={styles.sheetIcon}><Tag color={cat.color || gold[400]} size={21} /></View>
                        <View style={styles.sheetOptionText}>
                          <Typography variant="bodySemibold">{cat.name_es}</Typography>
                          {cat.description ? (
                            <Typography variant="caption" color={theme.colors.foregroundMuted}>{cat.description}</Typography>
                          ) : null}
                        </View>
                        {isSelected && <Check color={gold[400]} size={21} />}
                      </Pressable>
                    );
                  })}
                  {(!categories || categories.length === 0) && (
                    <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.emptySheetText}>No hay categorías disponibles.</Typography>
                  )}
                </View>
              </ScrollView>
            </>
          )}

          {sheetMode === 'albums' && (
            <>
              <View style={styles.sheetHeader}>
                <Pressable style={styles.backSheetButton} onPress={() => setSheetMode('menu')}>
                  <ArrowLeft color={theme.colors.foreground} size={20} />
                </Pressable>
                <Typography variant="h3" color={theme.colors.foreground}>Seleccionar carpetas</Typography>
                <View style={{ width: 36 }} />
              </View>
              {albumsLoading ? (
                <View style={styles.sheetLoading}><ActivityIndicator color={gold[400]} /></View>
              ) : (
                <View style={styles.sheetOptions}>
                  <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                    <TextInput
                      style={{
                        backgroundColor: theme.colors.background,
                        color: theme.colors.foreground,
                        padding: 12,
                        borderRadius: 12,
                        fontSize: 16,
                      }}
                      placeholder="Buscar carpeta..."
                      placeholderTextColor={theme.colors.foregroundMuted}
                      value={albumSearchQuery}
                      onChangeText={setAlbumSearchQuery}
                    />
                  </View>
                  <Pressable style={styles.sheetOption} onPress={() => void removeAllAlbums()}>
                    <View style={styles.sheetIcon}><FolderOpen color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Sin carpeta</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Dejar la tarea fuera de álbumes</Typography>
                    </View>
                    {bucketAlbums.length === 0 && <Check color={gold[400]} size={21} />}
                  </Pressable>
                  {albums.filter((a) => a.title?.toLowerCase().includes(albumSearchQuery.toLowerCase())).map((album) => {
                    const isSelected = bucketAlbums.some(ba => ba.album_id === album.id);
                    return (
                      <Pressable key={album.id} style={styles.sheetOption} onPress={() => void toggleAlbum(album.id)}>
                        <View style={styles.sheetIcon}><FolderOpen color={gold[400]} size={21} /></View>
                        <View style={styles.sheetOptionText}>
                          <Typography variant="bodySemibold">{album.title}</Typography>
                          <Typography variant="caption" color={theme.colors.foregroundMuted}>
                            {album.visibility ? visibilityLabel(album.visibility) : ''}
                          </Typography>
                        </View>
                        {isSelected && <Check color={gold[400]} size={21} />}
                      </Pressable>
                    );
                  })}
                  {albums.length === 0 && (
                    <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.emptySheetText}>No tienes carpetas creadas todavía.</Typography>
                  )}
                </View>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

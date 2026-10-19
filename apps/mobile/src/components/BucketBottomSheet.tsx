import React, { useState } from 'react';
import { Modal, View, Pressable, Animated, ActivityIndicator, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Typography, toast } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { X, Camera, FolderPlus, ListPlus, Trash2, Circle, MoreHorizontal, CheckCircle2, Check, Eye, Users, Lock, ArrowLeft, FolderOpen, Image as ImageIcon, Tag, LogOut, Flag, Star, Crop, Link2, Bookmark } from 'lucide-react-native';
import { styles } from '@/features/bucket-detail/styles/bucket-detail.styles';

type BucketBottomSheetProps = {
  sheetVisible: boolean;
  sheetMode: 'menu' | 'status' | 'visibility' | 'albums' | 'category' | 'priority' | 'cover';
  sheetTranslateY: Animated.Value;
  closeSheet: (after?: () => void) => void;
  theme: any;
  isOwner: boolean;
  canEdit?: boolean;
  isCollaborator?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onLeaveCollaboration?: () => void;
  /** Reportar la tarea al administrador (solo usuarios que no son su autor). */
  onReport?: () => void;
  uploadPhotos: () => void;
  uploadCover: () => void;
  pickAndUploadCover?: () => void;
  takePhotoAndUploadCover?: () => void;
  openCoverLinkModal?: () => void;
  recropCurrentCover?: () => void;
  removeCover?: () => void;
  loadAlbums: () => void;
  user: any;
  copyBucket: any;
  id: string;
  handleDelete: () => void;
  bucket: any;
  handleChangeStatus: (status: string) => void;
  handleChangeVisibility: (visibility: 'public' | 'followers' | 'private') => void;
  handleChangeCategory?: (categoryId: string) => void;
  handleChangePriority?: (priority: 'low' | 'medium' | 'high') => void;
  setSheetMode: (mode: 'menu' | 'status' | 'visibility' | 'albums' | 'category' | 'priority' | 'cover') => void;
  albumsLoading: boolean;
  toggleAlbum: (albumId: string) => void;
  removeAllAlbums: () => void;
  albums: any[];
  bucketAlbums: any[];
  categories?: any[];
};

export function BucketBottomSheet({
  sheetVisible, sheetMode, sheetTranslateY, closeSheet, theme, isOwner, canEdit, isCollaborator, isFavorite, onToggleFavorite, isSaved, onToggleSave, onLeaveCollaboration, onReport, uploadPhotos, uploadCover, pickAndUploadCover, takePhotoAndUploadCover, openCoverLinkModal, recropCurrentCover, removeCover, loadAlbums, user, copyBucket, id, handleDelete, bucket, handleChangeStatus, handleChangeVisibility, handleChangeCategory, handleChangePriority, setSheetMode, albumsLoading, toggleAlbum, removeAllAlbums, albums, bucketAlbums, categories
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

  const priorityLabel = (p: string) => {
    switch (p) {
      case 'high': return 'Alta';
      case 'low': return 'Baja';
      case 'medium':
      default: return 'Media';
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
                {canEdit && user && onToggleFavorite && (
                  <Pressable style={styles.sheetOption} onPress={onToggleFavorite}>
                    <View style={styles.sheetIcon}>
                      <Star
                        color={gold[400]}
                        fill={isFavorite ? gold[400] : 'transparent'}
                        size={21}
                      />
                    </View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">
                        {isFavorite ? 'Quitar de favoritas' : 'Marcar como favorita'}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>
                        {isFavorite ? 'Elimina la tarea de tus favoritas' : 'Añade la tarea a tus favoritas'}
                      </Typography>
                    </View>
                  </Pressable>
                )}

                {!canEdit && user && onToggleSave && (
                  <Pressable style={styles.sheetOption} onPress={onToggleSave}>
                    <View style={styles.sheetIcon}>
                      <Bookmark
                        color={gold[400]}
                        fill={isSaved ? gold[400] : 'transparent'}
                        size={21}
                      />
                    </View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">
                        {isSaved ? 'Quitar de guardados' : 'Guardar tarea'}
                      </Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>
                        {isSaved ? 'Elimina la tarea de tus guardados' : 'Guarda esta tarea para consultarla más tarde'}
                      </Typography>
                    </View>
                  </Pressable>
                )}

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
                  <Pressable style={styles.sheetOption} onPress={() => setSheetMode('cover')}>
                    <View style={styles.sheetIcon}><ImageIcon color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Cambiar portada</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Sube o reajusta una imagen para la cabecera</Typography>
                    </View>
                  </Pressable>
                )}

                {canEdit && (
                  <Pressable style={styles.sheetOption} onPress={() => setSheetMode('priority')}>
                    <View style={styles.sheetIcon}><Flag color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Cambiar prioridad</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>
                        Prioridad {priorityLabel(bucket.priority)}
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
                        onSuccess: () => toast.success('La tarea se ha copiado a tu lista.'),
                        onError: (error: any) => toast.error(error?.message || 'No se pudo copiar la tarea'),
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

                {!isOwner && user && onReport && (
                  <Pressable style={[styles.sheetOption, styles.dangerOption]} onPress={() => closeSheet(onReport)}>
                    <View style={styles.sheetIcon}><Flag color={theme.colors.error} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold" color={theme.colors.error}>Reportar tarea</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Avisa al administrador de contenido inapropiado</Typography>
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

          {sheetMode === 'priority' && (
            <>
              <View style={styles.sheetHeader}>
                <Pressable style={styles.backSheetButton} onPress={() => setSheetMode('menu')}>
                  <ArrowLeft color={theme.colors.foreground} size={20} />
                </Pressable>
                <Typography variant="h3" color={theme.colors.foreground}>Prioridad</Typography>
                <View style={{ width: 36 }} />
              </View>
              <View style={styles.sheetOptions}>
                {([
                  { value: 'high' as const, title: 'Alta', subtitle: 'Requiere atención prioritaria', color: '#EF4444' },
                  { value: 'medium' as const, title: 'Media', subtitle: 'Importancia habitual', color: '#D4B13A' },
                  { value: 'low' as const, title: 'Baja', subtitle: 'Puede esperar o hacerse con calma', color: '#10B981' },
                ]).map((item) => {
                  const isSelected = (bucket.priority || 'medium') === item.value;
                  return (
                    <Pressable
                      key={item.value}
                      style={styles.sheetOption}
                      onPress={() => handleChangePriority?.(item.value)}
                    >
                      <View style={styles.sheetIcon}><Flag color={item.color} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{item.title}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{item.subtitle}</Typography>
                      </View>
                      {isSelected && <Check color={gold[400]} size={21} />}
                    </Pressable>
                  );
                })}
              </View>
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
          {sheetMode === 'cover' && (
            <>
              <View style={styles.sheetHeader}>
                <Pressable style={styles.backSheetButton} onPress={() => setSheetMode('menu')}>
                  <ArrowLeft color={theme.colors.foreground} size={20} />
                </Pressable>
                <Typography variant="h3" color={theme.colors.foreground}>Foto de portada</Typography>
                <View style={{ width: 36 }} />
              </View>
              <View style={styles.sheetOptions}>
                <Pressable
                  style={styles.sheetOption}
                  onPress={() => {
                    closeSheet(() => void (pickAndUploadCover ? pickAndUploadCover() : uploadCover()));
                  }}
                >
                  <View style={styles.sheetIcon}><ImageIcon color={gold[400]} size={21} /></View>
                  <View style={styles.sheetOptionText}>
                    <Typography variant="bodySemibold">Elegir de la galería</Typography>
                    <Typography variant="caption" color={theme.colors.foregroundMuted}>Selecciona y recorta a tu gusto</Typography>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.sheetOption}
                  onPress={() => {
                    closeSheet(() => void (takePhotoAndUploadCover ? takePhotoAndUploadCover() : uploadCover()));
                  }}
                >
                  <View style={styles.sheetIcon}><Camera color={gold[400]} size={21} /></View>
                  <View style={styles.sheetOptionText}>
                    <Typography variant="bodySemibold">Hacer foto con la cámara</Typography>
                    <Typography variant="caption" color={theme.colors.foregroundMuted}>Toma una foto al instante</Typography>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.sheetOption}
                  onPress={() => {
                    closeSheet(() => openCoverLinkModal?.());
                  }}
                >
                  <View style={styles.sheetIcon}><Link2 color={gold[400]} size={21} /></View>
                  <View style={styles.sheetOptionText}>
                    <Typography variant="bodySemibold">Añadir con enlace de Google / Web</Typography>
                    <Typography variant="caption" color={theme.colors.foregroundMuted}>Pega un enlace sin descargar la foto</Typography>
                  </View>
                </Pressable>

                {bucket?.cover_image && !bucket.cover_image.startsWith('preset:') && (
                  <Pressable
                    style={styles.sheetOption}
                    onPress={() => {
                      closeSheet(() => void recropCurrentCover?.());
                    }}
                  >
                    <View style={styles.sheetIcon}><Crop color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Reajustar recorte actual</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Ajusta o rota la foto existente</Typography>
                    </View>
                  </Pressable>
                )}

                {bucket?.cover_image && (
                  <Pressable
                    style={[styles.sheetOption, styles.dangerOption]}
                    onPress={() => {
                      closeSheet(() => void removeCover?.());
                    }}
                  >
                    <View style={styles.sheetIcon}><Trash2 color={theme.colors.error} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold" color={theme.colors.error}>Quitar foto de portada</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Volver al degradado predeterminado</Typography>
                    </View>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

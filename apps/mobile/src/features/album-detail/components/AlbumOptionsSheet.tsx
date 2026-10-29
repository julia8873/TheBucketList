import React, { useEffect } from 'react';
import {
  View,
  Pressable,
  Modal,
  ScrollView,
  Animated,
  BackHandler,
  StyleSheet,
} from 'react-native';
import {
  Star,
  Bookmark,
  RotateCcw,
  CheckCircle2,
  FolderPlus,
  Share as ShareIcon,
  Camera,
  Lock,
  Flag,
  Eye,
  Users,
  Pencil,
  Trash2,
  Globe,
  Check,
  Tag as TagIcon,
  Image as ImageIcon,
  Link2,
  Crop,
  Maximize2,
  Sparkles,
} from 'lucide-react-native';
import { CoverColorPicker } from '@/components/CoverColorPicker';
import { Typography, useTheme } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
// Mismos estilos que el menú de las tareas (BucketBottomSheet) para que la app sea consistente.
import { styles } from '@/features/bucket-detail/styles/bucket-detail.styles';
import { useTranslation } from '@bucketlist/shared';

type SheetMode = 'menu' | 'visibility' | 'priority' | 'status' | 'cover';

interface AlbumOptionsSheetProps {
  visible: boolean;
  sheetMode: SheetMode;
  sheetTranslateY: Animated.Value;
  isFav: boolean;
  isSaved?: boolean;
  isAdmin?: boolean;
  isOwner: boolean;
  isCollaborator: boolean;
  canEdit: boolean;
  areAllCompleted: boolean;
  isAlbumClosed: boolean;
  albumVisibility?: string;
  albumPriority?: string;
  albumIsClosed?: boolean;
  tasksLength: number;
  currentUserId?: string;
  albumId: string;
  hasCustomCover?: boolean;
  coverAspectRatio?: '1:1' | '16:9' | '3:4';
  onClose: () => void;
  /** Reportar el álbum al administrador (solo quien no es su propietario). */
  onReport?: () => void;
  onToggleFavorite: () => void;
  onToggleSave?: () => void;
  onToggleAllTasks: () => void;
  onCopyAlbum: () => void;
  onShare: () => void;
  onPickGallery?: () => void;
  onTakePhoto?: () => void;
  onOpenCoverLink?: () => void;
  onRecropCover?: () => void;
  onChangeCoverShape?: (newRatio: '1:1' | '16:9' | '3:4') => void;
  onRemoveCover?: () => void;
  /** Portada con degradado (predeterminado o personalizado). */
  onSelectCoverGradient?: (colors: [string, string], id: string | null) => void;
  /** Portada con color sólido. */
  onSelectCoverSolid?: (hex: string) => void;
  onToggleClose: (close: boolean) => void;
  onChangePriority: (p: 'low' | 'medium' | 'high') => void;
  onChangeVisibility: (v: 'public' | 'followers' | 'private') => void;
  onSetSheetMode: (mode: SheetMode) => void;
  onOpenCollaborators: () => void;
  onOpenTags?: () => void;
  onPromoteToCollection?: () => void;
  onConfirmDelete: () => void;
  onConfirmLeave: () => void;
}

export function AlbumOptionsSheet({
  visible,
  sheetMode,
  sheetTranslateY,
  isFav,
  isSaved = false,
  isAdmin = false,
  isOwner,
  isCollaborator,
  canEdit,
  areAllCompleted,
  isAlbumClosed,
  albumVisibility,
  albumPriority,
  albumIsClosed,
  tasksLength,
  currentUserId,
  albumId,
  hasCustomCover,
  coverAspectRatio,
  onClose,
  onToggleFavorite,
  onToggleSave,
  onToggleAllTasks,
  onCopyAlbum,
  onShare,
  onPickGallery,
  onTakePhoto,
  onOpenCoverLink,
  onRecropCover,
  onChangeCoverShape,
  onRemoveCover,
  onSelectCoverGradient,
  onSelectCoverSolid,
  onToggleClose,
  onChangePriority,
  onChangeVisibility,
  onSetSheetMode,
  onOpenCollaborators,
  onOpenTags,
  onPromoteToCollection,
  onConfirmDelete,
  onConfirmLeave,
  onReport,
}: AlbumOptionsSheetProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheetMode !== 'menu') {
        onSetSheetMode('menu');
        return true;
      }
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, sheetMode, onSetSheetMode, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
                <Typography variant="h3" color={theme.colors.foreground}>{t('albums.options_title', { defaultValue: 'Opciones del álbum' })}</Typography>
              </View>
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.sheetOptions}>
                  {currentUserId && albumId !== 'unassigned' && canEdit && (
                    <SheetOption
                      icon={<Star color={gold[400]} fill={isFav ? gold[400] : 'transparent'} size={21} />}
                      title={isFav ? t('albums.options_unfav', { defaultValue: 'Quitar de favoritos' }) : t('albums.options_fav', { defaultValue: 'Marcar como favorito' })}
                      subtitle={isFav ? t('albums.options_unfav_sub', { defaultValue: 'Elimina este álbum de tu lista de favoritos' }) : t('albums.options_fav_sub', { defaultValue: 'Guarda este álbum en tus favoritos' })}
                      onPress={onToggleFavorite}
                    />
                  )}
                  {currentUserId && albumId !== 'unassigned' && !canEdit && onToggleSave && (
                    <SheetOption
                      icon={<Bookmark color={gold[400]} fill={isSaved ? gold[400] : 'transparent'} size={21} />}
                      title={isSaved ? t('albums.options_unsave', { defaultValue: 'Quitar de guardados' }) : t('albums.options_save', { defaultValue: 'Guardar álbum' })}
                      subtitle={isSaved ? t('albums.options_unsave_sub', { defaultValue: 'Elimina este álbum de tus álbumes guardados' }) : t('albums.options_save_sub', { defaultValue: 'Guarda este álbum en tu sección de álbumes guardados' })}
                      onPress={() => {
                        onClose();
                        onToggleSave();
                      }}
                    />
                  )}
                  {canEdit && tasksLength > 0 && (
                    <SheetOption
                      icon={areAllCompleted ? <RotateCcw color={gold[400]} size={21} /> : <CheckCircle2 color={gold[400]} size={21} />}
                      title={areAllCompleted ? t('albums.options_mark_all_pending', { defaultValue: 'Marcar todas como pendientes' }) : t('albums.options_mark_all_completed', { defaultValue: 'Marcar todas como completadas' })}
                      subtitle={areAllCompleted ? t('albums.options_mark_all_pending_sub', { defaultValue: 'Revertir estado de todas las tareas' }) : t('albums.options_mark_all_completed_sub', { defaultValue: 'Completa todas las tareas del álbum' })}
                      onPress={onToggleAllTasks}
                    />
                  )}
                  {!canEdit && (
                    <>
                      <SheetOption
                        icon={<FolderPlus color={gold[400]} size={21} />}
                        title={t('albums.options_copy_profile', { defaultValue: 'Copiar álbum a mi perfil' })}
                        subtitle={t('albums.options_copy_profile_sub', { defaultValue: 'Crea una copia de este álbum y sus tareas en tu lista' })}
                        onPress={onCopyAlbum}
                      />
                      <SheetOption
                        icon={<ShareIcon color={gold[400]} size={21} />}
                        title={t('albums.options_share', { defaultValue: 'Compartir álbum' })}
                        subtitle={t('albums.options_share_sub', { defaultValue: 'Envía este álbum a tus amigos' })}
                        onPress={onShare}
                      />
                    </>
                  )}
                  {!isOwner && currentUserId && albumId !== 'unassigned' && onReport && (
                    <SheetOption
                      icon={<Flag color={theme.colors.error} size={21} />}
                      title={t('albums.options_report', { defaultValue: 'Reportar álbum' })}
                      subtitle={t('albums.options_report_sub', { defaultValue: 'Avisa al administrador de contenido inapropiado' })}
                      danger
                      onPress={() => {
                        onClose();
                        onReport();
                      }}
                    />
                  )}
                  {canEdit && (
                    <>
                      <SheetOption
                        icon={<Camera color={gold[400]} size={21} />}
                        title={t('albums.options_change_cover', { defaultValue: 'Cambiar portada' })}
                        subtitle={t('albums.options_change_cover_sub', { defaultValue: 'Elige foto de la galería, cámara o enlace web' })}
                        onPress={() => onSetSheetMode('cover')}
                      />
                      <SheetOption
                        icon={<Lock color={gold[400]} size={21} />}
                        title={isAlbumClosed ? t('albums.options_reopen', { defaultValue: 'Reabrir álbum' }) : t('albums.options_close', { defaultValue: 'Cerrar álbum para siempre' })}
                        subtitle={isAlbumClosed ? t('albums.options_reopen_sub', { defaultValue: 'Permite volver a añadir tareas al álbum' }) : t('albums.options_close_sub', { defaultValue: 'Marca el álbum como cerrado y completado definitivamente' })}
                        onPress={() => onToggleClose(!isAlbumClosed)}
                      />
                      <SheetOption
                        icon={<Flag color={gold[400]} size={21} />}
                        title={t('albums.options_change_priority', { defaultValue: 'Cambiar prioridad' })}
                        subtitle={albumPriority === 'high' || albumPriority === 'urgent' ? t('common.high', { defaultValue: 'Prioridad Alta' }) : albumPriority === 'low' ? t('common.low', { defaultValue: 'Prioridad Baja' }) : t('common.medium', { defaultValue: 'Prioridad Media' })}
                        onPress={() => onSetSheetMode('priority')}
                      />
                      <SheetOption
                        icon={<Eye color={gold[400]} size={21} />}
                        title={t('albums.options_change_visibility', { defaultValue: 'Cambiar visibilidad' })}
                        subtitle={albumVisibility === 'public' ? t('albums.visibility_public', { defaultValue: 'Público actualmente' }) : albumVisibility === 'followers' ? t('albums.visibility_followers', { defaultValue: 'Solo amigos actualmente' }) : t('albums.visibility_private', { defaultValue: 'Privado actualmente' })}
                        onPress={() => onSetSheetMode('visibility')}
                      />
                      <SheetOption
                        icon={<Users color={gold[400]} size={21} />}
                        title={t('albums.options_collaborators', { defaultValue: 'Gestionar colaboradores' })}
                        subtitle={t('albums.options_collaborators_sub', { defaultValue: 'Invita o quita personas de este álbum' })}
                        onPress={onOpenCollaborators}
                      />
                      {onOpenTags && (
                        <SheetOption
                          icon={<TagIcon color={gold[400]} size={21} />}
                          title={t('albums.options_tags', { defaultValue: 'Gestionar etiquetas' })}
                          subtitle={t('albums.options_tags_sub', { defaultValue: 'Añade o quita etiquetas del álbum y sus tareas' })}
                          onPress={onOpenTags}
                        />
                      )}
                      <SheetOption
                        icon={<Pencil color={gold[400]} size={21} />}
                        title={t('albums.options_edit_full', { defaultValue: 'Editar detalles completos' })}
                        subtitle={t('albums.options_edit_full_sub', { defaultValue: 'Nombre, portada, privacidad y más' })}
                        onPress={onClose}
                      />
                    </>
                  )}
                  {isAdmin && onPromoteToCollection && (
                    <SheetOption
                      icon={<Sparkles color={gold[400]} size={21} />}
                      title={t('albums.promote_to_collection', { defaultValue: 'Promocionar a Colección (Admin)' })}
                      subtitle={t('albums.promote_to_collection_sub', { defaultValue: 'Publica este álbum en la pestaña Colecciones para todos' })}
                      onPress={() => {
                        onClose();
                        onPromoteToCollection();
                      }}
                    />
                  )}
                  {isOwner && (
                    <SheetOption
                      icon={<Trash2 color={theme.colors.error} size={21} />}
                      title={t('albums.options_delete', { defaultValue: 'Eliminar álbum' })}
                      subtitle={t('albums.options_delete_sub', { defaultValue: 'Las tareas se moverán a Sin álbum' })}
                      danger
                      onPress={onConfirmDelete}
                      
                    />
                  )}
                  {isCollaborator && (
                    <SheetOption
                      icon={<Trash2 color={theme.colors.error} size={21} />}
                      title={t('albums.options_leave', { defaultValue: 'Dejar de colaborar' })}
                      subtitle={t('albums.options_leave_sub', { defaultValue: 'El álbum dejará de aparecer en tu lista' })}
                      danger
                      onPress={onConfirmLeave}
                      
                    />
                  )}
                </View>
              </ScrollView>
            </>
          )}

          {sheetMode === 'priority' && (
            <>
              <View style={styles.sheetHeader}>
                <Typography variant="h3" color={theme.colors.foreground}>{t('bucket.priority_title')}</Typography>
              </View>
              <View style={styles.sheetOptions}>
                {([
                  { value: 'high' as const, title: t('bucket.priority_high'), subtitle: t('bucket.priority_high_desc'), color: '#EF4444' },
                  { value: 'medium' as const, title: t('bucket.priority_medium'), subtitle: t('bucket.priority_medium_desc'), color: '#D4B13A' },
                  { value: 'low' as const, title: t('bucket.priority_low'), subtitle: t('bucket.priority_low_desc'), color: '#10B981' },
                ]).map((item) => {
                  const current = albumPriority === 'urgent' ? 'high' : (albumPriority || 'medium');
                  return (
                    <Pressable key={item.value} style={styles.sheetOption} onPress={() => onChangePriority(item.value)}>
                      <View style={styles.sheetIcon}><Flag color={item.color} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{item.title}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{item.subtitle}</Typography>
                      </View>
                      {current === item.value && <Check color={gold[400]} size={21} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {sheetMode === 'visibility' && (
            <>
              <View style={styles.sheetHeader}>
                <Typography variant="h3" color={theme.colors.foreground}>{t('bucket.visibility_title')}</Typography>
              </View>
              <View style={styles.sheetOptions}>
                {([
                  { value: 'public' as const, title: t('albums.visibility_public', { defaultValue: 'Público' }), subtitle: t('albums.visibility_public_sub', { defaultValue: 'Cualquier persona puede ver este álbum' }), icon: Eye },
                  { value: 'followers' as const, title: t('albums.visibility_followers', { defaultValue: 'Seguidores' }), subtitle: t('albums.visibility_followers_sub', { defaultValue: 'Solo tus seguidores pueden verlo' }), icon: Users },
                  { value: 'private' as const, title: t('albums.visibility_private', { defaultValue: 'Privado' }), subtitle: t('albums.visibility_private_sub', { defaultValue: 'Solo tú y los colaboradores podéis verlo' }), icon: Lock },
                ]).map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Pressable key={item.value} style={styles.sheetOption} onPress={() => onChangeVisibility(item.value)}>
                      <View style={styles.sheetIcon}><IconComponent color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{item.title}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{item.subtitle}</Typography>
                      </View>
                      {albumVisibility === item.value && <Check color={gold[400]} size={21} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {sheetMode === 'cover' && (
            <>
              <View style={styles.sheetHeader}>
                                  <Typography variant="h3" color={theme.colors.foreground}>{t('albums.options_cover_title', { defaultValue: 'Foto de portada' })}</Typography>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
                  <CoverColorPicker
                    onSelectGradient={(colors, id) => {
                      onClose();
                      onSelectCoverGradient?.(colors, id);
                    }}
                    onSelectSolid={(hex) => {
                      onClose();
                      onSelectCoverSolid?.(hex);
                    }}
                  />
                </View>
                <View style={styles.sheetOptions}>
                  <SheetOption
                    icon={<ImageIcon color={gold[400]} size={21} />}
                    title={t('albums.options_cover_gallery', { defaultValue: 'Elegir de la galería' })}
                    subtitle={t('albums.options_cover_gallery_sub', { defaultValue: 'Selecciona una foto y recórtala a tu gusto' })}
                    onPress={() => {
                      onClose();
                      onPickGallery?.();
                    }}
                  />

                  <SheetOption
                    icon={<Camera color={gold[400]} size={21} />}
                    title={t('albums.options_cover_camera', { defaultValue: 'Hacer foto con la cámara' })}
                    subtitle={t('albums.options_cover_camera_sub', { defaultValue: 'Toma una foto al instante con la cámara' })}
                    onPress={() => {
                      onClose();
                      onTakePhoto?.();
                    }}
                  />

                  <SheetOption
                    icon={<Link2 color={gold[400]} size={21} />}
                    title={t('albums.options_cover_link', { defaultValue: 'Añadir con enlace de Google / Web' })}
                    subtitle={t('albums.options_cover_link_sub', { defaultValue: 'Pega un enlace o foto copiada de internet' })}
                    onPress={() => {
                      onClose();
                      onOpenCoverLink?.();
                    }}
                  />

                  {hasCustomCover && (
                    <>
                      <SheetOption
                        icon={<Crop color={gold[400]} size={21} />}
                        title={t('albums.options_cover_recrop', { defaultValue: 'Reajustar recorte actual' })}
                        subtitle={t('albums.options_cover_recrop_sub', { defaultValue: 'Ajusta o reencuadra la foto actual' })}
                        onPress={() => {
                          onClose();
                          onRecropCover?.();
                        }}
                      />

                      <SheetOption
                        icon={<Maximize2 color={gold[400]} size={21} />}
                        title={coverAspectRatio === '1:1' ? t('albums.options_cover_switch_widescreen', { defaultValue: 'Cambiar a Panorámica (16:9)' }) : t('albums.options_cover_switch_square', { defaultValue: 'Cambiar a Cuadrada (1:1)' })}
                        subtitle={coverAspectRatio === '1:1' ? t('albums.options_cover_widescreen_sub', { defaultValue: 'Formato horizontal panorámico' }) : t('albums.options_cover_square_sub', { defaultValue: 'Formato cuadrado 1:1' })}
                        onPress={() => {
                          onChangeCoverShape?.(coverAspectRatio === '1:1' ? '16:9' : '1:1');
                        }}
                      />

                      <SheetOption
                        icon={<Trash2 color={theme.colors.error} size={21} />}
                        title={t('albums.options_cover_remove', { defaultValue: 'Quitar foto de portada' })}
                        subtitle={t('albums.options_cover_remove_sub', { defaultValue: 'Volver al degradado predeterminado' })}
                      danger
                        onPress={() => {
                          onClose();
                          onRemoveCover?.();
                        }}
                        
                      />
                    </>
                  )}
                </View>
              </ScrollView>
            </>
          )}
          {sheetMode === 'status' && (
            <>
              <View style={styles.sheetHeader}>
                                  <Typography variant="h3" color={theme.colors.foreground}>{t('albums.options_status_title', { defaultValue: 'Estado del álbum' })}</Typography>
              </View>
              <View style={styles.sheetOptions}>
                <SheetOption
                  icon={<Lock color={gold[400]} size={21} />}
                  title={isAlbumClosed ? t('albums.options_reopen', { defaultValue: 'Reabrir álbum' }) : t('albums.options_close', { defaultValue: 'Cerrar álbum' })}
                  subtitle={
                    isAlbumClosed
                      ? t('albums.options_reopen_sub', { defaultValue: 'Permite volver a añadir tareas al álbum' })
                      : t('albums.options_close_sub', { defaultValue: 'Marca el álbum como cerrado y completado definitivamente' })
                  }
                  onPress={() => onToggleClose(!isAlbumClosed)}
                  
                />
              </View>
            </>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

function SheetOption({
  icon,
  title,
  subtitle,
  danger,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable style={[styles.sheetOption, danger && styles.dangerOption]} onPress={onPress}>
      <View style={styles.sheetIcon}>{icon}</View>
      <View style={styles.sheetOptionText}>
        <Typography variant="bodySemibold" color={danger ? theme.colors.error : undefined}>{title}</Typography>
        {subtitle ? <Typography variant="caption" color={theme.colors.foregroundMuted}>{subtitle}</Typography> : null}
      </View>
    </Pressable>
  );
}

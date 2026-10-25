import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Animated,
  BackHandler,
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
  X,
  Globe,
  Check,
  Tag as TagIcon,
  ChevronLeft,
  Image as ImageIcon,
  Link2,
  Crop,
  Maximize2,
  Sparkles,
} from 'lucide-react-native';
import { styles } from '../styles/album-detail.styles';
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
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.sheetHandle} />

          {sheetMode === 'menu' && (
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetHeaderText}>
                  {t('albums.options_title', { defaultValue: 'Opciones del álbum' })}
                </Text>
                <Pressable style={styles.sheetCloseBtn} onPress={onClose}>
                  <X color="#8F8F8F" size={20} />
                </Pressable>
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
                      icon={<Star color="#D4B13A" fill={isFav ? '#D4B13A' : 'transparent'} size={20} />}
                      title={isFav ? t('albums.options_unfav', { defaultValue: 'Quitar de favoritos' }) : t('albums.options_fav', { defaultValue: 'Marcar como favorito' })}
                      subtitle={isFav ? t('albums.options_unfav_sub', { defaultValue: 'Elimina este álbum de tu lista de favoritos' }) : t('albums.options_fav_sub', { defaultValue: 'Guarda este álbum en tus favoritos' })}
                      onPress={onToggleFavorite}
                    />
                  )}
                  {currentUserId && albumId !== 'unassigned' && !canEdit && onToggleSave && (
                    <SheetOption
                      icon={<Bookmark color="#D4B13A" fill={isSaved ? '#D4B13A' : 'transparent'} size={20} />}
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
                      icon={areAllCompleted ? <RotateCcw color="#D4B13A" size={20} /> : <CheckCircle2 color="#D4B13A" size={20} />}
                      title={areAllCompleted ? t('albums.options_mark_all_pending', { defaultValue: 'Marcar todas como pendientes' }) : t('albums.options_mark_all_completed', { defaultValue: 'Marcar todas como completadas' })}
                      subtitle={areAllCompleted ? t('albums.options_mark_all_pending_sub', { defaultValue: 'Revertir estado de todas las tareas' }) : t('albums.options_mark_all_completed_sub', { defaultValue: 'Completa todas las tareas del álbum' })}
                      onPress={onToggleAllTasks}
                    />
                  )}
                  {!canEdit && (
                    <>
                      <SheetOption
                        icon={<FolderPlus color="#D4B13A" size={20} />}
                        title={t('albums.options_copy_profile', { defaultValue: 'Copiar álbum a mi perfil' })}
                        subtitle={t('albums.options_copy_profile_sub', { defaultValue: 'Crea una copia de este álbum y sus tareas en tu lista' })}
                        onPress={onCopyAlbum}
                      />
                      <SheetOption
                        icon={<ShareIcon color="#D4B13A" size={20} />}
                        title={t('albums.options_share', { defaultValue: 'Compartir álbum' })}
                        subtitle={t('albums.options_share_sub', { defaultValue: 'Envía este álbum a tus amigos' })}
                        onPress={onShare}
                      />
                    </>
                  )}
                  {!isOwner && currentUserId && albumId !== 'unassigned' && onReport && (
                    <SheetOption
                      icon={<Flag color="#EF4444" size={20} />}
                      title={t('albums.options_report', { defaultValue: 'Reportar álbum' })}
                      subtitle={t('albums.options_report_sub', { defaultValue: 'Avisa al administrador de contenido inapropiado' })}
                      titleStyle={{ color: '#EF4444' }}
                      iconStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
                      onPress={() => {
                        onClose();
                        onReport();
                      }}
                    />
                  )}
                  {canEdit && (
                    <>
                      <SheetOption
                        icon={<Camera color="#D4B13A" size={20} />}
                        title={t('albums.options_change_cover', { defaultValue: 'Cambiar portada' })}
                        subtitle={t('albums.options_change_cover_sub', { defaultValue: 'Elige foto de la galería, cámara o enlace web' })}
                        onPress={() => onSetSheetMode('cover')}
                      />
                      <SheetOption
                        icon={<Lock color="#D4B13A" size={20} />}
                        title={isAlbumClosed ? t('albums.options_reopen', { defaultValue: 'Reabrir álbum' }) : t('albums.options_close', { defaultValue: 'Cerrar álbum para siempre' })}
                        subtitle={isAlbumClosed ? t('albums.options_reopen_sub', { defaultValue: 'Permite volver a añadir tareas al álbum' }) : t('albums.options_close_sub', { defaultValue: 'Marca el álbum como cerrado y completado definitivamente' })}
                        onPress={() => onToggleClose(!isAlbumClosed)}
                      />
                      <SheetOption
                        icon={<Flag color="#D4B13A" size={20} />}
                        title={t('albums.options_change_priority', { defaultValue: 'Cambiar prioridad' })}
                        subtitle={albumPriority === 'high' || albumPriority === 'urgent' ? t('common.high', { defaultValue: 'Prioridad Alta' }) : albumPriority === 'low' ? t('common.low', { defaultValue: 'Prioridad Baja' }) : t('common.medium', { defaultValue: 'Prioridad Media' })}
                        onPress={() => onSetSheetMode('priority')}
                      />
                      <SheetOption
                        icon={<Eye color="#D4B13A" size={20} />}
                        title={t('albums.options_change_visibility', { defaultValue: 'Cambiar visibilidad' })}
                        subtitle={albumVisibility === 'public' ? t('albums.visibility_public', { defaultValue: 'Público actualmente' }) : albumVisibility === 'followers' ? t('albums.visibility_followers', { defaultValue: 'Solo amigos actualmente' }) : t('albums.visibility_private', { defaultValue: 'Privado actualmente' })}
                        onPress={() => onSetSheetMode('visibility')}
                      />
                      <SheetOption
                        icon={<Users color="#D4B13A" size={20} />}
                        title={t('albums.options_collaborators', { defaultValue: 'Gestionar colaboradores' })}
                        subtitle={t('albums.options_collaborators_sub', { defaultValue: 'Invita o quita personas de este álbum' })}
                        onPress={onOpenCollaborators}
                      />
                      {onOpenTags && (
                        <SheetOption
                          icon={<TagIcon color="#D4B13A" size={20} />}
                          title={t('albums.options_tags', { defaultValue: 'Gestionar etiquetas' })}
                          subtitle={t('albums.options_tags_sub', { defaultValue: 'Añade o quita etiquetas del álbum y sus tareas' })}
                          onPress={onOpenTags}
                        />
                      )}
                      <SheetOption
                        icon={<Pencil color="#D4B13A" size={20} />}
                        title={t('albums.options_edit_full', { defaultValue: 'Editar detalles completos' })}
                        subtitle={t('albums.options_edit_full_sub', { defaultValue: 'Nombre, portada, privacidad y más' })}
                        onPress={onClose}
                      />
                    </>
                  )}
                  {isAdmin && onPromoteToCollection && (
                    <SheetOption
                      icon={<Sparkles color="#D4AF37" size={20} />}
                      title="Promocionar a Colección (Admin)"
                      subtitle="Publica este álbum en la pestaña Colecciones para todos"
                      onPress={() => {
                        onClose();
                        onPromoteToCollection();
                      }}
                    />
                  )}
                  {isOwner && (
                    <SheetOption
                      icon={<Trash2 color="#EF4444" size={20} />}
                      title={t('albums.options_delete', { defaultValue: 'Eliminar álbum' })}
                      subtitle={t('albums.options_delete_sub', { defaultValue: 'Las tareas se moverán a Sin álbum' })}
                      titleStyle={{ color: '#EF4444' }}
                      iconStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
                      onPress={onConfirmDelete}
                      noBorder
                    />
                  )}
                  {isCollaborator && (
                    <SheetOption
                      icon={<Trash2 color="#EF4444" size={20} />}
                      title={t('albums.options_leave', { defaultValue: 'Dejar de colaborar' })}
                      subtitle={t('albums.options_leave_sub', { defaultValue: 'El álbum dejará de aparecer en tu lista' })}
                      titleStyle={{ color: '#EF4444' }}
                      iconStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
                      onPress={onConfirmLeave}
                      noBorder
                    />
                  )}
                </View>
              </ScrollView>
            </>
          )}

          {sheetMode === 'priority' && (
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetHeaderText}>
                  {t('albums.options_change_priority', { defaultValue: 'Prioridad del álbum' })}
                </Text>
                <Pressable style={styles.sheetCloseBtn} onPress={() => onSetSheetMode('menu')}>
                  <X color="#8F8F8F" size={20} />
                </Pressable>
              </View>
              <View style={styles.sheetOptions}>
                {[
                  { key: 'high', label: t('common.high', { defaultValue: 'Prioridad Alta' }), color: '#EF4444' },
                  { key: 'medium', label: t('common.medium', { defaultValue: 'Prioridad Media' }), color: '#D4B13A' },
                  { key: 'low', label: t('common.low', { defaultValue: 'Prioridad Baja' }), color: '#10B981' },
                ].map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => onChangePriority(opt.key as any)}
                    style={styles.sheetOption}
                  >
                    <View style={[styles.sheetIconBox, { backgroundColor: `${opt.color}15` }]}>
                      <Flag color={opt.color} size={20} />
                    </View>
                    <View style={styles.sheetOptionTexts}>
                      <Text style={[styles.sheetOptionTitle, { color: opt.color }]}>{opt.label}</Text>
                    </View>
                    {albumPriority === opt.key && <Check color="#D4B13A" size={18} />}
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {sheetMode === 'visibility' && (
            <>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetHeaderText}>
                  {t('albums.options_change_visibility', { defaultValue: 'Visibilidad del álbum' })}
                </Text>
                <Pressable style={styles.sheetCloseBtn} onPress={() => onSetSheetMode('menu')}>
                  <X color="#8F8F8F" size={20} />
                </Pressable>
              </View>
              <View style={styles.sheetOptions}>
                {[
                  { key: 'public', label: t('albums.visibility_public', { defaultValue: 'Público' }), sub: t('albums.visibility_public_sub', { defaultValue: 'Cualquier persona puede ver este álbum' }), icon: <Eye color="#D4B13A" size={20} /> },
                  { key: 'followers', label: t('albums.visibility_followers', { defaultValue: 'Seguidores' }), sub: t('albums.visibility_followers_sub', { defaultValue: 'Solo tus seguidores pueden verlo' }), icon: <Users color="#D4B13A" size={20} /> },
                  { key: 'private', label: t('albums.visibility_private', { defaultValue: 'Privado' }), sub: t('albums.visibility_private_sub', { defaultValue: 'Solo tú y los colaboradores podéis verlo' }), icon: <Lock color="#D4B13A" size={20} /> },
                ].map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => onChangeVisibility(opt.key as any)}
                    style={styles.sheetOption}
                  >
                    <View style={styles.sheetIconBox}>{opt.icon}</View>
                    <View style={styles.sheetOptionTexts}>
                      <Text style={styles.sheetOptionTitle}>{opt.label}</Text>
                      <Text style={styles.sheetOptionSubtitle}>{opt.sub}</Text>
                    </View>
                    {albumVisibility === opt.key && <Check color="#D4B13A" size={18} />}
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {sheetMode === 'cover' && (
            <>
              <View style={styles.sheetHeader}>
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => onSetSheetMode('menu')}
                  hitSlop={8}
                >
                  <ChevronLeft color="#D4B13A" size={22} />
                  <Text style={styles.sheetHeaderText}>
                    {t('albums.options_cover_title', { defaultValue: 'Foto de portada' })}
                  </Text>
                </Pressable>
                <Pressable style={styles.sheetCloseBtn} onPress={onClose}>
                  <X color="#8F8F8F" size={20} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.sheetOptions}>
                  <SheetOption
                    icon={<ImageIcon color="#D4B13A" size={20} />}
                    title={t('albums.options_cover_gallery', { defaultValue: 'Elegir de la galería' })}
                    subtitle={t('albums.options_cover_gallery_sub', { defaultValue: 'Selecciona una foto y recórtala a tu gusto' })}
                    onPress={() => {
                      onClose();
                      onPickGallery?.();
                    }}
                  />

                  <SheetOption
                    icon={<Camera color="#D4B13A" size={20} />}
                    title={t('albums.options_cover_camera', { defaultValue: 'Hacer foto con la cámara' })}
                    subtitle={t('albums.options_cover_camera_sub', { defaultValue: 'Toma una foto al instante con la cámara' })}
                    onPress={() => {
                      onClose();
                      onTakePhoto?.();
                    }}
                  />

                  <SheetOption
                    icon={<Link2 color="#D4B13A" size={20} />}
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
                        icon={<Crop color="#D4B13A" size={20} />}
                        title={t('albums.options_cover_recrop', { defaultValue: 'Reajustar recorte actual' })}
                        subtitle={t('albums.options_cover_recrop_sub', { defaultValue: 'Ajusta o reencuadra la foto actual' })}
                        onPress={() => {
                          onClose();
                          onRecropCover?.();
                        }}
                      />

                      <SheetOption
                        icon={<Maximize2 color="#D4B13A" size={20} />}
                        title={coverAspectRatio === '1:1' ? 'Cambiar a Panorámica (16:9)' : 'Cambiar a Cuadrada (1:1)'}
                        subtitle={coverAspectRatio === '1:1' ? 'Formato horizontal panorámico' : 'Formato cuadrado 1:1'}
                        onPress={() => {
                          onChangeCoverShape?.(coverAspectRatio === '1:1' ? '16:9' : '1:1');
                        }}
                      />

                      <SheetOption
                        icon={<Trash2 color="#EF4444" size={20} />}
                        title={t('albums.options_cover_remove', { defaultValue: 'Quitar foto de portada' })}
                        subtitle={t('albums.options_cover_remove_sub', { defaultValue: 'Volver al degradado predeterminado' })}
                        titleStyle={{ color: '#EF4444' }}
                        iconStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
                        onPress={() => {
                          onClose();
                          onRemoveCover?.();
                        }}
                        noBorder
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
                <Pressable
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => onSetSheetMode('menu')}
                  hitSlop={8}
                >
                  <ChevronLeft color="#D4B13A" size={22} />
                  <Text style={styles.sheetHeaderText}>
                    {t('albums.options_status_title', { defaultValue: 'Estado del álbum' })}
                  </Text>
                </Pressable>
                <Pressable style={styles.sheetCloseBtn} onPress={onClose}>
                  <X color="#8F8F8F" size={20} />
                </Pressable>
              </View>
              <View style={styles.sheetOptions}>
                <SheetOption
                  icon={<Lock color="#D4B13A" size={20} />}
                  title={isAlbumClosed ? t('albums.options_reopen', { defaultValue: 'Reabrir álbum' }) : t('albums.options_close', { defaultValue: 'Cerrar álbum' })}
                  subtitle={
                    isAlbumClosed
                      ? t('albums.options_reopen_sub', { defaultValue: 'Permite volver a añadir tareas al álbum' })
                      : t('albums.options_close_sub', { defaultValue: 'Marca el álbum como cerrado y completado definitivamente' })
                  }
                  onPress={() => onToggleClose(!isAlbumClosed)}
                  noBorder
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
  titleStyle,
  iconStyle,
  onPress,
  noBorder,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  titleStyle?: any;
  iconStyle?: any;
  onPress: () => void;
  noBorder?: boolean;
}) {
  return (
    <Pressable
      style={[styles.sheetOption, noBorder && { borderBottomWidth: 0 }]}
      onPress={onPress}
    >
      <View style={[styles.sheetIconBox, iconStyle]}>{icon}</View>
      <View style={styles.sheetOptionTexts}>
        <Text style={[styles.sheetOptionTitle, titleStyle]}>{title}</Text>
        <Text style={styles.sheetOptionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

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
} from 'lucide-react-native';
import { styles } from '../styles/album-detail.styles';

type SheetMode = 'menu' | 'visibility' | 'priority' | 'status' | 'cover';

interface AlbumOptionsSheetProps {
  visible: boolean;
  sheetMode: SheetMode;
  sheetTranslateY: Animated.Value;
  isFav: boolean;
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
  onToggleFavorite: () => void;
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
  onConfirmDelete: () => void;
  onConfirmLeave: () => void;
}

export function AlbumOptionsSheet({
  visible,
  sheetMode,
  sheetTranslateY,
  isFav,
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
  onConfirmDelete,
  onConfirmLeave,
}: AlbumOptionsSheetProps) {
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
                <Text style={styles.sheetHeaderText}>Opciones del álbum</Text>
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
                  {currentUserId && albumId !== 'unassigned' && (
                    <SheetOption
                      icon={<Star color="#D4B13A" fill={isFav ? '#D4B13A' : 'transparent'} size={20} />}
                      title={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      subtitle={isFav ? 'Elimina este álbum de tu lista de favoritos' : 'Guarda este álbum en tus favoritos'}
                      onPress={onToggleFavorite}
                    />
                  )}
                  {canEdit && tasksLength > 0 && (
                    <SheetOption
                      icon={areAllCompleted ? <RotateCcw color="#D4B13A" size={20} /> : <CheckCircle2 color="#D4B13A" size={20} />}
                      title={areAllCompleted ? 'Marcar todas como pendientes' : 'Marcar todas como completadas'}
                      subtitle={areAllCompleted ? 'Revertir estado de todas las tareas' : 'Completa todas las tareas del álbum'}
                      onPress={onToggleAllTasks}
                    />
                  )}
                  {!canEdit && (
                    <>
                      <SheetOption
                        icon={<FolderPlus color="#D4B13A" size={20} />}
                        title="Copiar álbum a mi perfil"
                        subtitle="Crea una copia de este álbum y sus tareas en tu lista"
                        onPress={onCopyAlbum}
                      />
                      <SheetOption
                        icon={<ShareIcon color="#D4B13A" size={20} />}
                        title="Compartir álbum"
                        subtitle="Envía este álbum a tus amigos"
                        onPress={onShare}
                      />
                    </>
                  )}
                  {canEdit && (
                    <>
                      <SheetOption
                        icon={<Camera color="#D4B13A" size={20} />}
                        title="Cambiar portada"
                        subtitle="Elige foto de la galería, cámara o enlace web"
                        onPress={() => onSetSheetMode('cover')}
                      />
                      <SheetOption
                        icon={<Lock color="#D4B13A" size={20} />}
                        title={isAlbumClosed ? 'Reabrir álbum' : 'Cerrar álbum para siempre'}
                        subtitle={isAlbumClosed ? 'Permite volver a añadir tareas al álbum' : 'Marca el álbum como cerrado y completado definitivamente'}
                        onPress={() => onToggleClose(!isAlbumClosed)}
                      />
                      <SheetOption
                        icon={<Flag color="#D4B13A" size={20} />}
                        title="Cambiar prioridad"
                        subtitle={albumPriority === 'high' || albumPriority === 'urgent' ? 'Prioridad Alta' : albumPriority === 'low' ? 'Prioridad Baja' : 'Prioridad Media'}
                        onPress={() => onSetSheetMode('priority')}
                      />
                      <SheetOption
                        icon={<Eye color="#D4B13A" size={20} />}
                        title="Cambiar visibilidad"
                        subtitle={albumVisibility === 'public' ? 'Público actualmente' : albumVisibility === 'followers' ? 'Solo amigos actualmente' : 'Privado actualmente'}
                        onPress={() => onSetSheetMode('visibility')}
                      />
                      <SheetOption
                        icon={<Users color="#D4B13A" size={20} />}
                        title="Gestionar colaboradores"
                        subtitle="Invita o quita personas de este álbum"
                        onPress={onOpenCollaborators}
                      />
                      {onOpenTags && (
                        <SheetOption
                          icon={<TagIcon color="#D4B13A" size={20} />}
                          title="Gestionar etiquetas"
                          subtitle="Añade o quita etiquetas del álbum y sus tareas"
                          onPress={onOpenTags}
                        />
                      )}
                      <SheetOption
                        icon={<Pencil color="#D4B13A" size={20} />}
                        title="Editar detalles completos"
                        subtitle="Nombre, portada, privacidad y más"
                        onPress={onClose}
                      />
                    </>
                  )}
                  {isOwner && (
                    <SheetOption
                      icon={<Trash2 color="#EF4444" size={20} />}
                      title="Eliminar álbum"
                      subtitle="Las tareas se moverán a Sin álbum"
                      titleStyle={{ color: '#EF4444' }}
                      iconStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}
                      onPress={onConfirmDelete}
                      noBorder
                    />
                  )}
                  {isCollaborator && (
                    <SheetOption
                      icon={<Trash2 color="#EF4444" size={20} />}
                      title="Dejar de colaborar"
                      subtitle="El álbum dejará de aparecer en tu lista"
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
                <Text style={styles.sheetHeaderText}>Prioridad del álbum</Text>
                <Pressable style={styles.sheetCloseBtn} onPress={() => onSetSheetMode('menu')}>
                  <X color="#8F8F8F" size={20} />
                </Pressable>
              </View>
              <View style={styles.sheetOptions}>
                {[
                  { key: 'high', label: 'Prioridad Alta', color: '#EF4444' },
                  { key: 'medium', label: 'Prioridad Media', color: '#D4B13A' },
                  { key: 'low', label: 'Prioridad Baja', color: '#10B981' },
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
                <Text style={styles.sheetHeaderText}>Visibilidad del álbum</Text>
                <Pressable style={styles.sheetCloseBtn} onPress={() => onSetSheetMode('menu')}>
                  <X color="#8F8F8F" size={20} />
                </Pressable>
              </View>
              <View style={styles.sheetOptions}>
                {[
                  { key: 'public', label: 'Público', sub: 'Cualquier persona puede ver este álbum', icon: <Eye color="#D4B13A" size={20} /> },
                  { key: 'followers', label: 'Seguidores', sub: 'Solo tus seguidores pueden verlo', icon: <Users color="#D4B13A" size={20} /> },
                  { key: 'private', label: 'Privado', sub: 'Solo tú y los colaboradores podéis verlo', icon: <Lock color="#D4B13A" size={20} /> },
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
                  <Text style={styles.sheetHeaderText}>Foto de portada</Text>
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
                    title="Elegir de la galería"
                    subtitle="Selecciona una foto y recórtala a tu gusto"
                    onPress={() => {
                      onClose();
                      onPickGallery?.();
                    }}
                  />

                  <SheetOption
                    icon={<Camera color="#D4B13A" size={20} />}
                    title="Hacer foto con la cámara"
                    subtitle="Toma una foto al instante con la cámara"
                    onPress={() => {
                      onClose();
                      onTakePhoto?.();
                    }}
                  />

                  <SheetOption
                    icon={<Link2 color="#D4B13A" size={20} />}
                    title="Añadir con enlace de Google / Web"
                    subtitle="Pega un enlace o foto copiada de internet"
                    onPress={() => {
                      onClose();
                      onOpenCoverLink?.();
                    }}
                  />

                  {hasCustomCover && (
                    <>
                      <SheetOption
                        icon={<Crop color="#D4B13A" size={20} />}
                        title="Reajustar recorte actual"
                        subtitle="Ajusta o reencuadra la foto actual"
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
                        title="Quitar foto de portada"
                        subtitle="Volver al degradado predeterminado"
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
                  <Text style={styles.sheetHeaderText}>Estado del álbum</Text>
                </Pressable>
                <Pressable style={styles.sheetCloseBtn} onPress={onClose}>
                  <X color="#8F8F8F" size={20} />
                </Pressable>
              </View>
              <View style={styles.sheetOptions}>
                <SheetOption
                  icon={<Lock color="#D4B13A" size={20} />}
                  title={isAlbumClosed ? 'Reabrir álbum' : 'Cerrar álbum'}
                  subtitle={
                    isAlbumClosed
                      ? 'Permite volver a añadir tareas al álbum'
                      : 'Marca el álbum como cerrado y completado definitivamente'
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

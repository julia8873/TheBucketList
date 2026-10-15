import React from 'react';
import {
  View, Text, Pressable, Modal, ScrollView, Animated,
} from 'react-native';
import {
  Star, RotateCcw, CheckCircle2, FolderPlus, Share as ShareIcon,
  Camera, Lock, Flag, Eye, Users, Pencil, Trash2, X,
  Globe, Check,
} from 'lucide-react-native';
import { styles } from './AlbumDetail.styles';

type SheetMode = 'menu' | 'visibility' | 'priority' | 'status';

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
  onClose: () => void;
  onToggleFavorite: () => void;
  onToggleAllTasks: () => void;
  onCopyAlbum: () => void;
  onShare: () => void;
  onPickCover: () => void;
  onToggleClose: (close: boolean) => void;
  onChangePriority: (p: 'low' | 'medium' | 'high') => void;
  onChangeVisibility: (v: 'public' | 'followers' | 'private') => void;
  onSetSheetMode: (mode: SheetMode) => void;
  onOpenCollaborators: () => void;
  onConfirmDelete: () => void;
  onConfirmLeave: () => void;
}

export function AlbumOptionsSheet({
  visible, sheetMode, sheetTranslateY,
  isFav, isOwner, isCollaborator, canEdit,
  areAllCompleted, isAlbumClosed, albumVisibility, albumPriority,
  albumIsClosed, tasksLength, currentUserId, albumId,
  onClose, onToggleFavorite, onToggleAllTasks, onCopyAlbum,
  onShare, onPickCover, onToggleClose, onChangePriority,
  onChangeVisibility, onSetSheetMode, onOpenCollaborators,
  onConfirmDelete, onConfirmLeave,
}: AlbumOptionsSheetProps) {
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
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.sheetOptions}>
                  {currentUserId && albumId !== 'unassigned' && (
                    <SheetOption icon={<Star color="#D4B13A" fill={isFav ? '#D4B13A' : 'transparent'} size={20} />} title={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'} subtitle={isFav ? 'Elimina este álbum de tu lista de favoritos' : 'Guarda este álbum en tus favoritos'} onPress={onToggleFavorite} />
                  )}
                  {canEdit && tasksLength > 0 && (
                    <SheetOption icon={areAllCompleted ? <RotateCcw color="#D4B13A" size={20} /> : <CheckCircle2 color="#D4B13A" size={20} />} title={areAllCompleted ? 'Marcar todas como pendientes' : 'Marcar todas como completadas'} subtitle={areAllCompleted ? 'Revertir estado de todas las tareas' : 'Completa todas las tareas del álbum'} onPress={onToggleAllTasks} />
                  )}
                  {!canEdit && (
                    <>
                      <SheetOption icon={<FolderPlus color="#D4B13A" size={20} />} title="Copiar álbum a mi perfil" subtitle="Crea una copia de este álbum y sus tareas en tu lista" onPress={onCopyAlbum} />
                      <SheetOption icon={<ShareIcon color="#D4B13A" size={20} />} title="Compartir álbum" subtitle="Envía este álbum a tus amigos" onPress={onShare} />
                    </>
                  )}
                  {canEdit && (
                    <>
                      <SheetOption icon={<Camera color="#D4B13A" size={20} />} title="Cambiar portada" subtitle="Elige una foto de tu galería" onPress={onPickCover} />
                      <SheetOption icon={<Lock color="#D4B13A" size={20} />} title={isAlbumClosed ? 'Reabrir álbum' : 'Cerrar álbum para siempre'} subtitle={isAlbumClosed ? 'Permite volver a añadir tareas al álbum' : 'Marca el álbum como cerrado y completado definitivamente'} onPress={() => onToggleClose(!isAlbumClosed)} />
                      <SheetOption icon={<Flag color="#D4B13A" size={20} />} title="Cambiar prioridad" subtitle={albumPriority === 'high' || albumPriority === 'urgent' ? 'Prioridad Alta' : albumPriority === 'low' ? 'Prioridad Baja' : 'Prioridad Media'} onPress={() => onSetSheetMode('priority')} />
                      <SheetOption icon={<Eye color="#D4B13A" size={20} />} title="Cambiar visibilidad" subtitle={albumVisibility === 'public' ? 'Público actualmente' : albumVisibility === 'followers' ? 'Solo amigos actualmente' : 'Privado actualmente'} onPress={() => onSetSheetMode('visibility')} />
                      <SheetOption icon={<Users color="#D4B13A" size={20} />} title="Gestionar colaboradores" subtitle="Invita o quita personas de este álbum" onPress={onOpenCollaborators} />
                      <SheetOption icon={<Pencil color="#D4B13A" size={20} />} title="Editar detalles completos" subtitle="Nombre, portada, privacidad y más" onPress={onClose} />
                    </>
                  )}
                  {isOwner && (
                    <SheetOption icon={<Trash2 color="#EF4444" size={20} />} title="Eliminar álbum" subtitle="Las tareas se moverán a Sin álbum" titleStyle={{ color: '#EF4444' }} iconStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }} onPress={onConfirmDelete} noBorder />
                  )}
                  {isCollaborator && (
                    <SheetOption icon={<Trash2 color="#EF4444" size={20} />} title="Dejar de colaborar" subtitle="El álbum dejará de aparecer en tu lista" titleStyle={{ color: '#EF4444' }} iconStyle={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }} onPress={onConfirmLeave} noBorder />
                  )}
                </View>
              </ScrollView>
            </>
          )}

          {sheetMode === 'visibility' && (
            <>
              <SheetModeHeader title="Visibilidad del álbum" onClose={onClose} />
              <View style={styles.sheetOptions}>
                {([
                  { value: 'public', title: 'Público', subtitle: 'Visible para toda la comunidad', icon: Globe },
                  { value: 'followers', title: 'Solo amigos', subtitle: 'Visible solo para tus seguidores', icon: Users },
                  { value: 'private', title: 'Privado', subtitle: 'Solo tú y los colaboradores que invites', icon: Lock },
                ] as const).map((item) => {
                  const IconComponent = item.icon;
                  const isSelected = albumVisibility === item.value;
                  return (
                    <Pressable key={item.value} style={styles.sheetOption} onPress={() => onChangeVisibility(item.value)}>
                      <View style={[styles.sheetIconBox, isSelected && { backgroundColor: 'rgba(212, 177, 58, 0.2)' }]}>
                        <IconComponent color={isSelected ? '#D4B13A' : '#8F8F8F'} size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={[styles.sheetOptionTitle, isSelected && { color: '#D4B13A' }]}>{item.title}</Text>
                        <Text style={styles.sheetOptionSubtitle}>{item.subtitle}</Text>
                      </View>
                      {isSelected && <Check color="#D4B13A" size={20} strokeWidth={2.5} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {sheetMode === 'priority' && (
            <>
              <SheetModeHeader title="Prioridad del álbum" onClose={onClose} />
              <View style={styles.sheetOptions}>
                {([
                  { value: 'high' as const, title: 'Alta', subtitle: 'Máxima prioridad para este álbum', color: '#EF4444' },
                  { value: 'medium' as const, title: 'Media', subtitle: 'Prioridad normal', color: '#EAB308' },
                  { value: 'low' as const, title: 'Baja', subtitle: 'Prioridad secundaria', color: '#10B981' },
                ]).map((item) => {
                  const isSelected = (albumPriority ?? 'medium') === item.value;
                  return (
                    <Pressable key={item.value} style={styles.sheetOption} onPress={() => onChangePriority(item.value)}>
                      <View style={[styles.sheetIconBox, { backgroundColor: `${item.color}20` }]}>
                        <Flag color={item.color} size={20} fill={isSelected ? item.color : 'none'} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={[styles.sheetOptionTitle, isSelected && { color: item.color }]}>{item.title}</Text>
                        <Text style={styles.sheetOptionSubtitle}>{item.subtitle}</Text>
                      </View>
                      {isSelected && <Check color="#D4B13A" size={20} strokeWidth={2.5} />}
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {sheetMode === 'status' && (
            <>
              <SheetModeHeader title="Estado del álbum" onClose={onClose} />
              <View style={styles.sheetOptions}>
                <Pressable style={styles.sheetOption} onPress={() => onToggleClose(false)}>
                  <View style={[styles.sheetIconBox, !albumIsClosed && { backgroundColor: 'rgba(212, 177, 58, 0.2)' }]}>
                    <RotateCcw color={!albumIsClosed ? '#D4B13A' : '#8F8F8F'} size={20} />
                  </View>
                  <View style={styles.sheetOptionTexts}>
                    <Text style={[styles.sheetOptionTitle, !albumIsClosed && { color: '#D4B13A' }]}>Abierto (En progreso / Completado)</Text>
                    <Text style={styles.sheetOptionSubtitle}>El álbum permanece activo y se pueden seguir completando o añadiendo tareas</Text>
                  </View>
                  {!albumIsClosed && <Check color="#D4B13A" size={20} strokeWidth={2.5} />}
                </Pressable>
                <Pressable style={styles.sheetOption} onPress={() => onToggleClose(true)}>
                  <View style={[styles.sheetIconBox, albumIsClosed && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <Lock color={albumIsClosed ? '#EF4444' : '#8F8F8F'} size={20} />
                  </View>
                  <View style={styles.sheetOptionTexts}>
                    <Text style={[styles.sheetOptionTitle, albumIsClosed && { color: '#EF4444' }]}>Cerrar álbum (Completado para siempre)</Text>
                    <Text style={styles.sheetOptionSubtitle}>El álbum se marca como cerrado definitivamente</Text>
                  </View>
                  {albumIsClosed && <Check color="#EF4444" size={20} strokeWidth={2.5} />}
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function SheetModeHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.sheetHeader}>
      <Text style={styles.sheetHeaderText}>{title}</Text>
      <Pressable style={styles.sheetCloseBtn} onPress={onClose}>
        <X color="#8F8F8F" size={20} />
      </Pressable>
    </View>
  );
}

interface SheetOptionProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  titleStyle?: object;
  iconStyle?: object;
  noBorder?: boolean;
}

function SheetOption({ icon, title, subtitle, onPress, titleStyle, iconStyle, noBorder }: SheetOptionProps) {
  return (
    <Pressable style={[styles.sheetOption, noBorder && { borderBottomWidth: 0 }]} onPress={onPress}>
      <View style={[styles.sheetIconBox, iconStyle]}>{icon}</View>
      <View style={styles.sheetOptionTexts}>
        <Text style={[styles.sheetOptionTitle, titleStyle]}>{title}</Text>
        <Text style={styles.sheetOptionSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

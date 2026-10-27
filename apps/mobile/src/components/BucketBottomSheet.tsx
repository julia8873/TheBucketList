import React, { useState } from 'react';
import { Modal, View, Pressable, Animated, ActivityIndicator, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useTranslation } from '@bucketlist/shared';
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
  onOpenCollaborationSettings?: () => void;
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
  sheetVisible, sheetMode, sheetTranslateY, closeSheet, theme, isOwner, canEdit, isCollaborator, isFavorite, onToggleFavorite, isSaved, onToggleSave, onLeaveCollaboration, onOpenCollaborationSettings, onReport, uploadPhotos, uploadCover, pickAndUploadCover, takePhotoAndUploadCover, openCoverLinkModal, recropCurrentCover, removeCover, loadAlbums, user, copyBucket, id, handleDelete, bucket, handleChangeStatus, handleChangeVisibility, handleChangeCategory, handleChangePriority, setSheetMode, albumsLoading, toggleAlbum, removeAllAlbums, albums, bucketAlbums, categories
}: BucketBottomSheetProps) {
  const { t } = useTranslation();
  const [albumSearchQuery, setAlbumSearchQuery] = useState('');
  const visibilityLabel = (v: string) => {
    switch (v) {
      case 'public': return t('bucket.visibility_public');
      case 'private': return t('bucket.visibility_private');
      case 'followers': return t('bucket.visibility_followers');
      default: return v;
    }
  };

  const priorityLabel = (p: string) => {
    switch (p) {
      case 'high': return t('bucket.priority_high');
      case 'low': return t('bucket.priority_low');
      case 'medium':
      default: return t('bucket.priority_medium');
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
                <Typography variant="h3" color={theme.colors.foreground}>{t('bucket.sheet_options_title')}</Typography>
                <Pressable style={styles.sheetClose} onPress={() => closeSheet()}>
                  <X color={theme.colors.foregroundMuted} size={20} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
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
                          {isFavorite ? t('bucket.unfavorite') : t('bucket.favorite')}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>
                          {isFavorite ? t('bucket.unfavorite_desc') : t('bucket.favorite_desc')}
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
                          {isSaved ? t('bucket.unsave') : t('bucket.save_task')}
                        </Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>
                          {isSaved ? t('bucket.unsave_desc') : t('bucket.save_desc')}
                        </Typography>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable style={styles.sheetOption} onPress={() => void uploadPhotos()}>
                      <View style={styles.sheetIcon}><Camera color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{t('bucket.upload_photos')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.upload_photos_desc')}</Typography>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable style={styles.sheetOption} onPress={() => setSheetMode('cover')}>
                      <View style={styles.sheetIcon}><ImageIcon color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{t('bucket.change_cover')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.change_cover_desc')}</Typography>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable style={styles.sheetOption} onPress={() => setSheetMode('priority')}>
                      <View style={styles.sheetIcon}><Flag color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{t('bucket.change_priority')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>
                          {t('bucket.priority_current', { priority: priorityLabel(bucket.priority) })}
                        </Typography>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable style={styles.sheetOption} onPress={() => void loadAlbums()}>
                      <View style={styles.sheetIcon}><FolderPlus color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{t('bucket.move_folders')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.move_folders_desc')}</Typography>
                      </View>
                    </Pressable>
                  )}

                  {isOwner && onOpenCollaborationSettings && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => closeSheet(onOpenCollaborationSettings)}
                    >
                      <View style={styles.sheetIcon}><Users color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{t('bucket.collaboration_settings')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>
                          {t('bucket.collaboration_settings_desc')}
                        </Typography>
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
                        <Typography variant="bodySemibold">{t('bucket.clone_task')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.clone_task_desc')}</Typography>
                      </View>
                    </Pressable>
                  )}

                  {!isOwner && user && onReport && (
                    <Pressable style={[styles.sheetOption, styles.dangerOption]} onPress={() => closeSheet(onReport)}>
                      <View style={styles.sheetIcon}><Flag color={theme.colors.error} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold" color={theme.colors.error}>{t('bucket.report_task')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.report_task_desc')}</Typography>
                      </View>
                    </Pressable>
                  )}

                  {isCollaborator && (
                    <Pressable style={[styles.sheetOption, styles.dangerOption]} onPress={onLeaveCollaboration}>
                      <View style={styles.sheetIcon}><LogOut color={theme.colors.error} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold" color={theme.colors.error}>{t('bucket.leave_collaboration')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.leave_collaboration_desc')}</Typography>
                      </View>
                    </Pressable>
                  )}

                  {isOwner && (
                    <Pressable style={[styles.sheetOption, styles.dangerOption]} onPress={handleDelete}>
                      <View style={styles.sheetIcon}><Trash2 color={theme.colors.error} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold" color={theme.colors.error}>{t('common.delete')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.delete_desc')}</Typography>
                      </View>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            </>
          )}

          {sheetMode === 'status' && (
            <>
              <View style={[styles.sheetHeader, { justifyContent: 'center' }]}>
                <Typography variant="h3" color={theme.colors.foreground}>{t('bucket.status_title')}</Typography>
              </View>
              <View style={styles.sheetOptions}>
                {([
                  { value: 'pending', title: t('bucket.status_pending'), subtitle: t('bucket.status_pending_desc'), icon: Circle },
                  { value: 'in_progress', title: t('bucket.status_in_progress'), subtitle: t('bucket.status_in_progress_desc'), icon: MoreHorizontal },
                  { value: 'completed', title: t('bucket.status_completed'), subtitle: t('bucket.status_completed_desc'), icon: CheckCircle2 },
                  { value: 'expired', title: t('bucket.status_expired'), subtitle: t('bucket.status_expired_desc'), icon: X },
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
                <Typography variant="h3" color={theme.colors.foreground}>{t('bucket.visibility_title')}</Typography>
              </View>
              <View style={styles.sheetOptions}>
                {([
                  { value: 'public', title: t('bucket.visibility_public'), subtitle: t('bucket.visibility_public_desc'), icon: Eye },
                  { value: 'followers', title: t('bucket.visibility_followers'), subtitle: t('bucket.visibility_followers_desc'), icon: Users },
                  { value: 'private', title: t('bucket.visibility_private'), subtitle: t('bucket.visibility_private_desc'), icon: Lock },
                ] as const).map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Pressable key={item.value} style={styles.sheetOption} onPress={() => void handleChangeVisibility(item.value)}>
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
                <Typography variant="h3" color={theme.colors.foreground}>{t('bucket.priority_title')}</Typography>
                <View style={{ width: 36 }} />
              </View>
              <View style={styles.sheetOptions}>
                {([
                  { value: 'high' as const, title: t('bucket.priority_high'), subtitle: t('bucket.priority_high_desc'), color: '#EF4444' },
                  { value: 'medium' as const, title: t('bucket.priority_medium'), subtitle: t('bucket.priority_medium_desc'), color: '#D4B13A' },
                  { value: 'low' as const, title: t('bucket.priority_low'), subtitle: t('bucket.priority_low_desc'), color: '#10B981' },
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
                <Typography variant="h3" color={theme.colors.foreground}>{t('bucket.select_folders_title')}</Typography>
                <View style={{ width: 36 }} />
              </View>
              {albumsLoading ? (
                <View style={styles.sheetLoading}><ActivityIndicator color={gold[400]} /></View>
              ) : (
                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  <View style={styles.sheetOptions}>
                    <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                      <TextInput
                        style={{
                          backgroundColor: theme.colors.background,
                          color: theme.colors.foreground,
                          padding: 12,
                          borderRadius: 12,
                          fontSize: 16,
                        }}
                        placeholder={t('bucket.search_folder_placeholder')}
                        placeholderTextColor={theme.colors.foregroundMuted}
                        value={albumSearchQuery}
                        onChangeText={setAlbumSearchQuery}
                      />
                    </View>
                    <Pressable style={styles.sheetOption} onPress={() => void removeAllAlbums()}>
                      <View style={styles.sheetIcon}><FolderOpen color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{t('bucket.no_folder')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.no_folder_desc')}</Typography>
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
                      <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.emptySheetText}>{t('bucket.no_folders_yet')}</Typography>
                    )}
                  </View>
                </ScrollView>
              )}
            </>
          )}
          {sheetMode === 'cover' && (
            <>
              <View style={styles.sheetHeader}>
                <Pressable style={styles.backSheetButton} onPress={() => setSheetMode('menu')}>
                  <ArrowLeft color={theme.colors.foreground} size={20} />
                </Pressable>
                <Typography variant="h3" color={theme.colors.foreground}>{t('bucket.cover_title')}</Typography>
                <View style={{ width: 36 }} />
              </View>
              <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.sheetOptions}>
                  <Pressable
                    style={styles.sheetOption}
                    onPress={() => {
                      closeSheet(() => void (pickAndUploadCover ? pickAndUploadCover() : uploadCover()));
                    }}
                  >
                    <View style={styles.sheetIcon}><ImageIcon color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">{t('bucket.cover_gallery')}</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.cover_gallery_desc')}</Typography>
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
                      <Typography variant="bodySemibold">{t('bucket.cover_camera')}</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.cover_camera_desc')}</Typography>
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
                      <Typography variant="bodySemibold">{t('bucket.cover_link')}</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.cover_link_desc')}</Typography>
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
                        <Typography variant="bodySemibold">{t('bucket.cover_recrop')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.cover_recrop_desc')}</Typography>
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
                        <Typography variant="bodySemibold" color={theme.colors.error}>{t('bucket.cover_remove')}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{t('bucket.cover_remove_desc')}</Typography>
                      </View>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

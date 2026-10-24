import React, { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  StatusBar,
  ScrollView,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Text,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, useTheme } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Star,
  Bell,
  Heart,
  MessageCircle,
  Plus,
  Link2,
  CheckCircle2,
  X,
  Bookmark,
} from 'lucide-react-native';
import { supabase } from '@/services/supabase';

import { BucketCover } from '@/components/BucketCover';
import { ItemTagsRow } from '@/components/ItemTagsRow';
import { SubtaskList } from '@/components/SubtaskList';
import { PhotoCropModal } from '@/components/PhotoCropModal';
import { BucketPhotoViewer } from '@/components/BucketPhotoViewer';
import { BucketBottomSheet } from '@/components/BucketBottomSheet';
import { ReportModal } from '@/components/ReportModal';
import { useReportContent } from '@/hooks/useBlockReport';
import { TaskMentionPickerSheet } from '@/components/TaskMentionPickerSheet';
import { TaskMentionList } from '@/components/TaskMentionList';
import { CollaboratorPickerSheet } from '@/components/CollaboratorPickerSheet';
import { NotificationSubscribersModal } from '@/components/NotificationSubscribersModal';
import { TaskCommentsModal } from '@/components/TaskCommentsModal';
import { ItemLikesModal } from '@/components/ItemLikesModal';
import { ItemCommentsSection } from '@/components/ItemCommentsSection';
import { ImageLinkModal } from '@/components/ImageLinkModal';
import { GoogleDriveModal } from '@/components/GoogleDriveModal';
import { TaskCollaborationSettingsModal } from '@/features/bucket-detail/components/TaskCollaborationSettingsModal';
import { TaskCollaborationViewerCard } from '@/features/bucket-detail/components/TaskCollaborationViewerCard';
import { openGoogleDriveLink } from '@/utils/driveAccess';
import { timeAgo } from '@/utils/timeAgo';

import { useBucketDetailState } from '@/features/bucket-detail/hooks/useBucketDetailState';
import {
  styles,
  SCREEN_WIDTH,
  COVER_HEIGHT,
} from '@/features/bucket-detail/styles/bucket-detail.styles';
import { BucketCollaboratorsRow } from '@/features/bucket-detail/components/BucketCollaboratorsRow';
import {
  BucketCounterSection,
  ProgressBar,
} from '@/features/bucket-detail/components/BucketCounterSection';
import { BucketDatePickerModal } from '@/features/bucket-detail/components/BucketDatePickerModal';
import { BucketLocationModal } from '@/features/bucket-detail/components/BucketLocationModal';
import { BucketMetaSection } from '@/features/bucket-detail/components/BucketMetaSection';
import { BucketPhotosSection } from '@/features/bucket-detail/components/BucketPhotosSection';
import { AddPhotoSheet } from '@/features/bucket-detail/components/AddPhotoSheet';
import { BucketThumbnailSelector } from '@/features/bucket-detail/components/BucketThumbnailSelector';
import { PhotoSortModal } from '@/features/bucket-detail/components/PhotoSortModal';
import { BucketHeaderBadges } from '@/features/bucket-detail/components/BucketHeaderBadges';
import { storageApi } from '@/services/api/storage';

export default function BucketDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const state = useBucketDetailState();
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsAutoFocus, setCommentsAutoFocus] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);

  // Al llegar desde una notificación de comentario (?openComments=1) se abre la hoja de comentarios
  const { openComments } = useLocalSearchParams<{ openComments?: string }>();
  const openedFromNotificationRef = useRef(false);
  useEffect(() => {
    if (!openComments || openedFromNotificationRef.current) return;
    openedFromNotificationRef.current = true;
    const t = setTimeout(() => setShowCommentsModal(true), 350);
    return () => clearTimeout(t);
  }, [openComments]);
  const [isSquareCover, setIsSquareCover] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const reportContent = useReportContent();

  useEffect(() => {
    if (!state.resolvedCover || state.resolvedCover.startsWith('preset:')) {
      setIsSquareCover(false);
      return;
    }
    const uri =
      state.resolvedCover.startsWith('http') ||
        state.resolvedCover.startsWith('file:') ||
        state.resolvedCover.startsWith('data:')
        ? state.resolvedCover
        : storageApi.getPublicUrl(state.resolvedCover);

    if (uri && !uri.startsWith('data:')) {
      RNImage.getSize(
        uri,
        (w, h) => {
          if (w && h) {
            setIsSquareCover(Math.abs(w / h - 1) < 0.25);
          }
        },
        () => setIsSquareCover(false)
      );
    }
  }, [state.resolvedCover]);

  const coverHeight = isSquareCover ? Math.min(SCREEN_WIDTH, 340) : COVER_HEIGHT;
  const coverTotalHeight = coverHeight + insets.top;

  if (state.isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={gold[400]} />
      </View>
    );
  }

  if (!state.bucket) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body" color={theme.colors.error}>
          Tarea no encontrada.
        </Typography>
      </View>
    );
  }

  const { bucket } = state;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={state.scrollEnabled}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={() => void state.onRefresh()}
            tintColor="#D4B13A"
          />
        }
      >
        {/* Portada */}
        <BucketCover
          value={state.resolvedCover}
          title={bucket.title}
          categorySlug={bucket.category?.slug}
          seed={bucket.id}
          style={{ width: SCREEN_WIDTH, height: coverTotalHeight }}
        >
          {state.isCustomCover ? null : (
            <LinearGradient
              colors={
                theme.dark
                  ? [
                      'rgba(0,0,0,0.15)',
                      'transparent',
                      'rgba(0,0,0,0.25)',
                      'rgba(0,0,0,0.80)',
                      theme.colors.background,
                    ]
                  : [
                      'rgba(0,0,0,0.03)',
                      'transparent',
                      'rgba(250,248,243,0.35)',
                      'rgba(250,248,243,0.75)',
                      theme.colors.background,
                    ]
              }
              locations={[0, 0.35, 0.65, 0.88, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          <SafeAreaView style={styles.navOverlay} edges={['top']}>
            <Pressable style={styles.navButton} onPress={() => state.router.back()}>
              <ArrowLeft color="#FFF" size={20} strokeWidth={2} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {state.user && state.canEdit && (
                <Pressable
                  style={styles.navButton}
                  accessibilityRole="button"
                  accessibilityLabel={state.isFav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                  onPress={() =>
                    state.toggleFavorite.mutate({
                      bucketId: state.id,
                      currentlyFavorite: state.isFav,
                    })
                  }
                >
                  <Star
                    color={state.isFav ? gold[400] : '#FFF'}
                    fill={state.isFav ? gold[400] : 'transparent'}
                    size={20}
                    strokeWidth={2}
                  />
                </Pressable>
              )}
              {state.user && !state.canEdit && (
                <Pressable
                  style={styles.navButton}
                  accessibilityRole="button"
                  accessibilityLabel={state.isSaved ? 'Quitar de guardados' : 'Guardar tarea'}
                  onPress={state.handleToggleSaveBucket}
                >
                  <Bookmark
                    color={state.isSaved ? gold[400] : '#FFF'}
                    fill={state.isSaved ? gold[400] : 'transparent'}
                    size={20}
                    strokeWidth={2}
                  />
                </Pressable>
              )}
              {state.user && (
                <Pressable
                  style={styles.navButton}
                  accessibilityRole="button"
                  accessibilityLabel="Notificaciones"
                  onPress={() => state.setShowNotificationModal(true)}
                >
                  <Bell
                    color={state.subStatus === 'accepted' ? gold[400] : '#FFF'}
                    fill={state.subStatus === 'accepted' ? gold[400] : 'transparent'}
                    size={20}
                    strokeWidth={2}
                  />
                </Pressable>
              )}
              <Pressable style={styles.navButton} onPress={() => void state.shareMoment()}>
                <Share2 color="#FFF" size={20} strokeWidth={2} />
              </Pressable>
              <Pressable style={styles.navButton} onPress={state.openMoreMenu}>
                <MoreHorizontal color="#FFF" size={20} strokeWidth={2} />
              </Pressable>
            </View>
          </SafeAreaView>
        </BucketCover>

        {/* Contenido */}
        <View style={styles.content}>
          <BucketHeaderBadges
            bucket={bucket}
            canEdit={state.canEdit}
            bucketAlbums={state.bucketAlbums ?? []}
            albumsData={state.albumsData ?? []}
            onOpenStatusSheet={() => {
              state.setSheetMode('status');
              state.setSheetVisible(true);
            }}
            onOpenPrioritySheet={() => {
              state.setSheetMode('priority');
              state.setSheetVisible(true);
            }}
            onOpenVisibilitySheet={() => {
              state.setSheetMode('visibility');
              state.setSheetVisible(true);
            }}
            onOpenAlbumsSheet={() => {
              state.setSheetVisible(true);
              void state.loadAlbums();
            }}
          />

          {/* Título */}
          {state.canEdit ? (
            <TextInput
              style={[styles.title, { color: theme.colors.foreground, padding: 0 }]}
              defaultValue={bucket.title}
              onChangeText={state.handleTitleChange}
              onBlur={state.flushTitleChange}
              multiline
            />
          ) : (
            <Typography variant="h1" color={theme.colors.foreground} style={styles.title}>
              {bucket.title}
            </Typography>
          )}

          {/* Etiquetas */}
          <ItemTagsRow bucketId={state.id as string} isOwner={state.canEdit} />

          {/* Colaboradores */}
          <BucketCollaboratorsRow
            bucket={bucket}
            collaborators={state.collaborators}
            participantsData={state.participantsData}
            user={state.user}
            canEdit={state.canEdit}
            onOpenPicker={() => state.setShowCollaboratorPicker(true)}
            onOpenSettings={() => state.setShowCollaborationSettingsModal(true)}
            pendingCount={state.pendingCollaborators.length}
          />

          {/* Tarjeta de invitación/solicitud de colaboración para seguidores y otros usuarios */}
          <TaskCollaborationViewerCard
            isOwner={state.isOwner}
            isCollaborator={state.isCollaborator}
            collaborationMode={state.collaborationMode}
            collaborationAudience={state.collaborationAudience}
            isFollower={state.isFollower}
            isPendingCollaborator={state.isPendingCollaborator}
            ownerUsername={bucket.user?.username || 'el creador'}
            onRequestOrJoin={state.handleRequestOrJoinCollaboration}
            onCancelRequest={state.handleCancelCollaborationRequest}
            onFollowOwner={state.handleFollowOwner}
          />

          {/* Meta (Ubicación, fechas, Google Drive) */}
          <BucketMetaSection
            bucket={bucket}
            canEdit={state.canEdit}
            theme={theme}
            onOpenLocationModal={() => state.setLocationModalVisible(true)}
            onRemoveLocation={() => void state.handleRemoveLocation()}
            onOpenDatePicker={(config) => state.setDatePickerConfig(config)}
            onRemoveCompletedAt={() => void state.handleRemoveCompletedAt()}
            onRemoveDeadline={() => void state.handleRemoveDeadline()}
            onOpenDriveModal={() => state.setDriveModalVisible(true)}
            onOpenDriveLink={() =>
              void openGoogleDriveLink({
                driveUrl: bucket.drive_url,
                bucketId: bucket.id,
                bucketTitle: bucket.title,
                bucketOwnerId: bucket.user_id,
                currentUserId: state.user?.id,
                currentUserName: state.user?.user_metadata?.full_name || state.user?.user_metadata?.username,
              })
            }
            onRemoveDriveUrl={() => void state.handleSaveDriveUrl(null)}
          />

          {/* Descripción */}
          {state.canEdit ? (
            <TextInput
              style={[styles.description, { color: theme.colors.foregroundMuted, padding: 0 }]}
              defaultValue={bucket.description || ''}
              onChangeText={state.handleDescriptionChange}
              placeholder="Añadir descripción..."
              placeholderTextColor={theme.colors.foregroundMuted}
              multiline
            />
          ) : bucket.description ? (
            <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.description}>
              {bucket.description}
            </Typography>
          ) : null}

          {/* Menciones */}
          {((state.mentionsData?.length ?? 0) > 0 || state.canEdit) && (
            <View style={{ marginBottom: 20 }}>
              {(state.mentionsData?.length ?? 0) > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                      MENCIONES · {state.mentionsData?.length}
                    </Typography>
                    {state.canEdit && (
                      <Pressable onPress={() => state.setShowMentionPicker(true)} hitSlop={10}>
                        <Typography variant="caption" color={gold[400]} style={{ fontWeight: '600' }}>
                          Editar
                        </Typography>
                      </Pressable>
                    )}
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <TaskMentionList
                      mentions={state.mentionsData ?? []}
                      isOwner={state.canEdit}
                      theme={theme}
                      onPress={(task) => state.router.push(`/bucket/${task.id}` as any)}
                      onDelete={(mId, t) => state.removeMention(mId, t)}
                      onMove={(from, to) => void state.handleMoveMention(from, to)}
                      onDraggingChange={(dragging) => state.setScrollEnabled(!dragging)}
                    />
                  </View>
                </>
              ) : (
                <Pressable
                  onPress={() => state.setShowMentionPicker(true)}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
                >
                  <Link2 color={gold[400]} size={16} strokeWidth={1.8} />
                  <Typography variant="body" color={gold[400]}>
                    + Mencionar tarea
                  </Typography>
                </Pressable>
              )}
            </View>
          )}

          {/* Estadísticas de reacciones y comentarios */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Pressable
                onPress={() =>
                  state.user &&
                  state.toggleReaction.mutate({ bucketId: state.id, userId: state.user.id, emoji: '❤️' })
                }
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={state.myReaction ? 'Quitar me gusta' : 'Dar me gusta'}
              >
                <Heart
                  color={state.myReaction ? '#f97316' : theme.colors.foregroundMuted}
                  fill={state.myReaction ? '#f97316' : 'transparent'}
                  size={18}
                  strokeWidth={1.8}
                />
              </Pressable>
              <Pressable
                onPress={() => setShowLikesModal(true)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Ver me gusta"
              >
                <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginLeft: 6 }}>
                  {state.totalReactions}
                </Typography>
              </Pressable>
            </View>
            <Pressable
              onPress={() => setShowCommentsModal(true)}
              style={[styles.statItem, { marginLeft: 24 }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ver comentarios"
            >
              <MessageCircle color={theme.colors.foregroundMuted} size={18} strokeWidth={1.8} />
              <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginLeft: 6 }}>
                {state.comments.length} {state.comments.length === 1 ? 'comentario' : 'comentarios'}
              </Typography>
            </Pressable>
          </View>

          {/* Contador */}
          <BucketCounterSection
            bucket={bucket}
            canEdit={state.canEdit}
            theme={theme}
            removeCounter={state.removeCounter}
            handleCounterLabelChange={state.handleCounterLabelChange}
            handleCounterCountChange={state.handleCounterCountChange}
            changeCounter={state.changeCounter}
            handleCounterTargetChange={state.handleCounterTargetChange}
            updateCounter={state.updateCounter}
          />

          {/* Subtareas / Pasos */}
          {(state.subtasks.length > 0 || state.canEdit) && (
            <View style={styles.subtasksSection}>
              <View style={styles.subtasksHeader}>
                <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                  PASOS · {state.subtasksDone} DE {state.subtasks.length}
                </Typography>
              </View>
              {state.subtasks.length > 0 && (
                <View style={{ marginTop: 10, marginBottom: 8 }}>
                  <ProgressBar
                    value={state.subtasksDone}
                    total={state.subtasks.length}
                    color={gold[400]}
                    track={theme.colors.border}
                  />
                </View>
              )}
              <SubtaskList
                subtasks={state.subtasks}
                isOwner={state.canEdit}
                theme={theme}
                onToggle={(subtask) => void state.toggleSubtask(subtask)}
                onChange={state.handleSubtaskChange}
                onDelete={state.handleDeleteSubtask}
                onMove={(from, to) => void state.handleMoveSubtask(from, to)}
                onDraggingChange={(dragging) => state.setScrollEnabled(!dragging)}
              />

              {state.canEdit && (
                <View style={[styles.subtaskRow, { opacity: 0.7 }]}>
                  <Pressable onPress={state.handleAddSubtask}>
                    <Plus color={theme.colors.foregroundMuted} size={22} strokeWidth={1.8} />
                  </Pressable>
                  <TextInput
                    placeholder="Añadir paso..."
                    placeholderTextColor={theme.colors.foregroundMuted}
                    style={[styles.subtaskText, { flex: 1, padding: 0, color: theme.colors.foreground }]}
                    value={state.newSubtaskText}
                    onChangeText={state.setNewSubtaskText}
                    onSubmitEditing={state.handleAddSubtask}
                  />
                </View>
              )}
            </View>
          )}

          {/* Imagen de la tarea */}
          {state.showThumbnailPicker && (
            <BucketThumbnailSelector
              bucket={bucket}
              hasCover={state.hasCover}
              thumbSelection={state.thumbSelection}
              chosenPhotoId={state.chosenPhotoId}
              thumbPhotos={state.thumbPhotos}
              theme={theme}
              onChooseThumbnail={(mode, photoId) => void state.chooseThumbnail(mode, photoId)}
            />
          )}

          {/* Fotos */}
          <BucketPhotosSection
            bucket={bucket}
            photos={state.photos}
            canEdit={state.canEdit}
            theme={theme}
            photoSortField={state.photoSortField}
            photoSortDir={state.photoSortDir}
            sortTriggerRef={state.sortTriggerRef}
            openSortMenu={state.openSortMenu}
            photoSearchQuery={state.photoSearchQuery}
            setPhotoSearchQuery={state.setPhotoSearchQuery}
            setScrollEnabled={state.setScrollEnabled}
            persistPhotoOrder={(ids) => void state.persistPhotoOrder(ids)}
            setViewingPhotoIndex={state.setViewingPhotoIndex}
            pickAndUploadPhotos={() => void state.pickAndUploadPhotos()}
            onOpenAddPhotoSheet={() => state.setShowAddPhotoSheet(true)}
          />

          {/* Sección de Comentarios en la tarea */}
          <ItemCommentsSection
            targetId={Array.isArray(state.id) ? state.id[0] : (state.id as string)}
            targetType="bucket"
            ownerId={bucket.user_id}
            title={bucket.title}
            onOpenModal={(autoFocus) => {
              setCommentsAutoFocus(!!autoFocus);
              setShowCommentsModal(true);
            }}
          />
        </View>
      </ScrollView>

      {/* Editor recorte foto */}
      <PhotoCropModal
        visible={!!state.cropRequest}
        uri={state.cropRequest?.uri ?? null}
        width={state.cropRequest?.width ?? 0}
        height={state.cropRequest?.height ?? 0}
        index={state.cropRequest?.index ?? 0}
        total={state.cropRequest?.total ?? 1}
        onCancel={() => state.finishPhotoEdit(null)}
        onDone={(uri) => state.finishPhotoEdit(uri)}
      />

      {/* Visor de fotos pantalla completa */}
      <BucketPhotoViewer
        photos={state.photos}
        viewingPhotoIndex={state.viewingPhotoIndex}
        setViewingPhotoIndex={state.setViewingPhotoIndex}
        isOwner={state.canEdit}
        onDelete={state.deletePhoto}
        onUpdateTitle={state.handleUpdatePhotoTitle}
        onUpdatePhotoDate={state.handleUpdatePhotoDate}
      />

      {/* Botón flotante inferior para cambiar estado */}
      {state.canEdit && (
        <View style={[styles.actionBar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <Pressable
            style={[
              styles.actionBtn,
              styles.actionBtnFilled,
              {
                backgroundColor:
                  bucket.status === 'completed'
                    ? theme.dark
                      ? dark[300]
                      : theme.colors.surfaceSunken
                    : gold[400],
                borderWidth: bucket.status === 'completed' ? 1 : 0,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() =>
              void state.handleChangeStatus(bucket.status === 'completed' ? 'pending' : 'completed')
            }
          >
            {bucket.status === 'completed' ? (
              <X color={theme.colors.foreground} size={18} strokeWidth={2} />
            ) : (
              <CheckCircle2 color="#000" size={18} strokeWidth={2} />
            )}
            <Typography
              variant="bodySemibold"
              color={bucket.status === 'completed' ? theme.colors.foreground : '#000'}
              style={{ marginLeft: 8 }}
            >
              {bucket.status === 'completed' ? 'Marcar como pendiente' : 'Marcar como completado'}
            </Typography>
          </Pressable>
        </View>
      )}

      {/* Bottom Sheet */}
      <BucketBottomSheet
        sheetVisible={state.sheetVisible}
        sheetMode={state.sheetMode}
        sheetTranslateY={state.sheetTranslateY}
        closeSheet={state.closeSheet}
        theme={theme}
        isOwner={state.isOwner}
        canEdit={state.canEdit}
        isCollaborator={state.isCollaborator}
        isFavorite={state.isFav}
        onToggleFavorite={() => {
          state.toggleFavorite.mutate({ bucketId: state.id, currentlyFavorite: state.isFav });
        }}
        isSaved={state.isSaved}
        onToggleSave={state.handleToggleSaveBucket}
        onLeaveCollaboration={state.handleLeaveCollaboration}
        onReport={() => setTimeout(() => setReportVisible(true), 250)}
        uploadPhotos={state.uploadPhotos}
        uploadCover={state.uploadCover}
        pickAndUploadCover={state.pickAndUploadCover}
        takePhotoAndUploadCover={state.takePhotoAndUploadCover}
        openCoverLinkModal={() => state.setShowCoverLinkModal(true)}
        recropCurrentCover={state.recropCurrentCover}
        removeCover={state.removeCover}
        loadAlbums={state.loadAlbums}
        user={state.user}
        copyBucket={state.copyBucket}
        id={state.id}
        handleDelete={state.handleDelete}
        bucket={bucket}
        handleChangeStatus={state.handleChangeStatus}
        handleChangeVisibility={state.handleChangeVisibility}
        setSheetMode={state.setSheetMode}
        albumsLoading={state.albumsLoading}
        toggleAlbum={state.toggleAlbum}
        removeAllAlbums={state.removeAllAlbums}
        albums={state.albumsData ?? []}
        bucketAlbums={state.bucketAlbums ?? []}
        categories={state.categories}
        handleChangeCategory={state.handleChangeCategory}
        handleChangePriority={state.handleChangePriority}
      />

      {/* Modales adicionales */}
      <PhotoSortModal
        visible={state.photoSortMenuOpen}
        canEdit={state.canEdit}
        photoSortField={state.photoSortField}
        photoSortDir={state.photoSortDir}
        sortMenuPos={state.sortMenuPos}
        theme={theme}
        onClose={() => state.setPhotoSortMenuOpen(false)}
        onSelectSort={state.handleSortOption}
      />

      <BucketLocationModal
        visible={state.locationModalVisible}
        locationText={bucket.location_text}
        theme={theme}
        onClose={() => state.setLocationModalVisible(false)}
        onSaveLocation={state.handleSaveLocation}
        onRemoveLocation={state.handleRemoveLocation}
      />

      <BucketDatePickerModal
        config={state.datePickerConfig}
        onClose={() => state.setDatePickerConfig(null)}
        onChangeDate={async (date, type) => {
          state.setDatePickerConfig(null);
          const safeDate = new Date(date);
          safeDate.setHours(12, 0, 0, 0);
          const isoString = safeDate.toISOString();

          const patch: Record<string, any> = { [type]: isoString };
          if (type === 'completed_at') {
            patch.status = 'completed';
          }
          const targetBucketId = Array.isArray(state.id) ? state.id[0] : state.id;
          state.queryClient.setQueryData(['bucketDetail', targetBucketId], (oldData: any) =>
            oldData ? { ...oldData, ...patch } : oldData
          );
          const { error } = await supabase.from('buckets').update(patch).eq('id', targetBucketId);
          if (error) {
            console.error('No se pudo guardar la fecha', error.message);
          }
          await state.queryClient.invalidateQueries({ queryKey: ['bucketDetail', targetBucketId] });
          void state.queryClient.invalidateQueries({ queryKey: ['buckets'] });
          void state.queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
        }}
      />

      <TaskMentionPickerSheet
        visible={state.showMentionPicker}
        currentBucketId={Array.isArray(state.id) ? state.id[0] : state.id}
        mentionedIds={(state.mentionsData ?? []).map((m) => m.task.id)}
        onToggle={state.toggleMention}
        onClose={() => state.setShowMentionPicker(false)}
      />

      <CollaboratorPickerSheet
        visible={state.showCollaboratorPicker}
        selected={[
          ...(bucket.user_id !== state.user?.id
            ? [
              {
                id: bucket.user_id,
                username: bucket.user?.username || '',
                display_name: bucket.user?.display_name || null,
                avatar_url: bucket.user?.avatar_url || null,
                status: 'accepted' as const,
              },
            ]
            : []),
          ...state.participantsData.filter(
            (p: any) => p.id !== state.user?.id && p.id !== bucket.user_id
          ),
          ...state.collaborators.filter(
            (c: any) =>
              c.id !== state.user?.id &&
              c.status === 'accepted' &&
              !state.participantsData.some((p: any) => p.id === c.id)
          ),
        ]}
        onChange={(collabs) => void state.handleCollaboratorsChange(collabs)}
        onClose={() => state.setShowCollaboratorPicker(false)}
        readOnlyIds={[
          ...(bucket.user_id ? [bucket.user_id] : []),
          ...state.participantsData.filter((p: any) => p.id !== state.user?.id).map((p: any) => p.id),
        ]}
      />

      <NotificationSubscribersModal
        visible={state.showNotificationModal}
        onClose={() => state.setShowNotificationModal(false)}
        targetType="bucket"
        targetId={Array.isArray(state.id) ? state.id[0] : state.id}
        targetTitle={bucket.title}
        ownerId={bucket.user_id}
        currentUserId={state.user?.id}
      />

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        kind="bucket"
        subject={bucket.title}
        isLoading={reportContent.isPending}
        onSubmit={async (reason, details) => {
          await reportContent.mutateAsync({
            targetType: 'bucket',
            targetId: Array.isArray(state.id) ? state.id[0]! : (state.id as string),
            reason,
            details,
          });
        }}
      />

      <TaskCommentsModal
        visible={showCommentsModal}
        onClose={() => {
          setShowCommentsModal(false);
          setCommentsAutoFocus(false);
        }}
        bucketId={Array.isArray(state.id) ? state.id[0] : (state.id as string)}
        bucketTitle={bucket.title}
        bucketOwnerId={bucket.user_id}
        autoFocus={commentsAutoFocus}
      />

      <ItemLikesModal
        visible={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        targetId={Array.isArray(state.id) ? state.id[0]! : (state.id as string)}
        targetType="bucket"
        title={bucket.title}
      />

      <ImageLinkModal
        visible={state.showCoverLinkModal}
        onClose={() => state.setShowCoverLinkModal(false)}
        onApplyImage={state.handleApplyCoverUrl}
        initialQuery={bucket?.title || ''}
      />

      {/* Selector de foto desde abajo (Cámara, Galería, Google Fotos / Web) */}
      <AddPhotoSheet
        visible={state.showAddPhotoSheet}
        onClose={() => state.setShowAddPhotoSheet(false)}
        onPickCamera={() => void state.takePhotoAndUploadPhotos()}
        onPickGallery={() => void state.pickAndUploadPhotos()}
        onPickGooglePhotos={() => state.setShowPhotoLinkModal(true)}
      />

      {/* Modal para añadir foto mediante enlace Google Fotos / Web */}
      <ImageLinkModal
        visible={state.showPhotoLinkModal}
        onClose={() => state.setShowPhotoLinkModal(false)}
        onApplyImage={(url) => {
          state.setShowPhotoLinkModal(false);
          void state.addPhotoFromUrl(url);
        }}
        initialQuery={bucket?.title || ''}
      />

      <TaskCollaborationSettingsModal
        visible={state.showCollaborationSettingsModal}
        currentMode={state.collaborationMode}
        currentAudience={state.collaborationAudience}
        pendingCollaborators={state.pendingCollaborators}
        onClose={() => state.setShowCollaborationSettingsModal(false)}
        onSaveSettings={state.handleUpdateCollaborationSettings}
        onRespondRequest={state.handleRespondCollaboratorRequest}
      />

      <GoogleDriveModal
        visible={state.driveModalVisible}
        onClose={() => state.setDriveModalVisible(false)}
        currentUrl={bucket?.drive_url}
        onSave={(u) => void state.handleSaveDriveUrl(u)}
        canEdit={state.canEdit}
      />
    </View>
  );
}

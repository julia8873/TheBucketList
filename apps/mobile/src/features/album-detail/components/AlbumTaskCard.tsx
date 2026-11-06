import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { GripVertical, Check, Plus, CheckCircle2, Lock, Globe, Users } from 'lucide-react-native';
import type { TaskItem } from '@/services/api/albumsService';
import type { GalleryColumns } from '@/stores/myListCustomization.store';
import { BucketCover } from '@/components/BucketCover';
import { hexToRgba } from '@/constants/tagPresets';
import { styles } from '../styles/album-detail.styles';
import { ParticipantsStack, useParticipantsOf } from '@/components/ItemParticipants';
import { getTaskStatusType, getStatusConfig } from '@/utils/statusBadge';

import { useTranslation, resolveCounterLabel } from '@bucketlist/shared';

function getBadgeText(dateStr?: string, t?: (k: any, o?: any) => string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t ? t('common.today') : 'Hoy';
  if (diffDays === 1) return t ? t('calendar.tomorrow') : 'Mañana';
  if (diffDays > 1) return t ? t('tasks.days_count', { count: diffDays }) : `${diffDays} días`;
  return null;
}

function getSubTitle(task: TaskItem, t?: (k: any, o?: any) => string): string {
  const cat =
    task.categoryName && !task.categoryName.startsWith('Prioridad ')
      ? task.categoryName
      : null;
  const parts: string[] = [];
  if (cat) parts.push(cat);
  if (task.stepsTotal && task.stepsTotal > 0) {
    parts.push(t ? t('tasks.steps_count', { done: task.stepsCompleted ?? 0, total: task.stepsTotal }) : `${task.stepsCompleted ?? 0} de ${task.stepsTotal} pasos`);
  } else if (task.counterTarget && task.counterTarget > 0) {
    const label = resolveCounterLabel(task.counterLabel, task.counterTarget);
    parts.push(`${task.counterCount ?? 0} / ${task.counterTarget} ${label}`);
  } else if (task.counterCount && task.counterCount > 0) {
    const label = resolveCounterLabel(task.counterLabel, task.counterCount);
    parts.push(`${task.counterCount} ${label}`);
  } else if (task.location) {
    parts.push(task.location);
  }
  return parts.join(' · ');
}

export type AlbumTaskViewMode = 'list' | 'gallery' | 'compact';

interface AlbumTaskCardProps {
  task: TaskItem;
  /** Vista de la tarea dentro del álbum: normal (lista), galería (2, 3 o 4 columnas) o compacta. */
  viewMode?: AlbumTaskViewMode;
  columns?: GalleryColumns;
  canEdit: boolean;
  copiedIds?: string[];
  drag?: { panHandlers: any; isActive: boolean };
  onToggleCompleted: (task: TaskItem, e: any) => void;
  onCopySingleTask: (task: TaskItem, e: any) => void;
  /** Modo selección múltiple (acciones en lote). */
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (task: TaskItem) => void;
  onLongPressTask?: (task: TaskItem) => void;
}

export function AlbumTaskCard({
  task,
  viewMode = 'list',
  columns = 2,
  canEdit,
  copiedIds,
  drag,
  onToggleCompleted,
  onCopySingleTask,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onLongPressTask,
}: AlbumTaskCardProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-ES';
  const isDone = task.isCompleted;
  const statusType = getTaskStatusType({ status: task.status, deadline: task.dueDate });
  const statusCfg = getStatusConfig(statusType, t);
  const subTitle = getSubTitle(task, t);
  const badge = getBadgeText(task.dueDate, t);
  const participants = useParticipantsOf('task', task.id);

  const itemPriority = task.priority || 'medium';
  const itemPriorityColor =
    itemPriority === 'urgent'
      ? '#DC2626'
      : itemPriority === 'high'
        ? '#EF4444'
        : itemPriority === 'low'
          ? '#10B981'
          : '#D4B13A';
  const itemPriorityLabel =
    itemPriority === 'urgent'
      ? t('common.urgent')
      : itemPriority === 'high'
        ? t('common.high')
        : itemPriority === 'low'
          ? t('common.low')
          : t('common.medium');

  const priorityBadge = (
    <View
      key="priority-badge"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor:
          itemPriority === 'urgent' || itemPriority === 'high'
            ? 'rgba(239, 68, 68, 0.16)'
            : itemPriority === 'low'
              ? 'rgba(16, 185, 129, 0.16)'
              : 'rgba(212, 177, 58, 0.16)',
        borderWidth: 1,
        borderColor: itemPriorityColor,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: itemPriorityColor }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: itemPriorityColor }}>
        {itemPriorityLabel}
      </Text>
    </View>
  );

  const statusBadge = (
    <View
      key="status-badge"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: statusCfg.bg,
        borderWidth: 1,
        borderColor: statusCfg.color,
      }}
    >
      {statusCfg.rowIcon}
      <Text style={{ fontSize: 11, fontWeight: '700', color: statusCfg.color }}>
        {statusCfg.label}
      </Text>
    </View>
  );

  const handlePress = () => {
    if (isSelectionMode) onToggleSelect?.(task);
    else router.push(`/bucket/${task.id}`);
  };
  const handleLongPress =
    canEdit && !isSelectionMode && !drag ? () => onLongPressTask?.(task) : undefined;
  const isCopied = copiedIds?.includes(task.id);

  // ───────────── Vista compacta ─────────────
  if (viewMode === 'compact') {
    return (
      <Pressable
        style={[
          styles.taskCompactRow,
          isSelectionMode && isSelected && { borderColor: '#D4B13A' },
          isDone && { opacity: 0.72 },
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityRole={isSelectionMode ? 'checkbox' : 'button'}
        accessibilityState={isSelectionMode ? { checked: isSelected } : undefined}
      >
        {isSelectionMode && (
          isSelected ? (
            <CheckCircle2 size={22} color="#D4B13A" fill="#D4B13A" />
          ) : (
            <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#555555' }} />
          )
        )}
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: itemPriorityColor }} />
        <Text
          style={[styles.taskCompactTitle, isDone && { color: '#8A8A80' }]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: statusCfg.bg, alignItems: 'center', justifyContent: 'center' }}>
          {statusCfg.rowIcon}
        </View>
        {!isDone && badge && (
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#D4B13A' }}>{badge}</Text>
        )}
        {drag && !isSelectionMode && (
          <View {...drag.panHandlers} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} accessibilityLabel={t('albums.drag_reorder')}>
            <GripVertical size={18} color={drag.isActive ? '#D4B13A' : '#8F8F8F'} strokeWidth={2} />
          </View>
        )}
        {!canEdit && !isSelectionMode && (
          isCopied ? (
            <Check size={16} color="#D4B13A" strokeWidth={2.5} />
          ) : (
            <Pressable hitSlop={8} onPress={(e) => onCopySingleTask(task, e)} style={styles.taskCompactAdd}>
              <Plus size={14} color="#0D0D0D" strokeWidth={2.5} />
            </Pressable>
          )
        )}
      </Pressable>
    );
  }

  // ───────────── Vista galería (2, 3 o 4 columnas) ─────────────
  if (viewMode === 'gallery') {
    const is4Cols = columns === 4;
    const is3Cols = columns === 3;
    const badgeSize = is4Cols ? 16 : is3Cols ? 18 : 22;
    const checkIconSize = is4Cols ? 10 : is3Cols ? 11 : 12;
    const imageValue = task.imageValue ?? null;
    const isImageCover = !!imageValue && !imageValue.startsWith('preset:');
    return (
      <Pressable
        style={[
          styles.galleryCard,
          is3Cols && styles.galleryCard3,
          is4Cols && styles.galleryCard4,
          isSelectionMode && isSelected && { borderColor: '#D4B13A', borderWidth: is4Cols ? 1.5 : 2.5 },
          isDone && { opacity: 0.72 },
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityRole={isSelectionMode ? 'checkbox' : 'button'}
        accessibilityState={isSelectionMode ? { checked: isSelected } : undefined}
        accessibilityLabel={task.title}
      >
        <BucketCover
          value={imageValue}
          title={task.title}
          categorySlug={task.categorySlug}
          seed={task.id}
          iconSize={is4Cols ? 26 : is3Cols ? 34 : 44}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.galleryTopBadges, is4Cols && { top: 4, left: 4, right: 4 }, is3Cols && { top: 5, left: 5, right: 5 }]} pointerEvents="box-none">
          {/* Izquierda: badge de estado + fotos de perfil en la misma fila */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: is4Cols ? 3 : 4 }}>
            {isSelectionMode ? (
              <View
                style={[
                  styles.galleryCheck,
                  {
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: isSelected ? '#D4B13A' : 'rgba(0,0,0,0.6)',
                    borderWidth: isSelected ? 0 : 1.5,
                    borderColor: '#FFFFFF',
                  },
                ]}
              >
                {isSelected && <Check size={checkIconSize} color="#0D0D0D" strokeWidth={3} />}
              </View>
            ) : (
              <View
                style={[
                  styles.galleryCheck,
                  {
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: statusCfg.badgeBg,
                    borderWidth: 0,
                  },
                ]}
              >
                {statusCfg.renderGalleryIcon(checkIconSize)}
              </View>
            )}
            {/* Fotos de perfil inline al lado del badge */}
            {participants && participants.length > 0 && (
              <ParticipantsStack
                participants={participants}
                max={participants.length > 2 ? 1 : 2}
                bubbleSize={badgeSize}
                size="xs"
                ringColor="rgba(0,0,0,0.55)"
                disabled={isSelectionMode}
              />
            )}
          </View>

          {/* Derecha: visibilidad, prioridad y etiquetas */}
          <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: is4Cols ? 2 : is3Cols ? 3 : 4, flexShrink: 0, marginLeft: is4Cols ? 2 : 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: is4Cols ? 2 : 3 }}>
              <View
                style={{
                  width: is4Cols ? 12 : is3Cols ? 14 : 16,
                  height: is4Cols ? 12 : is3Cols ? 14 : 16,
                  borderRadius: (is4Cols ? 12 : is3Cols ? 14 : 16) / 2,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(() => {
                  const vis = task.visibility || 'public';
                  const iconSize = is4Cols ? 7 : is3Cols ? 8 : 9;
                  if (vis === 'private') {
                    return <Lock size={iconSize} color="#FFFFFF" strokeWidth={2.4} />;
                  }
                  if (vis === 'followers') {
                    return <Users size={iconSize} color="#FFFFFF" strokeWidth={2.4} />;
                  }
                  return <Globe size={iconSize} color="#FFFFFF" strokeWidth={2.4} />;
                })()}
              </View>

              {is4Cols || is3Cols ? (
                <View
                  style={{
                    width: is4Cols ? 8 : 10,
                    height: is4Cols ? 8 : 10,
                    borderRadius: is4Cols ? 4 : 5,
                    backgroundColor: itemPriorityColor,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.4)',
                  }}
                />
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    borderWidth: 1,
                    borderColor: itemPriorityColor,
                  }}
                >
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: itemPriorityColor }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: itemPriorityColor }}>{itemPriorityLabel}</Text>
                </View>
              )}
            </View>

            {task.tags && task.tags.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: is4Cols ? 2 : 3, maxWidth: is4Cols ? 36 : '100%', justifyContent: 'flex-end' }}>
                {task.tags.slice(0, 1).map((t) => (
                  <View
                    key={t.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 2,
                      paddingHorizontal: (is3Cols || is4Cols) ? (is4Cols ? 2 : 4) : 6,
                      paddingVertical: 1,
                      borderRadius: 6,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      borderWidth: 0.5,
                      borderColor: t.color || '#D4B13A',
                      flexShrink: 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: is4Cols ? 9 : is3Cols ? 10 : 10,
                        color: t.color || '#D4B13A',
                        fontWeight: '600',
                      }}
                      numberOfLines={1}
                    >
                      {is3Cols || is4Cols
                        ? (t.emoji || t.name.slice(0, 2))
                        : `${t.emoji ? `${t.emoji} ` : ''}${t.name}`}
                    </Text>
                  </View>
                ))}
                {!is4Cols && task.tags.length > 1 && (
                  <View
                    style={{
                      paddingHorizontal: 3,
                      paddingVertical: 1,
                      borderRadius: 6,
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      borderWidth: 0.5,
                      borderColor: 'rgba(255,255,255,0.2)',
                      flexShrink: 0,
                    }}
                  >
                    <Text style={{ fontSize: is3Cols ? 8 : 9, color: '#8A8A8A', fontWeight: '700' }}>
                      +{task.tags.length - 1}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.galleryBottomOverlay,
            { backgroundColor: isImageCover ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0.72)' },
            is3Cols && { minHeight: 44, paddingHorizontal: 6, paddingVertical: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
            is4Cols && { minHeight: 32, paddingHorizontal: 4, paddingVertical: 3, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: is4Cols ? 4 : is3Cols ? 6 : 8 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.galleryCardTitle,
                  is3Cols && { fontSize: 11, lineHeight: 14, minHeight: 14 },
                  is4Cols && { fontSize: 10, lineHeight: 12, minHeight: 12 },
                  isDone && { opacity: 0.72, color: '#8A8A80' },
                ]}
                numberOfLines={is4Cols || is3Cols ? 1 : 2}
              >
                {task.title}
              </Text>
              {!is4Cols && subTitle.length > 0 && (
                <Text style={[styles.galleryCardMeta, is3Cols && { fontSize: 9, marginTop: 1 }]} numberOfLines={1}>
                  {subTitle}
                </Text>
              )}
            </View>
            {!is4Cols && !canEdit && !isSelectionMode && (
              isCopied ? (
                <View style={[styles.galleryAddBtn, is3Cols && { width: 20, height: 20, borderRadius: 10 }]}>
                  <Check size={is3Cols ? 12 : 14} color="#0D0D0D" strokeWidth={2.5} />
                </View>
              ) : (
                <Pressable hitSlop={8} onPress={(e) => onCopySingleTask(task, e)} style={[styles.galleryAddBtn, is3Cols && { width: 20, height: 20, borderRadius: 10 }]}>
                  <Plus size={is3Cols ? 12 : 14} color="#0D0D0D" strokeWidth={2.5} />
                </Pressable>
              )
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[
        styles.taskCard,
        isSelectionMode && isSelected && { borderColor: '#D4B13A', borderWidth: 1 },
        isDone && { opacity: 0.72 },
      ]}
      onPress={() => {
        if (isSelectionMode) onToggleSelect?.(task);
        else router.push(`/bucket/${task.id}`);
      }}
      onLongPress={canEdit && !isSelectionMode && !drag ? () => onLongPressTask?.(task) : undefined}
      delayLongPress={350}
      accessibilityRole={isSelectionMode ? 'checkbox' : 'button'}
      accessibilityState={isSelectionMode ? { checked: isSelected } : undefined}
    >
      {isSelectionMode && (
        <View style={{ marginRight: 10 }}>
          {isSelected ? (
            <CheckCircle2 size={24} color="#D4B13A" fill="#D4B13A" />
          ) : (
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#555555' }} />
          )}
        </View>
      )}
      <View style={[styles.taskThumbContainer, isDone && { opacity: 0.5 }]}>
        <BucketCover
          value={task.imageValue ?? null}
          title={task.title}
          categorySlug={task.categorySlug}
          seed={task.id}
          iconSize={56}
          style={styles.taskThumb}
        />
      </View>
      <View style={styles.taskContent}>
        <Text
          style={[styles.taskTitle, isDone && { color: '#8A8A80' }]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {subTitle.length > 0 && <Text style={styles.taskSub}>{subTitle}</Text>}
        {!isDone && task.dueDate && new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) && (
          <Text style={[styles.taskSub, { color: '#EF4444', marginTop: 2 }]}>
            {t('tasks.scheduled_for', {
              date: new Date(task.dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
            })}
          </Text>
        )}
        {!isDone && (
          (task.stepsTotal !== undefined && task.stepsTotal > 0) ? (
            <View style={styles.taskStepsTrack}>
              <View
                style={[
                  styles.taskStepsFill,
                  { width: `${Math.round(((task.stepsCompleted ?? 0) / task.stepsTotal) * 100)}%` },
                ]}
              />
            </View>
          ) : (task.counterTarget !== undefined && task.counterTarget !== null && task.counterTarget > 0) ? (
            <View style={styles.taskStepsTrack}>
              <View
                style={[
                  styles.taskStepsFill,
                  { width: `${Math.min(100, Math.round(((task.counterCount ?? 0) / task.counterTarget) * 100))}%` },
                ]}
              />
            </View>
          ) : null
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
          {statusBadge}
          {priorityBadge}
          {task.tags &&
            task.tags.slice(0, 3).map((t) => (
              <View
                key={t.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 6,
                  backgroundColor: hexToRgba(t.color || '#D4B13A', 0.16),
                  borderWidth: 0.5,
                  borderColor: t.color || '#D4B13A',
                }}
              >
                {t.emoji ? <Text style={{ fontSize: 9 }}>{t.emoji}</Text> : null}
                <Text style={{ fontSize: 10, fontWeight: '600', color: t.color || '#D4B13A' }}>
                  {t.name}
                </Text>
              </View>
            ))}
          {task.tags && task.tags.length > 3 && (
            <Text style={{ fontSize: 10, color: '#8A8A8A' }}>+{task.tags.length - 3}</Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {!isDone && badge && (
          <View style={styles.taskBadge}>
            <Text style={styles.taskBadgeText}>{badge}</Text>
          </View>
        )}

        {drag && !isSelectionMode && (
          <View {...drag.panHandlers} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} accessibilityLabel={t('albums.drag_reorder')}>
            <GripVertical size={20} color={drag.isActive ? '#D4B13A' : '#8F8F8F'} strokeWidth={2} />
          </View>
        )}

        {isSelectionMode ? null : canEdit ? (
          <Pressable
            hitSlop={8}
            onPress={(e) => onToggleCompleted(task, e)}
            style={[
              styles.readOnlyDoneBadge,
              {
                backgroundColor: statusCfg.bg,
                borderColor: statusCfg.color,
                borderWidth: 1,
              },
            ]}
          >
            {statusCfg.rowIcon}
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={[
                styles.readOnlyDoneBadge,
                {
                  backgroundColor: statusCfg.bg,
                  borderColor: statusCfg.color,
                  borderWidth: 1,
                },
              ]}
            >
              {statusCfg.rowIcon}
            </View>
            {copiedIds?.includes(task.id) ? (
              <View style={styles.taskAddedBadge}>
                <Check size={12} color="#D4B13A" strokeWidth={2.5} />
                <Text style={styles.taskAddedText}>{t('common.saved')}</Text>
              </View>
            ) : (
              <Pressable hitSlop={8} onPress={(e) => onCopySingleTask(task, e)} style={styles.taskAddBtn}>
                <Plus size={14} color="#0D0D0D" strokeWidth={2.5} />
                <Text style={styles.taskAddBtnText}>{t('common.add')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

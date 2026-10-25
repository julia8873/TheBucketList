import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { UniversalDatePicker } from '@/components/UniversalDatePicker';
import {
  X,
  Plus,
  Pin,
  Flag,
  Calendar,
  ListChecks,
  CheckCircle2,
  Circle,
  Sparkles,
  BookmarkPlus,
} from 'lucide-react-native';
import { format, addDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/utils/dateLocale';

import { gold, useTheme } from '@bucketlist/ui';
import { styles } from '../styles/explore.styles';
import {
  DailyTask,
  DailyTag,
  DailySubtask,
  DailyTaskPriority,
  DailyTaskRecurrenceUnit,
} from '../types';
import { PRIORITY_CONFIG, PRIORITY_ORDER, getPriorityConfig } from '../constants';
import { parseLocalDate, toDateString } from '../utils/dailyTaskDateUtils';
import { RecurrenceSelector } from './RecurrenceSelector';

interface EditDailyTaskModalProps {
  visible: boolean;
  editingTask: DailyTask | null;
  onClose: () => void;
  // Title
  editTitle: string;
  onEditTitleChange: (text: string) => void;
  onEditTitleBlur: () => void;
  // Status & Favorite
  editIsFavorite: boolean;
  onToggleFavorite: () => void;
  editIsCompleted: boolean;
  onToggleStatus: () => void;
  // Date
  editDueDate: string;
  todayStr: string;
  onSelectDueDate: (dateStr: string) => void;
  // Recurrence
  editIsRecurring: boolean;
  setEditIsRecurring: React.Dispatch<React.SetStateAction<boolean>>;
  editRecurrenceInterval: number;
  setEditRecurrenceInterval: React.Dispatch<React.SetStateAction<number>>;
  editRecurrenceUnit: DailyTaskRecurrenceUnit;
  setEditRecurrenceUnit: React.Dispatch<React.SetStateAction<DailyTaskRecurrenceUnit>>;
  editShowCustomRecurrence: boolean;
  setEditShowCustomRecurrence: React.Dispatch<React.SetStateAction<boolean>>;
  autoSaveTask: (updates: Partial<DailyTask>) => void;
  // Priority
  editPriority: DailyTaskPriority;
  onSelectPriority: (priority: DailyTaskPriority) => void;
  // Tags
  userTags: DailyTag[];
  editTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onOpenCreateTag: () => void;
  // Subtasks
  editSubtasks: DailySubtask[];
  onToggleSubtask: (subtaskId: string) => void;
  onDeleteSubtask: (subtaskId: string) => void;
  onUpdateSubtask?: (subtaskId: string, newTitle: string) => void;
  onBlurSubtask?: () => void;
  editSubtaskTitle: string;
  onChangeSubtaskTitle: (text: string) => void;
  onAddSubtask: () => void;
  // Notes / Description
  editDescription: string;
  onEditDescriptionChange: (text: string) => void;
  onEditDescriptionBlur: () => void;
  // Convert
  onConvertToBucket: (task: DailyTask) => void;
  // Nested Tag Modal slot
  nestedTagModal?: React.ReactNode;
}

export function EditDailyTaskModal({
  visible,
  editingTask,
  onClose,
  editTitle,
  onEditTitleChange,
  onEditTitleBlur,
  editIsFavorite,
  onToggleFavorite,
  editIsCompleted,
  onToggleStatus,
  editDueDate,
  todayStr,
  onSelectDueDate,
  editIsRecurring,
  setEditIsRecurring,
  editRecurrenceInterval,
  setEditRecurrenceInterval,
  editRecurrenceUnit,
  setEditRecurrenceUnit,
  editShowCustomRecurrence,
  setEditShowCustomRecurrence,
  autoSaveTask,
  editPriority,
  onSelectPriority,
  userTags,
  editTagIds,
  onToggleTag,
  onOpenCreateTag,
  editSubtasks,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtask,
  onBlurSubtask,
  editSubtaskTitle,
  onChangeSubtaskTitle,
  onAddSubtask,
  editDescription,
  onEditDescriptionChange,
  onEditDescriptionBlur,
  onConvertToBucket,
  nestedTagModal,
}: EditDailyTaskModalProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = getDateFnsLocale(i18n.language);
  const { height: windowHeight } = useWindowDimensions();
  const availableScrollHeight = windowHeight - (Platform.OS === 'ios' ? 260 : 220);
  const maxScrollHeight = Math.max(180, Math.min(Platform.OS === 'web' ? 380 : 320, availableScrollHeight));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialScroll = useRef(true);

  useEffect(() => {
    if (visible && editingTask) {
      isInitialScroll.current = true;
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      const t1 = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      const t2 = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 150);
      const t3 = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        isInitialScroll.current = false;
      }, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [visible, editingTask?.id]);

  const handleShow = () => {
    isInitialScroll.current = true;
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, 40);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, 120);
  };

  if (!visible || !editingTask) return null;

  return (
    <>
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
        onShow={handleShow}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={[styles.fullModalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>{t('daily.edit_modal_title')}</Text>
                <Pressable
                  onPress={onToggleFavorite}
                  hitSlop={8}
                  style={{ padding: 4 }}
                  accessibilityLabel={editIsFavorite ? t('daily.unpin_task') : t('daily.pin_task')}
                >
                  <Pin
                    size={18}
                    color={editIsFavorite ? gold[400] : theme.colors.foregroundMuted}
                    fill={editIsFavorite ? gold[400] : 'transparent'}
                  />
                </Pressable>
                <Pressable
                  onPress={onToggleStatus}
                  hitSlop={6}
                  style={[
                    styles.editStatusPill,
                    { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                    editIsCompleted && styles.editStatusPillCompleted,
                  ]}
                  accessibilityLabel={t('daily.change_status')}
                >
                  {editIsCompleted ? (
                    <>
                      <CheckCircle2 size={13} color="#34C759" />
                      <Text style={styles.editStatusPillTextCompleted}>{t('common.status_completed')}</Text>
                    </>
                  ) : (
                    <>
                      <Circle size={13} color={theme.colors.foregroundMuted} />
                      <Text style={[styles.editStatusPillText, { color: theme.colors.foregroundMuted }]}>{t('common.status_pending')}</Text>
                    </>
                  )}
                </Pressable>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={20} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              style={{ maxHeight: maxScrollHeight }}
              contentContainerStyle={{ paddingBottom: 16 }}
              onContentSizeChange={() => {
                if (isInitialScroll.current) {
                  scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                }
              }}
            >
              {/* Título */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>{t('daily.title_required')}</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.foreground,
                  },
                ]}
                placeholder={t('daily.edit_modal_placeholder')}
                placeholderTextColor={theme.colors.foregroundMuted}
                value={editTitle}
                onChangeText={onEditTitleChange}
                onBlur={onEditTitleBlur}
              />

              {/* Fecha */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>{t('daily.date_label')}</Text>
              <View style={styles.modalPresetsRow}>
                {[
                  { label: t('daily.today'), value: todayStr },
                  { label: t('daily.tomorrow'), value: toDateString(addDays(new Date(), 1)) },
                  { label: t('daily.plus_7_days'), value: toDateString(addDays(new Date(), 7)) },
                ].map((preset) => {
                  const isActive = editDueDate === preset.value;
                  return (
                    <Pressable
                      key={preset.value}
                      style={[
                        styles.modalPresetBtn,
                        {
                          backgroundColor: isActive
                            ? (theme.dark ? '#2A2210' : '#FDF4DC')
                            : (theme.colors.surfaceElevated ?? theme.colors.surface),
                          borderColor: isActive ? gold[400] : theme.colors.border,
                        },
                      ]}
                      onPress={() => onSelectDueDate(preset.value)}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          { color: isActive ? (theme.dark ? gold[400] : '#926F12') : theme.colors.foregroundMuted },
                          isActive && { fontFamily: 'Inter_600SemiBold' },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[
                  styles.datePickerTrigger,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={16} color={gold[400]} />
                <Text style={[styles.datePickerTriggerText, { color: theme.colors.foreground }]}>
                  {format(parseLocalDate(editDueDate), t('daily.date_format_full'), { locale: dateFnsLocale })}
                </Text>
              </Pressable>

              {/* Recurrencia */}
              <RecurrenceSelector
                isCreate={false}
                isRecurring={editIsRecurring}
                setIsRecurring={setEditIsRecurring}
                interval={editRecurrenceInterval}
                setInterval={setEditRecurrenceInterval}
                unit={editRecurrenceUnit}
                setUnit={setEditRecurrenceUnit}
                showCustom={editShowCustomRecurrence}
                setShowCustom={setEditShowCustomRecurrence}
                onAutoSave={autoSaveTask}
              />

              {/* Prioridad */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>{t('daily.priority_label')}</Text>
              <View style={styles.prioritySelectorRow}>
                {PRIORITY_ORDER.map((p) => {
                  const cfg = getPriorityConfig(p, theme.dark, i18n.language);
                  const isSelected = editPriority === p;
                  return (
                    <Pressable
                      key={p}
                      style={[
                        styles.prioritySelectorPill,
                        {
                          backgroundColor: isSelected
                            ? cfg.bgColor
                            : (theme.colors.surfaceElevated ?? theme.colors.surface),
                          borderColor: isSelected ? cfg.borderColor : theme.colors.border,
                        },
                      ]}
                      onPress={() => onSelectPriority(p)}
                    >
                      <Flag
                        size={12}
                        color={isSelected ? cfg.color : theme.colors.foregroundMuted}
                        strokeWidth={isSelected ? 2.5 : 1.8}
                      />
                      <Text
                        style={[
                          styles.prioritySelectorPillText,
                          { color: isSelected ? cfg.color : theme.colors.foregroundMuted },
                          isSelected && { fontFamily: 'Inter_600SemiBold' },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Etiquetas */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>{t('daily.tags_label')}</Text>
              <View style={styles.tagsToggleContainer}>
                {userTags.map((tag) => {
                  const isSelected = editTagIds.includes(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      style={[
                        styles.tagTogglePill,
                        { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                        isSelected && {
                          borderColor: tag.color || gold[400],
                          backgroundColor: tag.color ? `${tag.color}2A` : (theme.dark ? '#262012' : '#FDF4DC'),
                        },
                      ]}
                      onPress={() => onToggleTag(tag.id)}
                    >
                      {tag.emoji && <Text style={{ fontSize: 11, marginRight: 4 }}>{tag.emoji}</Text>}
                      <Text
                        style={[
                          styles.tagToggleText,
                          { color: theme.colors.foregroundMuted },
                          isSelected && { color: tag.color || gold[400], fontFamily: 'Inter_600SemiBold' },
                        ]}
                      >
                        {tag.name}
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  style={[
                    styles.addTagPill,
                    { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={onOpenCreateTag}
                >
                  <Plus size={12} color={gold[400]} />
                  <Text style={styles.addTagPillText}>{t('daily.create_tag_btn')}</Text>
                </Pressable>
              </View>

              {/* SUBTAREAS */}
              <View style={styles.subtasksHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ListChecks size={15} color={gold[400]} />
                  <Text style={[styles.fieldLabelNoMargin, { color: theme.colors.foregroundMuted }]}>{t('daily.subtasks_label')}</Text>
                </View>
                {editSubtasks.length > 0 && (
                  <View
                    style={[
                      styles.subtasksCounterBadge,
                      {
                        backgroundColor: theme.dark ? '#262010' : '#FDF4DC',
                        borderColor: theme.dark ? '#3D3310' : '#E8C56A',
                      },
                    ]}
                  >
                    <Text style={[styles.subtasksCounterBadgeText, { color: theme.dark ? gold[400] : '#926F12' }]}>
                      {editSubtasks.filter((s) => s.is_completed).length}/{editSubtasks.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Lista de subtareas en edición */}
              {editSubtasks.length > 0 && (
                <View
                  style={[
                    styles.subtasksContainer,
                    {
                      backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {editSubtasks.map((st) => (
                    <View
                      key={st.id}
                      style={[
                        styles.subtaskItemRow,
                        {
                          backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                          borderBottomColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Pressable
                        hitSlop={6}
                        onPress={() => onToggleSubtask(st.id)}
                        style={styles.subtaskCheckBtn}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: st.is_completed }}
                      >
                        {st.is_completed ? (
                          <CheckCircle2 size={17} color="#34C759" />
                        ) : (
                          <View style={[styles.subtaskUncheckedCircle, { borderColor: theme.colors.foregroundMuted }]} />
                        )}
                      </Pressable>
                      <TextInput
                        style={[
                          styles.subtaskItemTitle,
                          {
                            color: theme.colors.foreground,
                            paddingVertical: Platform.OS === 'ios' ? 4 : 2,
                            paddingHorizontal: 0,
                          },
                          st.is_completed && styles.subtaskItemTitleCompleted,
                        ]}
                        value={st.title}
                        onChangeText={(text) => onUpdateSubtask?.(st.id, text)}
                        onBlur={onBlurSubtask}
                        placeholder={t('daily.subtask_title_placeholder', 'Título de la subtarea')}
                        placeholderTextColor={theme.colors.foregroundMuted}
                        returnKeyType="done"
                      />
                      <Pressable
                        hitSlop={8}
                        onPress={() => onDeleteSubtask(st.id)}
                        style={styles.subtaskDeleteBtn}
                        accessibilityLabel={t('daily.delete_subtask')}
                      >
                        <X size={14} color={theme.colors.foregroundMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Input para añadir subtarea */}
              <View
                style={[
                  styles.addSubtaskInputWrapper,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.addSubtaskInput,
                    {
                      color: theme.colors.foreground,
                      backgroundColor: 'transparent',
                    },
                  ]}
                  placeholder={t('daily.add_subtask_placeholder')}
                  placeholderTextColor={theme.colors.foregroundMuted}
                  value={editSubtaskTitle}
                  onChangeText={onChangeSubtaskTitle}
                  onSubmitEditing={onAddSubtask}
                  returnKeyType="done"
                />
                <Pressable
                  style={[
                    styles.addSubtaskActionBtn,
                    !editSubtaskTitle.trim() && { backgroundColor: theme.dark ? '#262626' : '#E6E1D5' },
                  ]}
                  onPress={onAddSubtask}
                  disabled={!editSubtaskTitle.trim()}
                  accessibilityLabel={t('daily.create_subtask')}
                >
                  <Plus
                    size={16}
                    color={editSubtaskTitle.trim() ? '#0E0E0E' : theme.colors.foregroundMuted}
                    strokeWidth={2.5}
                  />
                </Pressable>
              </View>

              {/* Notas */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>{t('daily.notes_optional')}</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  styles.modalTextArea,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.foreground,
                  },
                ]}
                placeholder={t('daily.notes_placeholder')}
                placeholderTextColor={theme.colors.foregroundMuted}
                value={editDescription}
                onChangeText={onEditDescriptionChange}
                onBlur={onEditDescriptionBlur}
                multiline
                numberOfLines={3}
              />


              {/* Convertir en Bucket List Option */}
              <Pressable
                style={[
                  styles.convertBucketCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => onConvertToBucket(editingTask)}
              >
                <View style={styles.convertBucketLeft}>
                  <View style={styles.convertBucketIconCircle}>
                    <Sparkles size={16} color={gold[400]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.convertBucketTitle, { color: theme.colors.foreground }]}>{t('daily.convert_to_bucket')}</Text>
                    <Text style={[styles.convertBucketSubtitle, { color: theme.colors.foregroundMuted }]}>
                      {t('daily.convert_to_bucket_desc')}
                    </Text>
                  </View>
                </View>
                <BookmarkPlus size={18} color={gold[400]} />
              </Pressable>
            </ScrollView>
          </View>
          {nestedTagModal}
        </KeyboardAvoidingView>
      </Modal>

      {/* UniversalDatePicker for Edit Modal */}
      {showDatePicker && (
        <UniversalDatePicker
          value={parseLocalDate(editDueDate)}
          onChange={(selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              onSelectDueDate(toDateString(selectedDate));
            }
          }}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </>
  );
}

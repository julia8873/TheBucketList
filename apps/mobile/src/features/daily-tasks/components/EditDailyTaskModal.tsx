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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  X,
  Plus,
  Star,
  Flag,
  Calendar,
  ListChecks,
  CheckCircle2,
  Circle,
  Sparkles,
  BookmarkPlus,
} from 'lucide-react-native';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

import { gold, useTheme } from '@bucketlist/ui';
import { styles } from '../styles/explore.styles';
import {
  DailyTask,
  DailyTag,
  DailySubtask,
  DailyTaskPriority,
  DailyTaskRecurrenceUnit,
} from '../types';
import { PRIORITY_CONFIG, PRIORITY_ORDER } from '../constants';
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialScroll = useRef(true);

  useEffect(() => {
    if (visible) {
      isInitialScroll.current = true;
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleShow = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
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
                <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>Editar tarea</Text>
                <Pressable
                  onPress={onToggleFavorite}
                  hitSlop={8}
                  style={{ padding: 4 }}
                  accessibilityLabel="Marcar como favorita"
                >
                  <Star
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
                  accessibilityLabel="Cambiar estado completada o pendiente"
                >
                  {editIsCompleted ? (
                    <>
                      <CheckCircle2 size={13} color="#34C759" />
                      <Text style={styles.editStatusPillTextCompleted}>Completada</Text>
                    </>
                  ) : (
                    <>
                      <Circle size={13} color={theme.colors.foregroundMuted} />
                      <Text style={[styles.editStatusPillText, { color: theme.colors.foregroundMuted }]}>Pendiente</Text>
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
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ paddingBottom: 6 }}
              onContentSizeChange={() => {
                if (isInitialScroll.current) {
                  scrollViewRef.current?.scrollTo({ y: 0, animated: false });
                  isInitialScroll.current = false;
                }
              }}
            >
              {/* Título */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Título *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.foreground,
                  },
                ]}
                placeholder="Título de la tarea"
                placeholderTextColor={theme.colors.foregroundMuted}
                value={editTitle}
                onChangeText={onEditTitleChange}
                onBlur={onEditTitleBlur}
              />

              {/* Fecha */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Fecha</Text>
              <View style={styles.modalPresetsRow}>
                <Pressable
                  style={[
                    styles.modalPresetBtn,
                    { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                    editDueDate === todayStr && styles.modalPresetBtnActive,
                  ]}
                  onPress={() => onSelectDueDate(todayStr)}
                >
                  <Text
                    style={[
                      styles.modalPresetText,
                      { color: theme.colors.foregroundMuted },
                      editDueDate === todayStr && styles.modalPresetTextActive,
                    ]}
                  >
                    Hoy
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalPresetBtn,
                    { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                    editDueDate === toDateString(addDays(new Date(), 1)) &&
                      styles.modalPresetBtnActive,
                  ]}
                  onPress={() => {
                    const d = toDateString(addDays(new Date(), 1));
                    onSelectDueDate(d);
                  }}
                >
                  <Text
                    style={[
                      styles.modalPresetText,
                      { color: theme.colors.foregroundMuted },
                      editDueDate === toDateString(addDays(new Date(), 1)) &&
                        styles.modalPresetTextActive,
                    ]}
                  >
                    Mañana
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalPresetBtn,
                    { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                    editDueDate === toDateString(addDays(new Date(), 7)) &&
                      styles.modalPresetBtnActive,
                  ]}
                  onPress={() => {
                    const d = toDateString(addDays(new Date(), 7));
                    onSelectDueDate(d);
                  }}
                >
                  <Text
                    style={[
                      styles.modalPresetText,
                      { color: theme.colors.foregroundMuted },
                      editDueDate === toDateString(addDays(new Date(), 7)) &&
                        styles.modalPresetTextActive,
                    ]}
                  >
                    +7 días
                  </Text>
                </Pressable>
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
                  {format(parseLocalDate(editDueDate), "EEEE, d 'de' MMMM", { locale: es })}
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
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Prioridad</Text>
              <View style={styles.prioritySelectorRow}>
                {PRIORITY_ORDER.map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  const isSelected = editPriority === p;
                  return (
                    <Pressable
                      key={p}
                      style={[
                        styles.prioritySelectorPill,
                        isSelected && {
                          backgroundColor: cfg.bgColor,
                          borderColor: cfg.borderColor,
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
                          isSelected && { color: cfg.color, fontFamily: 'Inter_600SemiBold' },
                        ]}
                      >
                        {cfg.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Etiquetas */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Etiquetas</Text>
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
                  <Text style={styles.addTagPillText}>Crear</Text>
                </Pressable>
              </View>

              {/* SUBTAREAS */}
              <View style={styles.subtasksHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ListChecks size={15} color={gold[400]} />
                  <Text style={[styles.fieldLabelNoMargin, { color: theme.colors.foregroundMuted }]}>Subtareas</Text>
                </View>
                {editSubtasks.length > 0 && (
                  <View style={styles.subtasksCounterBadge}>
                    <Text style={styles.subtasksCounterBadgeText}>
                      {editSubtasks.filter((s) => s.is_completed).length}/{editSubtasks.length}
                    </Text>
                  </View>
                )}
              </View>

              {/* Lista de subtareas en edición */}
              {editSubtasks.length > 0 && (
                <View style={styles.subtasksContainer}>
                  {editSubtasks.map((st) => (
                    <View
                      key={st.id}
                      style={[
                        styles.subtaskItemRow,
                        { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
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
                          <View style={[styles.subtaskUncheckedCircle, { borderColor: theme.colors.border }]} />
                        )}
                      </Pressable>
                      <Text
                        style={[
                          styles.subtaskItemTitle,
                          { color: theme.colors.foreground },
                          st.is_completed && styles.subtaskItemTitleCompleted,
                        ]}
                        numberOfLines={2}
                      >
                        {st.title}
                      </Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => onDeleteSubtask(st.id)}
                        style={styles.subtaskDeleteBtn}
                        accessibilityLabel="Eliminar subtarea"
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
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <TextInput
                  style={[styles.addSubtaskInput, { color: theme.colors.foreground }]}
                  placeholder="Añadir una subtarea..."
                  placeholderTextColor={theme.colors.foregroundMuted}
                  value={editSubtaskTitle}
                  onChangeText={onChangeSubtaskTitle}
                  onSubmitEditing={onAddSubtask}
                  returnKeyType="done"
                />
                <Pressable
                  style={[
                    styles.addSubtaskActionBtn,
                    !editSubtaskTitle.trim() && styles.addSubtaskActionBtnDisabled,
                  ]}
                  onPress={onAddSubtask}
                  disabled={!editSubtaskTitle.trim()}
                  accessibilityLabel="Crear subtarea"
                >
                  <Plus size={16} color={editSubtaskTitle.trim() ? '#0E0E0E' : '#555'} strokeWidth={2.5} />
                </Pressable>
              </View>

              {/* Notas */}
              <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Notas (opcional)</Text>
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
                placeholder="Detalles, notas, apuntes..."
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
                    <Text style={[styles.convertBucketTitle, { color: theme.colors.foreground }]}>Convertir en Bucket List</Text>
                    <Text style={[styles.convertBucketSubtitle, { color: theme.colors.foregroundMuted }]}>
                      Pasa esta tarea rápida a tu lista de metas y objetivos
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

      {/* DateTimePicker for Edit Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={parseLocalDate(editDueDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              onSelectDueDate(toDateString(selectedDate));
            }
          }}
        />
      )}
    </>
  );
}

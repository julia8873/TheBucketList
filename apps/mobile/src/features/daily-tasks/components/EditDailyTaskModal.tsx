import React, { useState } from 'react';
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

import { gold } from '@bucketlist/ui/src/tokens/colors';
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (!visible || !editingTask) return null;

  return (
    <>
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.fullModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.modalTitle}>Editar tarea</Text>
                <Pressable
                  onPress={onToggleFavorite}
                  hitSlop={8}
                  style={{ padding: 4 }}
                  accessibilityLabel="Marcar como favorita"
                >
                  <Star
                    size={18}
                    color={editIsFavorite ? gold[400] : '#666'}
                    fill={editIsFavorite ? gold[400] : 'transparent'}
                  />
                </Pressable>
                <Pressable
                  onPress={onToggleStatus}
                  hitSlop={6}
                  style={[
                    styles.editStatusPill,
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
                      <Circle size={13} color="#888" />
                      <Text style={styles.editStatusPillText}>Pendiente</Text>
                    </>
                  )}
                </Pressable>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={20} color="#888" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ paddingBottom: 6 }}
            >
              {/* Título */}
              <Text style={styles.fieldLabel}>Título *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Título de la tarea"
                placeholderTextColor="#666"
                value={editTitle}
                onChangeText={onEditTitleChange}
                onBlur={onEditTitleBlur}
              />

              {/* Fecha */}
              <Text style={styles.fieldLabel}>Fecha</Text>
              <View style={styles.modalPresetsRow}>
                <Pressable
                  style={[
                    styles.modalPresetBtn,
                    editDueDate === todayStr && styles.modalPresetBtnActive,
                  ]}
                  onPress={() => onSelectDueDate(todayStr)}
                >
                  <Text
                    style={[
                      styles.modalPresetText,
                      editDueDate === todayStr && styles.modalPresetTextActive,
                    ]}
                  >
                    Hoy
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalPresetBtn,
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
                      editDueDate === toDateString(addDays(new Date(), 7)) &&
                        styles.modalPresetTextActive,
                    ]}
                  >
                    +7 días
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.datePickerTrigger}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={16} color={gold[400]} />
                <Text style={styles.datePickerTriggerText}>
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
              <Text style={styles.fieldLabel}>Prioridad</Text>
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
                        color={isSelected ? cfg.color : '#777'}
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
              <Text style={styles.fieldLabel}>Etiquetas</Text>
              <View style={styles.tagsToggleContainer}>
                {userTags.map((tag) => {
                  const isSelected = editTagIds.includes(tag.id);
                  return (
                    <Pressable
                      key={tag.id}
                      style={[
                        styles.tagTogglePill,
                        isSelected && {
                          borderColor: tag.color || gold[400],
                          backgroundColor: tag.color ? `${tag.color}2A` : '#262012',
                        },
                      ]}
                      onPress={() => onToggleTag(tag.id)}
                    >
                      {tag.emoji && <Text style={{ fontSize: 11, marginRight: 4 }}>{tag.emoji}</Text>}
                      <Text
                        style={[
                          styles.tagToggleText,
                          isSelected && { color: tag.color || gold[400], fontFamily: 'Inter_600SemiBold' },
                        ]}
                      >
                        {tag.name}
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  style={styles.addTagPill}
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
                  <Text style={styles.fieldLabelNoMargin}>Subtareas</Text>
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
                    <View key={st.id} style={styles.subtaskItemRow}>
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
                          <View style={styles.subtaskUncheckedCircle} />
                        )}
                      </Pressable>
                      <Text
                        style={[
                          styles.subtaskItemTitle,
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
                        <X size={14} color="#666" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Input para añadir subtarea */}
              <View style={styles.addSubtaskInputWrapper}>
                <TextInput
                  style={styles.addSubtaskInput}
                  placeholder="Añadir una subtarea..."
                  placeholderTextColor="#666"
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
              <Text style={styles.fieldLabel}>Notas (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Detalles, notas, apuntes..."
                placeholderTextColor="#666"
                value={editDescription}
                onChangeText={onEditDescriptionChange}
                onBlur={onEditDescriptionBlur}
                multiline
                numberOfLines={3}
              />


              {/* Convertir en Bucket List Option */}
              <Pressable
                style={styles.convertBucketCard}
                onPress={() => onConvertToBucket(editingTask)}
              >
                <View style={styles.convertBucketLeft}>
                  <View style={styles.convertBucketIconCircle}>
                    <Sparkles size={16} color={gold[400]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.convertBucketTitle}>Convertir en Bucket List</Text>
                    <Text style={styles.convertBucketSubtitle}>
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

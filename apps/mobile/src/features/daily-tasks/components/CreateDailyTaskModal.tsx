import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Star,
  X,
  Calendar,
  Flag,
  Plus,
  ListChecks,
  CheckCircle2,
  Users,
} from 'lucide-react-native';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/explore.styles';
import { RecurrenceSelector } from './RecurrenceSelector';
import { parseLocalDate, toDateString } from '../utils/dailyTaskDateUtils';
import { PRIORITY_ORDER, PRIORITY_CONFIG } from '../constants';
import type {
  DailyTaskPriority,
  DailyTaskRecurrenceUnit,
  DailySubtask,
  DailyTag,
  CollaboratorItem,
} from '../types';

interface CreateDailyTaskModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  dueDate: string;
  setDueDate: (val: string) => void;
  todayStr: string;
  onOpenDatePicker: () => void;
  priority: DailyTaskPriority;
  setPriority: (val: DailyTaskPriority) => void;
  isFavorite: boolean;
  setIsFavorite: React.Dispatch<React.SetStateAction<boolean>>;
  isRecurring: boolean;
  setIsRecurring: React.Dispatch<React.SetStateAction<boolean>>;
  recurrenceInterval: number;
  setRecurrenceInterval: React.Dispatch<React.SetStateAction<number>>;
  recurrenceUnit: DailyTaskRecurrenceUnit;
  setRecurrenceUnit: React.Dispatch<React.SetStateAction<DailyTaskRecurrenceUnit>>;
  showCustomRecurrence: boolean;
  setShowCustomRecurrence: React.Dispatch<React.SetStateAction<boolean>>;
  tagIds: string[];
  setTagIds: React.Dispatch<React.SetStateAction<string[]>>;
  userTags: DailyTag[];
  onOpenCreateTag: () => void;
  subtasks: DailySubtask[];
  subtaskTitle: string;
  setSubtaskTitle: (val: string) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  collaborators: CollaboratorItem[];
  setCollaborators: React.Dispatch<React.SetStateAction<CollaboratorItem[]>>;
  onOpenCollaboratorPicker: () => void;
  onSubmit: () => void;
  renderTagModal?: React.ReactNode;
}

export const CreateDailyTaskModal: React.FC<CreateDailyTaskModalProps> = ({
  visible,
  onClose,
  title,
  setTitle,
  description,
  setDescription,
  dueDate,
  setDueDate,
  todayStr,
  onOpenDatePicker,
  priority,
  setPriority,
  isFavorite,
  setIsFavorite,
  isRecurring,
  setIsRecurring,
  recurrenceInterval,
  setRecurrenceInterval,
  recurrenceUnit,
  setRecurrenceUnit,
  showCustomRecurrence,
  setShowCustomRecurrence,
  tagIds,
  setTagIds,
  userTags,
  onOpenCreateTag,
  subtasks,
  subtaskTitle,
  setSubtaskTitle,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  collaborators,
  setCollaborators,
  onOpenCollaboratorPicker,
  onSubmit,
  renderTagModal,
}) => {
  if (!visible) return null;

  return (
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
              <Text style={styles.modalTitle}>Nueva tarea</Text>
              <Pressable
                onPress={() => setIsFavorite((prev) => !prev)}
                hitSlop={8}
                style={{ padding: 4 }}
                accessibilityLabel="Marcar como favorita"
              >
                <Star
                  size={18}
                  color={isFavorite ? gold[400] : '#666'}
                  fill={isFavorite ? gold[400] : 'transparent'}
                />
              </Pressable>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            {/* Título */}
            <Text style={styles.fieldLabel}>Título *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="¿Qué necesitas hacer?"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            {/* Fecha */}
            <Text style={styles.fieldLabel}>Fecha</Text>
            <View style={styles.modalPresetsRow}>
              <Pressable
                style={[
                  styles.modalPresetBtn,
                  dueDate === todayStr && styles.modalPresetBtnActive,
                ]}
                onPress={() => setDueDate(todayStr)}
              >
                <Text
                  style={[
                    styles.modalPresetText,
                    dueDate === todayStr && styles.modalPresetTextActive,
                  ]}
                >
                  Hoy
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPresetBtn,
                  dueDate === toDateString(addDays(new Date(), 1)) &&
                    styles.modalPresetBtnActive,
                ]}
                onPress={() => setDueDate(toDateString(addDays(new Date(), 1)))}
              >
                <Text
                  style={[
                    styles.modalPresetText,
                    dueDate === toDateString(addDays(new Date(), 1)) &&
                      styles.modalPresetBtnActive,
                  ]}
                >
                  Mañana
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPresetBtn,
                  dueDate === toDateString(addDays(new Date(), 7)) &&
                    styles.modalPresetBtnActive,
                ]}
                onPress={() => setDueDate(toDateString(addDays(new Date(), 7)))}
              >
                <Text
                  style={[
                    styles.modalPresetText,
                    dueDate === toDateString(addDays(new Date(), 7)) &&
                      styles.modalPresetTextActive,
                  ]}
                >
                  +7 días
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.datePickerTrigger}
              onPress={onOpenDatePicker}
            >
              <Calendar size={16} color={gold[400]} />
              <Text style={styles.datePickerTriggerText}>
                {format(parseLocalDate(dueDate), "EEEE, d 'de' MMMM", { locale: es })}
              </Text>
            </Pressable>

            {/* Recurrencia */}
            <RecurrenceSelector
              isCreate
              isRecurring={isRecurring}
              setIsRecurring={setIsRecurring}
              interval={recurrenceInterval}
              setInterval={setRecurrenceInterval}
              unit={recurrenceUnit}
              setUnit={setRecurrenceUnit}
              showCustom={showCustomRecurrence}
              setShowCustom={setShowCustomRecurrence}
            />

            {/* Prioridad */}
            <Text style={styles.fieldLabel}>Prioridad</Text>
            <View style={styles.prioritySelectorRow}>
              {PRIORITY_ORDER.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const isSelected = priority === p;
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
                    onPress={() => setPriority(p)}
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
                const isSelected = tagIds.includes(tag.id);
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
                    onPress={() => {
                      setTagIds((prev) =>
                        isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                      );
                    }}
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
              {subtasks.length > 0 && (
                <View style={styles.subtasksCounterBadge}>
                  <Text style={styles.subtasksCounterBadgeText}>
                    {subtasks.filter((s) => s.is_completed).length}/{subtasks.length}
                  </Text>
                </View>
              )}
            </View>

            {/* Lista de subtareas en creación */}
            {subtasks.length > 0 && (
              <View style={styles.subtasksContainer}>
                {subtasks.map((st) => (
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
                value={subtaskTitle}
                onChangeText={setSubtaskTitle}
                onSubmitEditing={onAddSubtask}
                returnKeyType="done"
              />
              <Pressable
                style={[
                  styles.addSubtaskActionBtn,
                  !subtaskTitle.trim() && styles.addSubtaskActionBtnDisabled,
                ]}
                onPress={onAddSubtask}
                disabled={!subtaskTitle.trim()}
                accessibilityLabel="Crear subtarea"
              >
                <Plus size={16} color={subtaskTitle.trim() ? '#0E0E0E' : '#555'} strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* Notas */}
            <Text style={styles.fieldLabel}>Notas (opcional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Detalles, enlaces, apuntes..."
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* COLABORADORES */}
            <View style={styles.collabSectionHeader}>
              <Text style={styles.fieldLabel}>Colaboradores</Text>
              {collaborators.length > 0 && (
                <Text style={styles.collabCountText}>({collaborators.length})</Text>
              )}
            </View>

            <Pressable
              style={styles.collaboratorRow}
              onPress={onOpenCollaboratorPicker}
            >
              <Users color="#D4B13A" size={18} />
              <Text style={styles.collaboratorPlaceholder} numberOfLines={1}>
                {collaborators.length === 0
                  ? 'Mencionar a personas colaboradoras...'
                  : `${collaborators.length} colaborador${collaborators.length > 1 ? 'es' : ''} añadido${collaborators.length > 1 ? 's' : ''}`}
              </Text>
              <Plus color="#D4B13A" size={18} />
            </Pressable>

            {collaborators.length > 0 && (
              <View style={styles.collaboratorChips}>
                {collaborators.map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.collaboratorChip}
                    onPress={() =>
                      setCollaborators((prev) => prev.filter((x) => x.id !== c.id))
                    }
                  >
                    <Text style={styles.collaboratorChipText}>
                      {c.display_name || `@${c.username}`}
                    </Text>
                    <X color="#D4B13A" size={13} />
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalFooterRow}>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={onClose}
            >
              <Text style={styles.modalCancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalSubmitBtn,
                !title.trim() && styles.modalSubmitBtnDisabled,
              ]}
              disabled={!title.trim()}
              onPress={onSubmit}
            >
              <Text style={styles.modalSubmitBtnText}>Crear tarea</Text>
            </Pressable>
          </View>
        </View>
        {renderTagModal}
      </KeyboardAvoidingView>
    </Modal>
  );
};

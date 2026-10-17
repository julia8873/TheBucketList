import React, { useRef, useEffect } from 'react';
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
} from 'lucide-react-native';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { gold, useTheme } from '@bucketlist/ui';
import { styles } from '../styles/explore.styles';
import { RecurrenceSelector } from './RecurrenceSelector';
import { parseLocalDate, toDateString } from '../utils/dailyTaskDateUtils';
import { PRIORITY_ORDER, PRIORITY_CONFIG } from '../constants';
import type {
  DailyTaskPriority,
  DailyTaskRecurrenceUnit,
  DailySubtask,
  DailyTag,
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
  onSubmit,
  renderTagModal,
}) => {
  const { theme } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const isInitialScroll = useRef(true);

  useEffect(() => {
    if (visible) {
      isInitialScroll.current = true;
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        titleInputRef.current?.focus();
      }, 50);
      const timer2 = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 150);
      return () => {
        clearTimeout(timer);
        clearTimeout(timer2);
      };
    }
  }, [visible]);

  const handleShow = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      titleInputRef.current?.focus();
    }, 40);
  };

  if (!visible) return null;

  return (
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
              <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>Nueva tarea</Text>
              <Pressable
                onPress={() => setIsFavorite((prev) => !prev)}
                hitSlop={8}
                style={{ padding: 4 }}
                accessibilityLabel="Marcar como favorita"
              >
                <Star
                  size={18}
                  color={isFavorite ? gold[400] : theme.colors.foregroundMuted}
                  fill={isFavorite ? gold[400] : 'transparent'}
                />
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
              ref={titleInputRef}
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                },
              ]}
              placeholder="¿Qué necesitas hacer?"
              placeholderTextColor={theme.colors.foregroundMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Fecha */}
            <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Fecha</Text>
            <View style={styles.modalPresetsRow}>
              <Pressable
                style={[
                  styles.modalPresetBtn,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  dueDate === todayStr && styles.modalPresetBtnActive,
                ]}
                onPress={() => setDueDate(todayStr)}
              >
                <Text
                  style={[
                    styles.modalPresetText,
                    { color: theme.colors.foregroundMuted },
                    dueDate === todayStr && styles.modalPresetTextActive,
                  ]}
                >
                  Hoy
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalPresetBtn,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  dueDate === toDateString(addDays(new Date(), 1)) &&
                    styles.modalPresetBtnActive,
                ]}
                onPress={() => setDueDate(toDateString(addDays(new Date(), 1)))}
              >
                <Text
                  style={[
                    styles.modalPresetText,
                    { color: theme.colors.foregroundMuted },
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
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  dueDate === toDateString(addDays(new Date(), 7)) &&
                    styles.modalPresetBtnActive,
                ]}
                onPress={() => setDueDate(toDateString(addDays(new Date(), 7)))}
              >
                <Text
                  style={[
                    styles.modalPresetText,
                    { color: theme.colors.foregroundMuted },
                    dueDate === toDateString(addDays(new Date(), 7)) &&
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
              onPress={onOpenDatePicker}
            >
              <Calendar size={16} color={gold[400]} />
              <Text style={[styles.datePickerTriggerText, { color: theme.colors.foreground }]}>
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
            <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Prioridad</Text>
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
                const isSelected = tagIds.includes(tag.id);
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
              placeholder="Detalles, enlaces, apuntes..."
              placeholderTextColor={theme.colors.foregroundMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalFooterRow}>
            <Pressable
              style={[
                styles.modalCancelBtn,
                {
                  backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.modalCancelBtnText, { color: theme.colors.foreground }]}>Cancelar</Text>
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

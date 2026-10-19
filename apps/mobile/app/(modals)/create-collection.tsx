import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Sparkles,
  Plus,
  Trash2,
  ShieldCheck,
  Tag,
  Layers,
  Check,
  Pencil,
  X,
} from 'lucide-react-native';
import { Typography, gold, useTheme } from '@bucketlist/ui';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
import {
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useCollections,
} from '../../src/features/collections/hooks/useCollections';
import { CollectionCard } from '../../src/features/collections/components/CollectionCard';
import { CollectionItem } from '../../src/features/collections/types';

const CATEGORIES = [
  { id: 'general', label: 'General', emoji: '📁' },
  { id: 'viajes', label: 'Viajes', emoji: '✈️' },
  { id: 'experiencias', label: 'Experiencias', emoji: '🔥' },
  { id: 'gastronomia', label: 'Gastronomía', emoji: '🍕' },
  { id: 'crecimiento', label: 'Crecimiento', emoji: '🌱' },
  { id: 'fitness', label: 'Fitness & Deporte', emoji: '⚡' },
  { id: 'cultura', label: 'Cultura & Ocio', emoji: '🎭' },
  { id: 'pareja', label: 'En Pareja', emoji: '❤️' },
];

const GRADIENT_PRESETS: { name: string; colors: [string, string, ...string[]] }[] = [
  { name: 'Oro Supremo', colors: ['#2A2006', '#59440D', '#D4AF37'] },
  { name: 'Aurora Esmeralda', colors: ['#04261B', '#0E4B43', '#1F8560'] },
  { name: 'Medianoche', colors: ['#0B132B', '#1C2541', '#3A506B'] },
  { name: 'Atardecer Carmesí', colors: ['#3A0CA3', '#7209B7', '#F72585'] },
  { name: 'Obsidiana Mística', colors: ['#121212', '#242424', '#3E3E3E'] },
  { name: 'Océano Cósmico', colors: ['#0A2540', '#0070F3', '#00DFD8'] },
];

const BADGE_PRESETS = [
  '✨ Oficial',
  '🔥 Destacada',
  '🌟 Top Comunidad',
  '👑 VIP',
  '⚡ Imprescindibles',
  '🌱 Nuevas Metas',
];

export default function CreateCollectionModal() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const insets = useSafeAreaInsets();
  const isAdmin = useIsAdmin();
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const deleteMutation = useDeleteCollection();
  const { data: collections = [] } = useCollections();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]?.id ?? 'general');
  const [badge, setBadge] = useState('✨ Colección');
  const [emoji, setEmoji] = useState('📁');
  const [selectedGradientIndex, setSelectedGradientIndex] = useState(0);

  // Dynamic tasks
  const [tasks, setTasks] = useState<{ title: string; description?: string; priority?: 'low' | 'medium' | 'high' }[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);

  // Pre-cargar datos si estamos editando
  useEffect(() => {
    if (isEditing && id) {
      const target = collections.find((c) => c.id === id);
      if (target) {
        setTitle(target.title || '');
        setDescription(target.description || '');
        if (target.category) setCategory(target.category);
        if (target.badge) setBadge(target.badge);
        if (target.emoji) setEmoji(target.emoji);
        if (Array.isArray(target.tasks)) setTasks(target.tasks);

        const matchedIdx = GRADIENT_PRESETS.findIndex((p) =>
          p.colors.every((col, i) => col === target.gradientColors?.[i])
        );
        if (matchedIdx !== -1) setSelectedGradientIndex(matchedIdx);
      }
    }
  }, [isEditing, id, collections]);

  const handleAddOrUpdateTask = () => {
    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      Alert.alert('Atención', 'Introduce el título de la tarea.');
      return;
    }

    const taskObj = {
      title: trimmedTitle,
      description: newTaskDescription.trim() || undefined,
      priority: newTaskPriority,
    };

    if (editingTaskIndex !== null) {
      setTasks((prev) => {
        const next = [...prev];
        next[editingTaskIndex] = taskObj;
        return next;
      });
      setEditingTaskIndex(null);
    } else {
      setTasks((prev) => [...prev, taskObj]);
    }

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
  };

  const handleStartEditTask = (index: number) => {
    const t = tasks[index];
    if (!t) return;
    setEditingTaskIndex(index);
    setNewTaskTitle(t.title);
    setNewTaskDescription(t.description || '');
    setNewTaskPriority(t.priority || 'medium');
  };

  const handleCancelEditTask = () => {
    setEditingTaskIndex(null);
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
  };

  const handleRemoveTask = (index: number) => {
    if (editingTaskIndex === index) {
      handleCancelEditTask();
    }
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Eliminar Colección',
      `¿Estás seguro de que deseas eliminar permanentemente la colección "${title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar la colección');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Campo obligatorio', 'Por favor ingresa un título para la colección.');
      return;
    }

    if (tasks.length === 0) {
      Alert.alert('Tareas requeridas', 'Añade al menos una tarea u objetivo a la colección para que otros usuarios puedan clonarla.');
      return;
    }

    const gradient = GRADIENT_PRESETS[selectedGradientIndex]?.colors || ['#1E1E1E', '#333333'];
    const coverPathJson = JSON.stringify({
      type: 'gradient',
      colors: gradient,
      diagonal: true,
    });

    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({
          id,
          title,
          description,
          category,
          badge,
          emoji,
          gradientColors: gradient,
          cover_path: coverPathJson,
          tasks,
        });
      } else {
        await createMutation.mutateAsync({
          title,
          description,
          category,
          badge,
          emoji,
          gradientColors: gradient,
          cover_path: coverPathJson,
          authorName: 'The Bucket List',
          isOfficial: true,
          tasks,
        });
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || (isEditing ? 'No se pudo actualizar la colección' : 'No se pudo crear la colección'));
    }
  };

  // Preview object
  const previewItem: CollectionItem = {
    id: 'preview-id',
    title: title.trim() || 'Título de la colección',
    description: description.trim() || 'Descripción de la colección donde explicas la temática y objetivos.',
    category,
    badge: badge || '✨ Colección',
    emoji: emoji || '📁',
    gradientColors: GRADIENT_PRESETS[selectedGradientIndex]?.colors || ['#1E1E1E', '#333333'],
    cover_path: '',
    author: {
      name: 'The Bucket List',
      isOfficial: true,
    },
    tasks: tasks.length > 0 ? tasks : [
      { title: 'Ejemplo de primera tarea', priority: 'medium' },
      { title: 'Ejemplo de segunda tarea', priority: 'high' },
    ],
    clonesCount: 0,
    likesCount: 0,
    isLiked: false,
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' }]}>
        <ShieldCheck color="#EF4444" size={56} />
        <Typography variant="h2" style={{ color: theme.colors.foreground, marginTop: 16, textAlign: 'center' }}>
          Acceso Restringido
        </Typography>
        <Typography variant="body" style={{ color: theme.colors.foregroundMuted, marginTop: 8, textAlign: 'center', marginBottom: 24 }}>
          Solo los usuarios con rol de administrador tienen autorización para crear colecciones públicas.
        </Typography>
        <Pressable style={styles.submitBtn} onPress={() => router.back()}>
          <Text style={styles.submitBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 40) + 90 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
              <ChevronLeft color={theme.colors.foreground} size={24} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Typography variant="h3" style={{ color: theme.colors.foreground, fontWeight: 'bold' }}>
                  {isEditing ? 'Editar Colección' : 'Nueva Colección'}
                </Typography>
                <View style={styles.adminBadge}>
                  <ShieldCheck size={12} color="#D4AF37" />
                  <Text style={styles.adminBadgeText}>ADMIN</Text>
                </View>
              </View>
              <Typography variant="caption" style={{ color: theme.colors.foregroundMuted }}>
                {isEditing ? 'Modifica los campos y tareas de la colección' : 'Se publicará en la pestaña de Colecciones para todos los usuarios'}
              </Typography>
            </View>
            {isEditing && (
              <Pressable style={styles.deleteHeaderBtn} onPress={handleDelete} hitSlop={10}>
                <Trash2 color="#EF4444" size={20} />
              </Pressable>
            )}
          </View>

          {/* Vista previa en tiempo real */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Sparkles size={16} color="#D4AF37" />
              <Text style={styles.sectionLabel}>VISTA PREVIA EN VIVO</Text>
            </View>
            <CollectionCard
              collection={previewItem}
              onPress={() => {}}
              onClone={() => {}}
              containerStyle={{ marginHorizontal: 0 }}
            />
          </View>

          {/* Información Básica */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TÍTULO DE LA COLECCIÓN *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 50 Cosas que hacer antes de los 30"
              placeholderTextColor={theme.dark ? '#666' : '#999'}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>DESCRIPCIÓN</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Explica de qué trata esta selección de objetivos..."
              placeholderTextColor={theme.dark ? '#666' : '#999'}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>

          {/* Categoría */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CATEGORÍA TEMÁTICA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      setCategory(cat.id);
                      setEmoji(cat.emoji);
                    }}
                    style={[styles.chip, isSelected && styles.chipActive]}
                  >
                    <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Badge & Estilo */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ETIQUETA SUPERIOR (BADGE)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: ✨ Oficial o 🔥 Tendencia"
              placeholderTextColor={theme.dark ? '#666' : '#999'}
              value={badge}
              onChangeText={setBadge}
              maxLength={30}
            />
            <View style={styles.badgePresetsRow}>
              {BADGE_PRESETS.map((bp) => (
                <Pressable
                  key={bp}
                  onPress={() => setBadge(bp)}
                  style={[styles.badgePresetChip, badge === bp && styles.badgePresetChipActive]}
                >
                  <Text style={[styles.badgePresetText, badge === bp && styles.badgePresetTextActive]}>
                    {bp}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>PALETA VISUAL DEL DEGRADADO</Text>
            <View style={styles.gradientRow}>
              {GRADIENT_PRESETS.map((gp, idx) => {
                const isSelected = selectedGradientIndex === idx;
                return (
                  <Pressable
                    key={gp.name}
                    onPress={() => setSelectedGradientIndex(idx)}
                    style={[
                      styles.gradientOption,
                      { backgroundColor: gp.colors[1] || gp.colors[0] },
                      isSelected && styles.gradientOptionSelected,
                    ]}
                  >
                    {isSelected && <Check size={18} color="#FFF" strokeWidth={3} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Tareas de la Colección */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Layers size={16} color="#D4AF37" />
              <Text style={styles.sectionLabel}>TAREAS DE LA COLECCIÓN ({tasks.length})</Text>
            </View>

            {/* Formulario añadir / editar tarea */}
            <View style={[styles.addTaskCard, editingTaskIndex !== null && styles.addTaskCardEditing]}>
              <View style={styles.taskFormHeader}>
                <Text style={styles.taskFormSubtitle}>
                  {editingTaskIndex !== null ? `EDITANDO TAREA #${editingTaskIndex + 1}` : 'NUEVA TAREA'}
                </Text>
                {editingTaskIndex !== null && (
                  <Pressable onPress={handleCancelEditTask} style={styles.cancelEditBtn}>
                    <X size={13} color={theme.colors.foregroundMuted} />
                    <Text style={styles.cancelEditText}>Cancelar</Text>
                  </Pressable>
                )}
              </View>

              <TextInput
                style={styles.taskInput}
                placeholder="Nombre del objetivo o tarea *"
                placeholderTextColor={theme.dark ? '#666' : '#999'}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                returnKeyType="next"
              />

              <TextInput
                style={[styles.taskInput, styles.taskDescInput]}
                placeholder="Descripción o detalles (opcional)..."
                placeholderTextColor={theme.dark ? '#666' : '#999'}
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
                numberOfLines={2}
              />

              <View style={styles.taskControlsRow}>
                {/* Prioridad selector */}
                <View style={styles.priorityRow}>
                  {(['low', 'medium', 'high'] as const).map((p) => {
                    const isSelected = newTaskPriority === p;
                    const label = p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja';
                    const color = p === 'high' ? '#EF4444' : p === 'medium' ? '#D4AF37' : '#10B981';
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setNewTaskPriority(p)}
                        style={[
                          styles.priorityChip,
                          isSelected && { backgroundColor: `${color}25`, borderColor: color },
                        ]}
                      >
                        <Text style={[styles.priorityText, { color: isSelected ? color : '#777' }]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={[styles.addTaskBtn, !newTaskTitle.trim() && { opacity: 0.5 }]}
                  onPress={handleAddOrUpdateTask}
                >
                  {editingTaskIndex !== null ? (
                    <>
                      <Check size={16} color="#000" strokeWidth={3} />
                      <Text style={styles.addTaskBtnText}>Guardar</Text>
                    </>
                  ) : (
                    <>
                      <Plus size={16} color="#000" strokeWidth={3} />
                      <Text style={styles.addTaskBtnText}>Añadir</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Listado de tareas añadidas */}
            {tasks.map((task, idx) => {
              const isBeingEdited = editingTaskIndex === idx;
              return (
                <View
                  key={`${task.title}-${idx}`}
                  style={[styles.taskItem, isBeingEdited && styles.taskItemActiveEdit]}
                >
                  <View style={styles.taskItemIndex}>
                    <Text style={styles.taskItemIndexText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskItemTitle}>{task.title}</Text>
                    {!!task.description && (
                      <Text style={styles.taskItemDesc} numberOfLines={2}>
                        {task.description}
                      </Text>
                    )}
                    <View style={styles.taskItemMetaRow}>
                      <View
                        style={[
                          styles.taskPriorityTag,
                          {
                            backgroundColor:
                              task.priority === 'high'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : task.priority === 'low'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(212, 175, 55, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.taskItemPriority,
                            {
                              color:
                                task.priority === 'high'
                                  ? '#EF4444'
                                  : task.priority === 'low'
                                  ? '#10B981'
                                  : '#D4AF37',
                            },
                          ]}
                        >
                          Prioridad {task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baja' : 'Media'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.taskItemActions}>
                    <Pressable
                      onPress={() => handleStartEditTask(idx)}
                      style={styles.editTaskBtn}
                      hitSlop={8}
                    >
                      <Pencil size={15} color="#D4AF37" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveTask(idx)}
                      style={styles.deleteTaskBtn}
                      hitSlop={8}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {tasks.length === 0 && (
              <Text style={styles.emptyTasksText}>
                Añade tareas arriba para que los usuarios puedan verlas y clonarlas a sus álbumes.
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Footer flotante con botón publicar / guardar */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={[styles.submitBtn, (createMutation.isPending || updateMutation.isPending) && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Sparkles size={18} color="#000" />
                <Text style={styles.submitBtnText}>
                  {isEditing ? 'Guardar Cambios' : 'Publicar Colección Oficial'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    deleteHeaderBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.25)',
    },
    adminBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.dark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.12)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.dark ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.3)',
    },
    adminBadgeText: {
      color: gold[400],
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    section: {
      paddingHorizontal: 16,
      marginTop: 24,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    sectionLabel: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: theme.colors.foreground,
      fontSize: 15,
    },
    multilineInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    chipsScroll: {
      gap: 8,
      paddingVertical: 4,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
    },
    chipActive: {
      backgroundColor: theme.dark ? 'rgba(212, 175, 55, 0.15)' : 'rgba(212, 175, 55, 0.12)',
      borderColor: gold[400],
    },
    chipEmoji: {
      fontSize: 16,
    },
    chipText: {
      color: theme.colors.foregroundMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    chipTextActive: {
      color: gold[400],
    },
    badgePresetsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    badgePresetChip: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
    },
    badgePresetChipActive: {
      borderColor: gold[400],
      backgroundColor: theme.dark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.1)',
    },
    badgePresetText: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
    },
    badgePresetTextActive: {
      color: gold[400],
      fontWeight: '700',
    },
    gradientRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    gradientOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    gradientOptionSelected: {
      borderColor: theme.colors.foreground,
      transform: [{ scale: 1.08 }],
    },
    addTaskCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    addTaskCardEditing: {
      borderColor: gold[400],
      backgroundColor: theme.dark ? '#1A1710' : '#FFFDF5',
    },
    taskFormHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    taskFormSubtitle: {
      color: gold[400],
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    cancelEditBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: theme.colors.border,
    },
    cancelEditText: {
      color: theme.colors.foregroundMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    taskInput: {
      color: theme.colors.foreground,
      fontSize: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      paddingBottom: 10,
      marginBottom: 12,
    },
    taskDescInput: {
      minHeight: 46,
      paddingTop: 4,
      fontSize: 13,
      color: theme.colors.foreground,
    },
    taskControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    priorityRow: {
      flexDirection: 'row',
      gap: 6,
    },
    priorityChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.dark ? '#1B1B1B' : '#F5F5F0',
    },
    priorityText: {
      fontSize: 11,
      fontWeight: '700',
    },
    addTaskBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: gold[400],
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 16,
    },
    addTaskBtnText: {
      color: '#000',
      fontSize: 13,
      fontWeight: '700',
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    taskItemActiveEdit: {
      borderColor: gold[400],
      backgroundColor: theme.dark ? '#1A1810' : '#FFFDF5',
    },
    taskItemIndex: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    taskItemIndexText: {
      color: gold[400],
      fontSize: 12,
      fontWeight: 'bold',
    },
    taskItemTitle: {
      color: theme.colors.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
    taskItemDesc: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 3,
    },
    taskItemMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    taskPriorityTag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    taskItemPriority: {
      fontSize: 11,
      fontWeight: '600',
    },
    taskItemActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    editTaskBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.dark ? 'rgba(212, 175, 55, 0.1)' : 'rgba(212, 175, 55, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteTaskBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.dark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTasksText: {
      color: theme.colors.foregroundMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    submitBtn: {
      backgroundColor: gold[400],
      borderRadius: 14,
      paddingVertical: 15,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    submitBtnText: {
      color: '#000',
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

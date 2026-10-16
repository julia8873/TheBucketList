import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageTitle, Typography, useTheme } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import {
  Plus,
  GripVertical,
  CheckCircle2,
  Trash2,
  ListTodo,
} from 'lucide-react-native';
import { DraggableTaskList, type DragHandle } from '../../src/components/DraggableTaskList';
import {
  useDailyTasks,
  useCreateDailyTask,
  useToggleDailyTask,
  useDeleteDailyTask,
  useReorderDailyTasks,
  useClearCompletedDailyTasks,
} from '../../src/hooks/useDailyTasks';
import type { DailyTask } from '../../src/services/api/dailyTasksService';

type FilterType = 'all' | 'pending' | 'completed';

export default function DailyTasksScreen() {
  const { theme } = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const [newTitle, setNewTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { data: tasks = [], isLoading, isRefetching, refetch } = useDailyTasks();
  const createMutation = useCreateDailyTask();
  const toggleMutation = useToggleDailyTask();
  const deleteMutation = useDeleteDailyTask();
  const reorderMutation = useReorderDailyTasks();
  const clearMutation = useClearCompletedDailyTasks();

  const pendingCount = useMemo(() => tasks.filter((t) => !t.is_completed).length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) => t.is_completed).length, [tasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'pending') return tasks.filter((t) => !t.is_completed);
    if (filter === 'completed') return tasks.filter((t) => t.is_completed);
    return tasks;
  }, [tasks, filter]);

  const handleAddTask = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
    setNewTitle('');
  };

  const handleToggle = (task: DailyTask) => {
    toggleMutation.mutate({
      id: task.id,
      isCompleted: !task.is_completed,
    });
  };

  const handleDelete = (task: DailyTask) => {
    Alert.alert(
      'Eliminar tarea',
      `¿Deseas eliminar «${task.title}»?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(task.id),
        },
      ]
    );
  };

  const handleReorder = (orderedIds: string[]) => {
    if (filter === 'all') {
      reorderMutation.mutate(orderedIds);
    } else {
      // Si estamos en vista filtrada, mantenemos las tareas no visibles en su posición
      const activeIdsSet = new Set(orderedIds);
      const remainingIds = tasks.filter((t) => !activeIdsSet.has(t.id)).map((t) => t.id);
      reorderMutation.mutate([...orderedIds, ...remainingIds]);
    }
  };

  const renderTaskItem = (item: DailyTask, drag: DragHandle) => {
    const isCompleted = item.is_completed;

    return (
      <View
        style={[
          styles.compactRow,
          isCompleted && styles.compactRowCompleted,
          drag.isActive && styles.compactRowDragging,
        ]}
      >
        {/* Asa de arrastre para mover */}
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          style={styles.dragHandle}
          accessibilityLabel="Arrastrar para mover tarea"
        >
          <GripVertical
            size={18}
            color={drag.isActive ? gold[400] : '#8F8F8F'}
            strokeWidth={2}
          />
        </View>

        {/* Checkbox para marcar como completado */}
        <Pressable
          hitSlop={10}
          onPress={() => handleToggle(item)}
          style={styles.compactCheckBtn}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isCompleted }}
          accessibilityLabel={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
        >
          {isCompleted ? (
            <CheckCircle2 size={19} color="#34C759" />
          ) : (
            <View style={styles.compactUncheckedCircle} />
          )}
        </Pressable>

        {/* Título de la tarea */}
        <Text
          numberOfLines={2}
          style={[
            styles.compactTitle,
            isCompleted && styles.compactTitleCompleted,
          ]}
        >
          {item.title}
        </Text>

        {/* Botón para eliminar */}
        <Pressable
          hitSlop={10}
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel="Eliminar tarea"
        >
          <Trash2 size={16} color="#6E6E6E" strokeWidth={1.8} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <PageTitle gold="Día" rest="a día" />
            {tasks.length > 0 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {completedCount}/{tasks.length}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            Tus tareas personales diarias. Solo visibles para ti.
          </Text>

          {/* Input para añadir tarea rápida */}
          <View style={styles.inputCard}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Añadir una tarea para hoy..."
              placeholderTextColor="#8F8F8F"
              value={newTitle}
              onChangeText={setNewTitle}
              onSubmitEditing={handleAddTask}
              returnKeyType="done"
            />
            <Pressable
              style={[styles.addBtn, !newTitle.trim() && styles.addBtnDisabled]}
              onPress={handleAddTask}
              disabled={!newTitle.trim()}
              accessibilityRole="button"
              accessibilityLabel="Añadir tarea"
            >
              <Plus size={18} color="#0E0E0E" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Filtros: Todas | Pendientes | Completadas */}
          <View style={styles.filtersRow}>
            <Pressable
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                Todas ({tasks.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, filter === 'pending' && styles.filterChipActive]}
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterChipText, filter === 'pending' && styles.filterChipTextActive]}>
                Pendientes ({pendingCount})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterChip, filter === 'completed' && styles.filterChipActive]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterChipText, filter === 'completed' && styles.filterChipTextActive]}>
                Completadas ({completedCount})
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Task List */}
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          scrollEnabled={!dragging}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={gold[400]}
            />
          }
        >
          {isLoading ? (
            <ActivityIndicator color={gold[400]} style={{ marginTop: 40 }} />
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <ListTodo size={32} color={gold[400]} strokeWidth={1.8} />
              </View>
              <Typography variant="bodySemibold" style={styles.emptyTitle}>
                {filter === 'completed'
                  ? 'No hay tareas completadas'
                  : filter === 'pending'
                  ? '¡Todo listo por hoy!'
                  : 'Sin tareas para hoy'}
              </Typography>
              <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                {filter === 'completed'
                  ? 'Marca tus tareas pendientes a medida que las vayas realizando.'
                  : 'Escribe una tarea arriba para organizar tu día a día.'}
              </Typography>
            </View>
          ) : (
            <>
              <DraggableTaskList
                items={filteredTasks}
                renderItem={(item, drag) => (
                  <View style={{ marginBottom: 8 }}>
                    {renderTaskItem(item, drag)}
                  </View>
                )}
                onReorder={handleReorder}
                onDraggingChange={setDragging}
              />

              {completedCount > 0 && filter !== 'pending' && (
                <Pressable
                  style={styles.clearBtn}
                  onPress={() => {
                    Alert.alert(
                      'Limpiar completadas',
                      '¿Deseas eliminar todas las tareas completadas?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Limpiar',
                          style: 'destructive',
                          onPress: () => clearMutation.mutate(),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.clearBtnText}>Limpiar completadas</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 4,
    marginBottom: 14,
  },
  counterBadge: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  counterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: gold[400],
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 4,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#F5F5F5',
    paddingVertical: 8,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addBtnDisabled: {
    opacity: 0.35,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
  },
  filterChipActive: {
    backgroundColor: '#2C2512',
    borderColor: gold[400],
  },
  filterChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#8A8A8A',
  },
  filterChipTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242424',
  },
  compactRowCompleted: {
    backgroundColor: '#121212',
    borderColor: '#1C1C1C',
    opacity: 0.8,
  },
  compactRowDragging: {
    borderColor: gold[400],
    backgroundColor: '#1F1B10',
  },
  dragHandle: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactCheckBtn: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactUncheckedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: '#555',
  },
  compactTitle: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F5F5F5',
    lineHeight: 20,
  },
  compactTitleCompleted: {
    color: '#707070',
    textDecorationLine: 'line-through',
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1C1910',
    borderWidth: 1,
    borderColor: '#302814',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    color: '#F3EEE3',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
    maxWidth: 240,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  clearBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#8A8A8A',
  },
});

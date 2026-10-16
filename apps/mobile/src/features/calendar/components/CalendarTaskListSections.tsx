import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TaskRow } from '@bucketlist/ui';
import { ChevronRight, Calendar } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { BucketCover } from '../../../components/BucketCover';
import { resolveTaskImage } from '../../../utils/taskImage';
import { styles } from '../styles/calendar.styles';

interface CalendarTaskListSectionsProps {
  selectedDate: Date;
  selectedTasks: any[];
  expiredTasks: any[];
  unscheduledTasks: any[];
  showUnscheduled: boolean;
  onToggleUnscheduled: () => void;
}

export function CalendarTaskListSections({
  selectedDate,
  selectedTasks,
  expiredTasks,
  unscheduledTasks,
  showUnscheduled,
  onToggleUnscheduled,
}: CalendarTaskListSectionsProps) {
  const router = useRouter();

  const renderThumbnail = (task: any) => (
    <BucketCover
      value={resolveTaskImage(task, { preferThumb: true })}
      title={task.title}
      categorySlug={task.category?.slug}
      seed={task.id}
      iconSize={56}
      style={StyleSheet.absoluteFill}
    />
  );

  const getMeta = (task: any) => {
    const pLabel =
      task.priority === 'high'
        ? 'Prioridad Alta'
        : task.priority === 'low'
        ? 'Prioridad Baja'
        : 'Prioridad Media';
    const catName = task.priority ? pLabel : task.category?.name_es || 'Sin categoría';
    const subtasks = task.item_subtasks || [];
    const subtasksTotal = subtasks.length;
    const subtasksDone = subtasks.filter((s: any) => s.done).length;

    if (task.status === 'completed') {
      return `${catName} · Completada`;
    }
    if (subtasksTotal > 0) {
      return `${catName} · ${subtasksDone} de ${subtasksTotal} pasos`;
    }
    return catName;
  };

  return (
    <>
      {/* ── SECCIÓN: Tareas del Día Seleccionado ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          <Text style={{ color: '#D4B13A' }}>
            {format(selectedDate, "d 'DE' MMMM", { locale: es }).toUpperCase()}
          </Text>
          {selectedTasks.length > 0 ? ` · ${selectedTasks.length}` : ''}
        </Text>
      </View>

      <View style={styles.tasksContainer}>
        {selectedTasks.length === 0 ? (
          <View style={styles.emptyDayContainer}>
            <Calendar color="#3A3A3A" size={28} style={{ marginBottom: 6 }} />
            <Text style={styles.emptyDayText}>
              No hay tareas programadas ni completadas este día
            </Text>
          </View>
        ) : (
          selectedTasks.map((task) => {
            const isExpired =
              task.status !== 'completed' &&
              task.deadline &&
              new Date(task.deadline).getTime() < new Date().setHours(0, 0, 0, 0);

            return (
              <View key={task.id} style={{ marginBottom: 10 }}>
                <TaskRow
                  title={task.title}
                  meta={getMeta(task)}
                  deadline={task.deadline}
                  thumbnailElement={renderThumbnail(task)}
                  completed={task.status === 'completed'}
                  expiredAction={isExpired}
                  onPress={() => router.push(`/bucket/${task.id}`)}
                />
              </View>
            );
          })
        )}
      </View>

      {/* ── SECCIÓN: TAREAS VENCIDAS ── */}
      {expiredTasks.length > 0 && (
        <View style={styles.expiredSection}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.expiredDot} />
              <Text style={styles.sectionTitle}>
                <Text style={{ color: '#EF4444' }}>VENCIDAS</Text> · {expiredTasks.length}
              </Text>
            </View>
            <Text style={styles.expiredSectionSubtitle}>
              {expiredTasks.length === 1
                ? '1 pendiente de fecha'
                : `${expiredTasks.length} pendientes de fecha`}
            </Text>
          </View>

          <View style={styles.tasksContainer}>
            {expiredTasks.map((task) => (
              <View key={task.id} style={{ marginBottom: 10 }}>
                <TaskRow
                  title={task.title}
                  meta={getMeta(task)}
                  deadline={task.deadline}
                  thumbnailElement={renderThumbnail(task)}
                  completed={false}
                  expiredAction={true}
                  onPress={() => router.push(`/bucket/${task.id}`)}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── SECCIÓN: Tareas sin fecha asignada ── */}
      {unscheduledTasks.length > 0 && (
        <View style={styles.unscheduledSection}>
          <Pressable
            style={styles.unscheduledHeader}
            onPress={onToggleUnscheduled}
          >
            <Text style={styles.unscheduledTitle}>
              SIN FECHA PROGRAMADA · {unscheduledTasks.length}
            </Text>
            <ChevronRight
              color="#8F8F8F"
              size={18}
              style={{ transform: [{ rotate: showUnscheduled ? '90deg' : '0deg' }] }}
            />
          </Pressable>

          {showUnscheduled && (
            <View style={[styles.tasksContainer, { marginTop: 10 }]}>
              {unscheduledTasks.map((task) => (
                <View key={task.id} style={{ marginBottom: 10 }}>
                  <TaskRow
                    title={task.title}
                    meta={getMeta(task)}
                    thumbnailElement={renderThumbnail(task)}
                    completed={false}
                    onPress={() => router.push(`/bucket/${task.id}`)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </>
  );
}

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import { Typography, useTheme, TaskRow } from '@bucketlist/ui';
import { ChevronLeft, ChevronRight, AlertCircle, Calendar } from 'lucide-react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';

import { useBuckets } from '../hooks/useBuckets';
import { useAuthStore } from '../stores/auth.store';
import { usePullToRefresh } from '../hooks/useAutoRefresh';
import { BucketCover } from './BucketCover';
import { resolveTaskImage } from '../utils/taskImage';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { useRouter } from 'expo-router';

export function CalendarTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { refreshing, onRefresh } = usePullToRefresh();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  const { data: buckets = [], isLoading } = useBuckets(user?.id);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Generate grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInGrid = eachDayOfInterval({ start: startDate, end: endDate });

  // Map dates to tasks:
  // - Completed tasks appear on the day they were completed
  // - Pending tasks appear on the day of their deadline
  const tasksByDay = useMemo(() => {
    const map = new Map<string, any[]>();

    (buckets || []).forEach((item: any) => {
      let targetDate: string | null = null;

      if (item.status === 'completed') {
        const d = item.completed_at || item.updated_at || item.created_at;
        if (d) {
          try {
            targetDate = format(new Date(d), 'yyyy-MM-dd');
          } catch {
            targetDate = null;
          }
        }
      } else if (item.deadline) {
        try {
          targetDate = format(new Date(item.deadline), 'yyyy-MM-dd');
        } catch {
          targetDate = null;
        }
      }

      if (targetDate) {
        const existing = map.get(targetDate) || [];
        existing.push(item);
        map.set(targetDate, existing);
      }
    });

    return map;
  }, [buckets]);

  // Expired / overdue tasks (not completed and deadline has passed before today)
  const expiredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (buckets || []).filter((item: any) => {
      if (item.status === 'completed') return false;
      if (!item.deadline) return false;
      try {
        const d = new Date(item.deadline);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < today.getTime();
      } catch {
        return false;
      }
    }).sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [buckets]);

  // Tasks without scheduled deadline (and not completed)
  const unscheduledTasks = useMemo(() => {
    return (buckets || []).filter((item: any) => item.status !== 'completed' && !item.deadline);
  }, [buckets]);

  // Completed tasks count for the current viewed month
  const completedThisMonth = useMemo(() => {
    return (buckets || []).filter((b: any) => {
      if (b.status !== 'completed') return false;
      const d = b.completed_at || b.updated_at;
      if (!d) return false;
      try {
        return isSameMonth(new Date(d), currentDate);
      } catch {
        return false;
      }
    }).length;
  }, [buckets, currentDate]);

  // Selected day tasks
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = tasksByDay.get(selectedDateStr) || [];

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
    const pLabel = task.priority === 'high' ? 'Prioridad Alta' : task.priority === 'low' ? 'Prioridad Baja' : 'Prioridad Media';
    const catName = task.priority ? pLabel : (task.category?.name_es || 'Sin categoría');
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor="#D4B13A" />}
    >
      {/* Month Navigation */}
      <View style={styles.header}>
        <View>
          <Typography
            variant="h1"
            color={theme.colors.foreground}
            style={{ textTransform: 'capitalize', fontSize: 26 }}
          >
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </Typography>
          <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginTop: 2 }}>
            {completedThisMonth === 0
              ? '0 completadas este mes'
              : `${completedThisMonth} completada${completedThisMonth === 1 ? '' : 's'} este mes`}
          </Typography>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={prevMonth} style={styles.navButton} hitSlop={8}>
            <ChevronLeft color={theme.colors.foreground} size={22} />
          </Pressable>
          <Pressable onPress={nextMonth} style={styles.navButton} hitSlop={8}>
            <ChevronRight color={theme.colors.foreground} size={22} />
          </Pressable>
        </View>
      </View>

      {/* Weekdays */}
      <View style={styles.weekdaysRow}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={gold[400]} />
        </View>
      ) : (
        <View style={styles.grid}>
          {daysInGrid.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            const tasks = tasksByDay.get(dateStr) || [];
            const hasCompleted = tasks.some((t) => t.status === 'completed');
            const hasPending = tasks.some((t) => {
              if (t.status === 'completed') return false;
              if (!t.deadline) return true;
              const d = new Date(t.deadline);
              d.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return d.getTime() >= today.getTime();
            });
            const hasExpired = tasks.some((t) => {
              if (t.status === 'completed') return false;
              if (!t.deadline) return false;
              const d = new Date(t.deadline);
              d.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return d.getTime() < today.getTime();
            });

            return (
              <Pressable
                key={i}
                style={styles.dayCell}
                onPress={() => setSelectedDate(day)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                    isToday && !isSelected && styles.dayCircleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      !isCurrentMonth && styles.dayTextOutside,
                      isToday && !isSelected && styles.dayTextToday,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>

                {/* Dots indicator below day number */}
                <View style={styles.dotsRow}>
                  {hasCompleted && <View style={[styles.dot, { backgroundColor: '#D4B13A' }]} />}
                  {hasPending && <View style={[styles.dot, { backgroundColor: '#3A78C4' }]} />}
                  {hasExpired && <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#D4B13A' }]} />
          <Text style={styles.legendText}>Completada</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3A78C4' }]} />
          <Text style={styles.legendText}>Pendiente</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Vencida</Text>
        </View>
      </View>

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
            <Text style={styles.emptyDayText}>No hay tareas programadas ni completadas este día</Text>
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
              {expiredTasks.length === 1 ? '1 pendiente de fecha' : `${expiredTasks.length} pendientes de fecha`}
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
            onPress={() => setShowUnscheduled(!showUnscheduled)}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#8A8A8A',
  },
  loaderContainer: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.85,
    alignItems: 'center',
    paddingTop: 3,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayCircleSelected: {
    borderColor: '#D4B13A',
    borderWidth: 1.5,
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
  },
  dayCircleToday: {
    borderColor: '#383838',
    borderWidth: 1,
  },
  dayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F3EEE3',
  },
  dayTextSelected: {
    color: '#D4B13A',
    fontFamily: 'Inter_700Bold',
  },
  dayTextToday: {
    color: '#FFF',
    fontFamily: 'Inter_600SemiBold',
  },
  dayTextOutside: {
    color: '#3F3F3F',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 3,
    gap: 3,
    height: 6,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 16,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  tasksContainer: {
    paddingHorizontal: 20,
  },
  emptyDayContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  emptyDayText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#707070',
    textAlign: 'center',
  },
  expiredSection: {
    marginTop: 26,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    paddingTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  expiredDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  expiredSectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
  },
  unscheduledSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    paddingTop: 14,
  },
  unscheduledHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  unscheduledTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 13,
    color: '#8A8A8A',
    letterSpacing: 0.6,
  },
});

import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2 } from 'lucide-react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';

import { styles } from '../styles/explore.styles';
import { DailyTask } from '../types';
import { toDateString } from '../utils/dailyTaskDateUtils';
import { DraggableTaskList, DragHandle } from '@/components/DraggableTaskList';

interface DailyCalendarViewProps {
  tasks: DailyTask[];
  todayStr: string;
  calendarMonth: Date;
  onSetCalendarMonth: React.Dispatch<React.SetStateAction<Date>>;
  selectedCalendarDate: Date;
  onSelectCalendarDate: (date: Date) => void;
  onOpenCreateTask: (dateStr: string) => void;
  renderTaskRow: (item: DailyTask, drag?: DragHandle, isLast?: boolean) => React.ReactNode;
  renderCompletedRow: (item: DailyTask, isLast?: boolean) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onDraggingChange: (isDragging: boolean) => void;
  sortTasks: (tasks: DailyTask[]) => DailyTask[];
}

export function DailyCalendarView({
  tasks,
  todayStr,
  calendarMonth,
  onSetCalendarMonth,
  selectedCalendarDate,
  onSelectCalendarDate,
  onOpenCreateTask,
  renderTaskRow,
  renderCompletedRow,
  onReorder,
  onDraggingChange,
  sortTasks,
}: DailyCalendarViewProps) {
  // Calendar Grid calculation
  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Group tasks by date for the calendar
    const tasksMap = new Map<string, { pending: DailyTask[]; completed: DailyTask[] }>();
    tasks.forEach((t) => {
      const dStr = t.due_date || todayStr;
      const current = tasksMap.get(dStr) || { pending: [], completed: [] };
      if (t.is_completed) {
        current.completed.push(t);
      } else {
        current.pending.push(t);
      }
      tasksMap.set(dStr, current);
    });

    return {
      monthLabel: format(calendarMonth, 'MMMM yyyy', { locale: es }),
      days: days.map((d) => {
        const dStr = toDateString(d);
        const taskInfo = tasksMap.get(dStr);
        return {
          date: d,
          dateStr: dStr,
          dayNumber: format(d, 'd'),
          isCurrentMonth: isSameMonth(d, calendarMonth),
          isToday: isToday(d),
          isSelected: isSameDay(d, selectedCalendarDate),
          pendingCount: taskInfo?.pending.length || 0,
          completedCount: taskInfo?.completed.length || 0,
          totalCount: (taskInfo?.pending.length || 0) + (taskInfo?.completed.length || 0),
        };
      }),
    };
  }, [calendarMonth, selectedCalendarDate, tasks, todayStr]);

  const selectedDateTasks = useMemo(() => {
    const dStr = toDateString(selectedCalendarDate);
    return tasks.filter((t) => !t.is_completed && (t.due_date || todayStr) === dStr);
  }, [selectedCalendarDate, tasks, todayStr]);

  const sortedSelectedDateTasks = useMemo(() => {
    return sortTasks(selectedDateTasks);
  }, [selectedDateTasks, sortTasks]);

  const selectedDateCompleted = useMemo(() => {
    const dStr = toDateString(selectedCalendarDate);
    return tasks.filter((t) => t.is_completed && (t.due_date || todayStr) === dStr);
  }, [selectedCalendarDate, tasks, todayStr]);

  return (
    <View style={styles.calendarContainer}>
      {/* Calendar Navigation Card */}
      <View style={styles.calendarCard}>
        <View style={styles.calendarHeaderRow}>
          <Pressable
            style={styles.calendarNavBtn}
            onPress={() => onSetCalendarMonth((prev) => subMonths(prev, 1))}
            hitSlop={8}
          >
            <ChevronLeft size={20} color="#AAA" />
          </Pressable>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.calendarMonthTitle}>
              {calendarGrid.monthLabel.toUpperCase()}
            </Text>
            {!isSameMonth(calendarMonth, new Date()) && (
              <Pressable
                style={styles.calendarTodayBadge}
                onPress={() => {
                  const now = new Date();
                  onSetCalendarMonth(now);
                  onSelectCalendarDate(now);
                }}
              >
                <Text style={styles.calendarTodayText}>Este mes</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.calendarNavBtn}
            onPress={() => onSetCalendarMonth((prev) => addMonths(prev, 1))}
            hitSlop={8}
          >
            <ChevronRight size={20} color="#AAA" />
          </Pressable>
        </View>

        {/* Day of Week Headers */}
        <View style={styles.calendarDaysOfWeekRow}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, idx) => (
            <Text key={idx} style={styles.calendarDayOfWeekText}>
              {d}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {calendarGrid.days.map((cell) => {
            return (
              <Pressable
                key={cell.dateStr}
                style={[
                  styles.calendarDayCell,
                  cell.isSelected && styles.calendarDayCellSelected,
                  cell.isToday && styles.calendarDayCellToday,
                ]}
                onPress={() => {
                  onSelectCalendarDate(cell.date);
                  if (!cell.isCurrentMonth) {
                    onSetCalendarMonth(cell.date);
                  }
                }}
              >
                <Text
                  style={[
                    styles.calendarDayNumber,
                    !cell.isCurrentMonth && styles.calendarDayNumberOutside,
                    cell.isToday && styles.calendarDayNumberToday,
                    cell.isSelected && styles.calendarDayNumberSelected,
                  ]}
                >
                  {cell.dayNumber}
                </Text>

                {/* Task Dots */}
                <View style={styles.calendarDotsRow}>
                  {cell.pendingCount > 0 && <View style={styles.calendarPendingDot} />}
                  {cell.completedCount > 0 && <View style={styles.calendarCompletedDot} />}
                </View>

                {/* Count Badge for multiple tasks */}
                {cell.totalCount > 1 && (
                  <View style={styles.calendarCellCountBadge}>
                    <Text style={styles.calendarCellCountText}>{cell.totalCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected Day Task List Details */}
      <View style={styles.calendarDayDetailSection}>
        <View style={styles.calendarDayDetailHeader}>
          <View>
            <Text style={styles.calendarDayDetailDate}>
              {isToday(selectedCalendarDate) ? 'HOY · ' : ''}
              {format(selectedCalendarDate, "EEEE, d 'de' MMMM", { locale: es }).toUpperCase()}
            </Text>
            <Text style={styles.calendarDayDetailSub}>
              {selectedDateTasks.length}{' '}
              {selectedDateTasks.length === 1 ? 'tarea programada' : 'tareas programadas'}
            </Text>
          </View>
          <Pressable
            style={styles.calendarDayAddBtn}
            onPress={() => onOpenCreateTask(toDateString(selectedCalendarDate))}
          >
            <Plus size={14} color="#0E0E0E" strokeWidth={2.5} />
            <Text style={styles.calendarDayAddBtnText}>Añadir</Text>
          </Pressable>
        </View>

        {sortedSelectedDateTasks.length === 0 ? (
          <View style={styles.weekDayEmpty}>
            <Text style={styles.weekDayEmptyText}>
              Sin tareas para este día. ¡Pulsa + Añadir para crear una!
            </Text>
          </View>
        ) : (
          <View style={styles.compactListCard}>
            <DraggableTaskList
              items={sortedSelectedDateTasks}
              gap={0}
              renderItem={(item, drag) =>
                renderTaskRow(
                  item,
                  drag,
                  sortedSelectedDateTasks.indexOf(item) === sortedSelectedDateTasks.length - 1
                )
              }
              onReorder={onReorder}
              onDraggingChange={onDraggingChange}
            />
          </View>
        )}

        {/* Completed tasks for selected date */}
        {selectedDateCompleted.length > 0 && (
          <View style={styles.completedSectionWrapper}>
            <View style={styles.completedSectionHeader}>
              <CheckCircle2 size={14} color="#34C759" />
              <Text style={styles.completedSectionTitle}>
                Completadas ({selectedDateCompleted.length})
              </Text>
            </View>
            <View style={styles.compactListCard}>
              {selectedDateCompleted.map((item, idx) =>
                renderCompletedRow(item, idx === selectedDateCompleted.length - 1)
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

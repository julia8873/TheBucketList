import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/explore.styles';
import { DailyTask } from '../types';
import { DraggableTaskList, DragHandle } from '@/components/DraggableTaskList';

export interface WeekDayItem {
  date: Date;
  dateStr: string;
  dayName: string;
  formatted: string;
  isCurrentDay: boolean;
}

export interface WeekBlockItem {
  weekIndex: number;
  weekLabel: string;
  monday: Date;
  sunday: Date;
  days: WeekDayItem[];
}

interface DailyWeekViewProps {
  displayedWeeks: WeekBlockItem[];
  weeksToShow: number;
  setWeeksToShow: (n: number) => void;
  weekOffset: number;
  setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
  filteredByTagAndStatus: DailyTask[];
  todayStr: string;
  sortTasks: (tasks: DailyTask[]) => DailyTask[];
  onOpenCreateTask: (dateStr: string) => void;
  renderOverdueSection: () => React.ReactNode;
  renderTaskRow: (item: DailyTask, drag?: DragHandle, isLast?: boolean) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onDraggingChange: (isDragging: boolean) => void;
}

export function DailyWeekView({
  displayedWeeks,
  weeksToShow,
  setWeeksToShow,
  weekOffset,
  setWeekOffset,
  filteredByTagAndStatus,
  todayStr,
  sortTasks,
  onOpenCreateTask,
  renderOverdueSection,
  renderTaskRow,
  onReorder,
  onDraggingChange,
}: DailyWeekViewProps) {
  return (
    <View style={styles.weekContainer}>
      {/* Overdue tasks section at top of week view */}
      {renderOverdueSection()}

      {/* Week Navigation Controls */}
      <View style={styles.weekNavigationCard}>
        <View style={styles.weekNavRow}>
          <Pressable
            style={[styles.weekNavBtn, weekOffset <= 0 && { opacity: 0.25 }]}
            onPress={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
            disabled={weekOffset <= 0}
            hitSlop={8}
            accessibilityLabel="Semana anterior"
          >
            <ChevronLeft size={18} color={weekOffset <= 0 ? '#555' : '#AAA'} />
          </Pressable>

          <View style={styles.weekNavCenter}>
            <Text style={styles.weekNavTitle}>
              {weeksToShow === 1
                ? displayedWeeks[0]?.weekLabel
                : `${weeksToShow} semanas (${format(displayedWeeks[0]?.monday || new Date(), 'd MMM', { locale: es })} – ${format(displayedWeeks[displayedWeeks.length - 1]?.sunday || new Date(), 'd MMM', { locale: es })})`}
            </Text>
            {weekOffset > 0 && (
              <Pressable
                style={styles.weekNavTodayBadge}
                onPress={() => setWeekOffset(0)}
              >
                <Text style={styles.weekNavTodayText}>Volver a hoy</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            style={styles.weekNavBtn}
            onPress={() => setWeekOffset((prev) => prev + 1)}
            hitSlop={8}
            accessibilityLabel="Semana siguiente"
          >
            <ChevronRight size={18} color="#AAA" />
          </Pressable>
        </View>

        {/* Week Count Selector (1 sem | 2 sem | 3 sem | 4 sem) */}
        <View style={styles.weekSpanSelector}>
          <Text style={styles.weekSpanLabel}>Mostrar:</Text>
          {[1, 2, 3, 4].map((n) => (
            <Pressable
              key={n}
              style={[
                styles.weekSpanPill,
                weeksToShow === n && styles.weekSpanPillActive,
              ]}
              onPress={() => setWeeksToShow(n)}
            >
              <Text
                style={[
                  styles.weekSpanPillText,
                  weeksToShow === n && styles.weekSpanPillTextActive,
                ]}
              >
                {n} {n === 1 ? 'sem' : 'sems'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Render Weeks and their days */}
      {displayedWeeks.map((wk) => (
        <View key={`week-${wk.weekIndex}-${wk.days[0]?.dateStr || wk.weekIndex}`} style={styles.weekBlock}>
          {weeksToShow > 1 && (
            <View style={styles.multiWeekDivider}>
              <Text style={styles.multiWeekTitle}>{wk.weekLabel.toUpperCase()}</Text>
            </View>
          )}

          {wk.days.map((day) => {
            const rawDayTasks = filteredByTagAndStatus.filter((t) => {
              const taskDate = t.due_date || todayStr;
              return taskDate === day.dateStr;
            });
            const dayTasks = sortTasks(rawDayTasks);

            return (
              <View key={day.dateStr} style={styles.weekDaySection}>
                <View style={styles.weekDayHeader}>
                  <View style={styles.weekDayHeaderLeft}>
                    <Text
                      style={[
                        styles.weekDayName,
                        day.isCurrentDay && styles.weekDayNameToday,
                      ]}
                    >
                      {day.isCurrentDay ? 'HOY · ' : ''}
                      {day.dayName.toUpperCase()}
                    </Text>
                    <Text style={styles.weekDayDate}>{day.formatted}</Text>
                  </View>
                  <Pressable
                    hitSlop={6}
                    onPress={() => onOpenCreateTask(day.dateStr)}
                    style={styles.weekAddQuickBtn}
                  >
                    <Plus size={14} color={gold[400]} />
                    <Text style={styles.weekAddQuickText}>Añadir</Text>
                  </Pressable>
                </View>

                {dayTasks.length === 0 ? (
                  <View style={styles.weekDayEmpty}>
                    <Text style={styles.weekDayEmptyText}>Sin tareas programadas</Text>
                  </View>
                ) : (
                  <View style={styles.compactListCard}>
                    <DraggableTaskList
                      items={dayTasks}
                      gap={0}
                      renderItem={(item, drag) =>
                        renderTaskRow(item, drag, dayTasks.indexOf(item) === dayTasks.length - 1)
                      }
                      onReorder={onReorder}
                      onDraggingChange={onDraggingChange}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

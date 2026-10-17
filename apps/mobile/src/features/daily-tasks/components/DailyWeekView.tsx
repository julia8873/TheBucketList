import React, { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plus, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useTheme, gold } from '@bucketlist/ui';
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
  isWeekCompletedCollapsed?: boolean;
  onToggleAllWeekCompleted?: () => void;
  isWeekDayCollapsed?: (dateStr: string) => boolean;
  onToggleWeekDayCompleted?: (dateStr: string) => void;
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
  isWeekCompletedCollapsed = false,
  onToggleAllWeekCompleted,
  isWeekDayCollapsed,
  onToggleWeekDayCompleted,
}: DailyWeekViewProps) {
  const { theme } = useTheme();
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const toggleDay = (dateStr: string) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  return (
    <View style={styles.weekContainer}>
      {/* Overdue tasks section at top of week view */}
      {renderOverdueSection()}

      {/* Render Weeks and their days */}
      {displayedWeeks.map((wk) => (
        <View key={`week-${wk.weekIndex}-${wk.days[0]?.dateStr || wk.weekIndex}`} style={styles.weekBlock}>
          {weeksToShow > 1 && (
            <View style={[styles.multiWeekDivider, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={styles.multiWeekTitle}>{wk.weekLabel.toUpperCase()}</Text>
            </View>
          )}

          {wk.days.map((day) => {
            const rawDayTasks = filteredByTagAndStatus.filter((t) => {
              const taskDate = t.due_date || todayStr;
              return taskDate === day.dateStr;
            });
            const dayTasks = sortTasks(rawDayTasks);
            const pendingTasks = dayTasks.filter((t) => !t.is_completed);
            const completedTasks = dayTasks.filter((t) => t.is_completed);
            const isDayCollapsed = !!collapsedDays[day.dateStr];
            const isCompletedCollapsed = isWeekDayCollapsed ? isWeekDayCollapsed(day.dateStr) : false;

            return (
              <View key={day.dateStr} style={styles.weekDaySection}>
                <View style={styles.weekDayHeader}>
                  <Pressable
                    style={styles.weekDayHeaderLeft}
                    onPress={() => toggleDay(day.dateStr)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={isDayCollapsed ? `Mostrar tareas de ${day.dayName}` : `Ocultar tareas de ${day.dayName}`}
                  >
                    {isDayCollapsed ? (
                      <ChevronRight size={15} color={theme.colors.foregroundMuted} />
                    ) : (
                      <ChevronDown size={15} color={theme.colors.foregroundMuted} />
                    )}
                    <Text
                      style={[
                        styles.weekDayName,
                        day.isCurrentDay && styles.weekDayNameToday,
                      ]}
                    >
                      {day.isCurrentDay ? 'HOY · ' : ''}
                      {day.dayName.toUpperCase()}
                    </Text>
                    <Text style={[styles.weekDayDate, { color: theme.colors.foregroundMuted }]}>{day.formatted}</Text>
                  </Pressable>

                  <Pressable
                    hitSlop={6}
                    onPress={() => onOpenCreateTask(day.dateStr)}
                    style={styles.weekAddQuickBtn}
                  >
                    <Plus size={14} color={gold[400]} />
                    <Text style={styles.weekAddQuickText}>Añadir</Text>
                  </Pressable>
                </View>

                {!isDayCollapsed && (
                  <>
                    {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                      <View style={[styles.weekDayEmpty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Text style={[styles.weekDayEmptyText, { color: theme.colors.foregroundMuted }]}>Sin tareas programadas</Text>
                      </View>
                    ) : (
                      <>
                        {pendingTasks.length > 0 && (
                          <View style={[styles.compactListCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <DraggableTaskList
                              items={pendingTasks}
                              gap={0}
                              renderItem={(item, drag) =>
                                renderTaskRow(item, drag, pendingTasks.indexOf(item) === pendingTasks.length - 1)
                              }
                              onReorder={onReorder}
                              onDraggingChange={onDraggingChange}
                            />
                          </View>
                        )}

                        {completedTasks.length > 0 && (
                          <View style={styles.weekCompletedSection}>
                            <Pressable
                              style={styles.completedSectionHeader}
                              onPress={() => onToggleWeekDayCompleted?.(day.dateStr)}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel={isCompletedCollapsed ? "Mostrar completadas" : "Ocultar completadas"}
                            >
                              {isCompletedCollapsed ? (
                                <ChevronRight size={14} color={theme.colors.foregroundMuted} />
                              ) : (
                                <ChevronDown size={14} color={theme.colors.foregroundMuted} />
                              )}
                              <CheckCircle2 size={13} color="#34C759" />
                              <Text style={[styles.completedSectionTitle, { color: theme.colors.foregroundMuted }]}>
                                Completadas ({completedTasks.length})
                              </Text>
                            </Pressable>

                            {!isCompletedCollapsed && (
                              <View style={[styles.compactListCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 4 }]}>
                                {completedTasks.map((item, idx) =>
                                  renderTaskRow(item, undefined, idx === completedTasks.length - 1)
                                )}
                              </View>
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

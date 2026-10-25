import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Plus, CheckCircle2, ChevronDown, ChevronRight, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme, gold } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
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
  onReschedule?: (task: DailyTask, targetDateStr: string) => void;
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
  onReschedule,
  onDraggingChange,
  isWeekCompletedCollapsed = false,
  onToggleAllWeekCompleted,
  isWeekDayCollapsed,
  onToggleWeekDayCompleted,
}: DailyWeekViewProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  // Seguimiento de arrastre entre días
  const [activeDrag, setActiveDrag] = useState<{
    task: DailyTask;
    originDateStr: string;
    targetDateStr: string | null;
  } | null>(null);
  const activeDragRef = useRef(activeDrag);
  activeDragRef.current = activeDrag;

  const dayRefs = useRef<Record<string, any>>({});
  const dayBounds = useRef<Record<string, { top: number; bottom: number }>>({});

  const toggleDay = (dateStr: string) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  // Mide las secciones de días en plataformas nativas para detectar la zona sobre la que está el puntero
  const measureAllDays = useCallback(() => {
    if (Platform.OS !== 'web') {
      const bounds: Record<string, { top: number; bottom: number }> = {};
      for (const wk of displayedWeeks) {
        for (const day of wk.days) {
          const ref = dayRefs.current[day.dateStr];
          if (ref && typeof ref.measureInWindow === 'function') {
            ref.measureInWindow((_x: number, y: number, _w: number, h: number) => {
              if (h > 0) bounds[day.dateStr] = { top: y, bottom: y + h };
            });
          }
        }
      }
      dayBounds.current = bounds;
    }
  }, [displayedWeeks]);

  // Identifica el día que se encuentra bajo la coordenada vertical dada
  const findDayAt = useCallback(
    (coords: { pageY: number; clientY: number }): string | null => {
      const { pageY, clientY } = coords;

      // 1. En Web: comprobación precisa con getBoundingClientRect
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const scrollY = window.scrollY || document.documentElement?.scrollTop || 0;
        for (const wk of displayedWeeks) {
          for (const day of wk.days) {
            const el = dayRefs.current[day.dateStr];
            if (el && typeof el.getBoundingClientRect === 'function') {
              const rect = el.getBoundingClientRect();
              const isMatch =
                (clientY >= rect.top && clientY <= rect.bottom) ||
                (pageY >= rect.top + scrollY && pageY <= rect.bottom + scrollY);
              if (isMatch) return day.dateStr;
            }
          }
        }
      }

      // 2. En Native: límites en ventana
      for (const [dateStr, bounds] of Object.entries(dayBounds.current)) {
        if (clientY >= bounds.top && clientY <= bounds.bottom) {
          return dateStr;
        }
      }

      return null;
    },
    [displayedWeeks],
  );

  const handleDragStartForDay = useCallback(
    (item: DailyTask, originDateStr: string) => {
      measureAllDays();
      setActiveDrag({
        task: item,
        originDateStr,
        targetDateStr: originDateStr,
      });
    },
    [measureAllDays],
  );

  const handleDragMoveGlobal = useCallback(
    (item: DailyTask, coords: { pageY: number; clientY: number }) => {
      const foundDay = findDayAt(coords);
      setActiveDrag((prev) => {
        if (!prev) return null;
        if (prev.targetDateStr !== foundDay) {
          if (foundDay && foundDay !== prev.originDateStr) {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              // ignore
            }
          }
          return { ...prev, targetDateStr: foundDay };
        }
        return prev;
      });
    },
    [findDayAt],
  );

  const handleDragEndGlobal = useCallback(
    (item: DailyTask, coords: { pageY: number; clientY: number }): boolean => {
      const current = activeDragRef.current;
      const finalTarget = findDayAt(coords) || current?.targetDateStr;
      setActiveDrag(null);

      if (finalTarget && current && finalTarget !== current.originDateStr) {
        try {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // ignore
        }
        onReschedule?.(item, finalTarget);
        return true;
      }
      return false;
    },
    [findDayAt, onReschedule],
  );

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

            const isDropTarget =
              !!activeDrag &&
              activeDrag.targetDateStr === day.dateStr &&
              activeDrag.originDateStr !== day.dateStr;
            const isOriginDay = activeDrag?.originDateStr === day.dateStr;

            return (
              <View
                key={day.dateStr}
                ref={(el) => {
                  dayRefs.current[day.dateStr] = el;
                }}
                style={[
                  styles.weekDaySection,
                  isDropTarget && styles.weekDaySectionDropTarget,
                ]}
              >
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
                      {day.isCurrentDay ? t('daily.today_prefix') : ''}
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
                    <Text style={styles.weekAddQuickText}>{t('daily.add_btn')}</Text>
                  </Pressable>
                </View>

                {/* Drop indicator when hovering over this day from another day */}
                {isDropTarget && (
                  <View
                    style={[
                      styles.weekDropIndicator,
                      {
                        borderColor: gold[400],
                        backgroundColor: theme.dark ? 'rgba(212,177,58,0.15)' : 'rgba(212,177,58,0.2)',
                      },
                    ]}
                  >
                    <Calendar size={13} color={gold[400]} />
                    <Text style={[styles.weekDropIndicatorText, { color: gold[400] }]}>
                      {t('daily.drop_to_reschedule', 'Soltar para mover a {{day}}', { day: day.dayName.toUpperCase() })}
                    </Text>
                  </View>
                )}

                {!isDayCollapsed && (
                  <>
                    {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                      <View style={[styles.weekDayEmpty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Text style={[styles.weekDayEmptyText, { color: theme.colors.foregroundMuted }]}>{t('daily.no_scheduled_tasks')}</Text>
                      </View>
                    ) : (
                      <>
                        {pendingTasks.length > 0 && (
                          <View
                            style={[
                              styles.compactListCard,
                              {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                              },
                            ]}
                          >
                            <DraggableTaskList
                              items={pendingTasks}
                              gap={0}
                              renderItem={(item, drag) =>
                                renderTaskRow(item, drag, pendingTasks.indexOf(item) === pendingTasks.length - 1)
                              }
                              onReorder={onReorder}
                              onDraggingChange={onDraggingChange}
                              onDragStartGlobal={(item) => handleDragStartForDay(item, day.dateStr)}
                              onDragMoveGlobal={(item, coords) => handleDragMoveGlobal(item, coords)}
                              onDragEndGlobal={(item, coords) => handleDragEndGlobal(item, coords)}
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
                                {t('daily.completed_count', { count: completedTasks.length })}
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

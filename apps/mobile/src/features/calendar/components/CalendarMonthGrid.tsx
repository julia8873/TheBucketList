import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Typography, useTheme } from '@bucketlist/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/calendar.styles';

interface CalendarMonthGridProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  daysInGrid: Date[];
  tasksByDay: Map<string, any[]>;
  completedThisMonth: number;
  isLoading: boolean;
}

export function CalendarMonthGrid({
  currentDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  daysInGrid,
  tasksByDay,
  completedThisMonth,
  isLoading,
}: CalendarMonthGridProps) {
  const { theme } = useTheme();

  return (
    <>
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
          <Pressable
            onPress={onPrevMonth}
            style={[styles.navButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
          >
            <ChevronLeft color={theme.colors.foreground} size={22} />
          </Pressable>
          <Pressable
            onPress={onNextMonth}
            style={[styles.navButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
          >
            <ChevronRight color={theme.colors.foreground} size={22} />
          </Pressable>
        </View>
      </View>

      {/* Weekdays */}
      <View style={styles.weekdaysRow}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: theme.colors.foregroundMuted }]}>{day}</Text>
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
                onPress={() => onSelectDate(day)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleSelected,
                    isToday && !isSelected && [styles.dayCircleToday, { borderColor: theme.colors.border }],
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: theme.colors.foreground },
                      isSelected && styles.dayTextSelected,
                      !isCurrentMonth && { color: theme.colors.foregroundSubtle },
                      isToday && !isSelected && { color: theme.colors.foreground, fontFamily: 'Inter_600SemiBold' },
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
          <Text style={[styles.legendText, { color: theme.colors.foregroundMuted }]}>Completada</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3A78C4' }]} />
          <Text style={[styles.legendText, { color: theme.colors.foregroundMuted }]}>Pendiente</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.legendText, { color: theme.colors.foregroundMuted }]}>Vencida</Text>
        </View>
      </View>
    </>
  );
}

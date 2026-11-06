import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Typography, useTheme } from '@bucketlist/ui';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react-native';
import { format, isSameMonth, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/utils/dateLocale';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { MonthYearPickerModal } from '@/components/MonthYearPickerModal';
import { styles } from '../styles/calendar.styles';

interface CalendarMonthGridProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPrevYear?: () => void;
  onNextYear?: () => void;
  onSelectMonthYear?: (date: Date) => void;
  daysInGrid: Date[];
  tasksByDay: Map<string, any[]>;
  completedThisMonth: number;
  isLoading: boolean;
  onGoToday?: () => void;
}

export function CalendarMonthGrid({
  currentDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onPrevYear,
  onNextYear,
  onSelectMonthYear,
  daysInGrid,
  tasksByDay,
  completedThisMonth,
  isLoading,
  onGoToday,
}: CalendarMonthGridProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = getDateFnsLocale(i18n.language);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

  return (
    <>
      {/* Month Navigation */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Pressable
            onPress={() => setShowMonthYearPicker(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.select_month_year', { defaultValue: 'Seleccionar mes y año' })}
          >
            <Typography
              variant="h1"
              color={theme.colors.foreground}
              style={{ textTransform: 'capitalize', fontSize: 20 }}
              numberOfLines={1}
            >
              {format(currentDate, 'MMMM yyyy', { locale: dateFnsLocale })}
            </Typography>
            <ChevronDown color={gold[400]} size={18} />
          </Pressable>
          <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginTop: 2 }}>
            {completedThisMonth === 0
              ? t('calendar.completed_this_month_zero')
              : completedThisMonth === 1
              ? t('calendar.completed_this_month_single')
              : t('calendar.completed_this_month_plural', { count: completedThisMonth })}
          </Typography>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Pressable
            onPress={onPrevMonth}
            style={[styles.navButton, { width: 30, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.prev_month')}
          >
            <ChevronLeft color={theme.colors.primary} size={16} />
          </Pressable>
          {onGoToday && (
            <Pressable
              onPress={onGoToday}
              style={[styles.navButton, { width: undefined, paddingHorizontal: 8, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('common.today', { defaultValue: 'Hoy' })}
            >
              <Text style={{ color: theme.colors.primary, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{t('common.today', { defaultValue: 'Hoy' })}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onNextMonth}
            style={[styles.navButton, { width: 30, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.next_month')}
          >
            <ChevronRight color={theme.colors.primary} size={16} />
          </Pressable>
        </View>
      </View>

      <MonthYearPickerModal
        visible={showMonthYearPicker}
        currentDate={currentDate}
        onSelect={(newDate) => {
          onSelectMonthYear?.(newDate);
          setShowMonthYearPicker(false);
        }}
        onClose={() => setShowMonthYearPicker(false)}
      />

      {/* Weekdays */}
      <View style={styles.weekdaysRow}>
        {(i18n.language === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'X', 'J', 'V', 'S', 'D']).map((day, i) => (
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
                    isToday && !isSelected && styles.dayCircleToday,
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
                  {hasCompleted && <View style={[styles.dot, { backgroundColor: isSelected ? '#FFFFFF' : '#D4B13A' }]} />}
                  {hasPending && <View style={[styles.dot, { backgroundColor: '#A1A1AA' }]} />}
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
          <Text style={[styles.legendText, { color: theme.colors.foregroundMuted }]}>{t('common.status_completed')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#A1A1AA' }]} />
          <Text style={[styles.legendText, { color: theme.colors.foregroundMuted }]}>{t('common.status_pending')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.legendText, { color: theme.colors.foregroundMuted }]}>{t('calendar.status_overdue')}</Text>
        </View>
      </View>
    </>
  );
}

import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Typography, useTheme, spacing, UrgencyChip } from '@bucketlist/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

import { useCalendar, CalendarDay, CalendarTask } from '../hooks/useCalendar';
import { useAuthStore } from '../stores/auth.store';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { useRouter } from 'expo-router';

export function CalendarTab() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  
  // Use user's timezone
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const { data: monthData, isLoading } = useCalendar(user?.id, year, month, tz);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Generate grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const daysInGrid = eachDayOfInterval({ start: startDate, end: endDate });

  // Map dates to data
  const dataMap = new Map<string, CalendarTask[]>();
  if (monthData) {
    monthData.forEach(d => {
      dataMap.set(d.date, d.tasks);
    });
  }

  // Selected day tasks
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = dataMap.get(selectedDateStr) || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      
      {/* Month Navigation */}
      <View style={styles.header}>
        <View>
          <Typography variant="h1" color={theme.colors.foreground} style={{ textTransform: 'capitalize' }}>
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </Typography>
          <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginTop: 4 }}>
            2 completadas este mes
          </Typography>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable onPress={prevMonth} style={styles.navButton}>
            <ChevronLeft color={theme.colors.foreground} size={24} />
          </Pressable>
          <Pressable onPress={nextMonth} style={styles.navButton}>
            <ChevronRight color={theme.colors.foreground} size={24} />
          </Pressable>
        </View>
      </View>

      {/* Weekdays */}
      <View style={styles.weekdaysRow}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
          <View key={i} style={styles.weekdayCell}>
            <Typography variant="caption" color={theme.colors.foregroundMuted} style={{ fontFamily: 'Inter-Bold' }}>
              {day}
            </Typography>
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
            
            const tasks = dataMap.get(dateStr) || [];
            
            // Check if there are completed tasks or pending tasks
            const hasCompleted = tasks.some(t => t.status === 'completed');
            const hasPending = tasks.some(t => t.status !== 'completed');
            
            // If the day is selected, it might have a background color from tasks.
            // The image shows Day 2 filled with Purple, Day 4 filled with Orange.
            // Since we don't have categories color in useCalendar yet, we use generic colors.
            // Let's use Gold if selected, or if there is a primary task category color, we could use it.
            // For now, to exactly match: Day 4 is selected and filled orange? No, wait. 
            // The user says "las tareas de ese dia que se vean como la imagen". The image shows a task card with an orange thumbnail.
            
            return (
              <Pressable
                key={i}
                style={styles.dayCell}
                onPress={() => setSelectedDate(day)}
              >
                <View style={[
                  styles.dayCircle,
                  isSelected && { backgroundColor: 'transparent', borderColor: gold[400], borderWidth: 1 },
                  !isSelected && tasks.length > 0 && { backgroundColor: tasks[0]?.status === 'completed' ? '#f97316' : '#7c3aed' },
                  !isSelected && tasks.length === 0 && { backgroundColor: 'transparent' }
                ]}>
                  <Typography 
                    variant="bodySemibold" 
                    color={
                      isSelected ? gold[400] : 
                      (tasks.length > 0 && !isSelected) ? '#FFF' : 
                      isCurrentMonth ? theme.colors.foreground : 
                      theme.colors.foregroundMuted
                    }
                  >
                    {format(day, 'd')}
                  </Typography>
                </View>
                
                {/* Dots indicator (below circle, if selected it shows outline gold dot) */}
                {isSelected ? null : (
                  <View style={styles.dotsRow}>
                    {hasCompleted && <View style={[styles.dot, { backgroundColor: '#f97316' }]} />}
                    {hasPending && <View style={[styles.dot, { borderColor: gold[400], borderWidth: 1, backgroundColor: 'transparent' }]} />}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
          <Typography variant="caption" color={theme.colors.foregroundMuted}>Completada</Typography>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { borderColor: gold[400], borderWidth: 1, backgroundColor: 'transparent' }]} />
          <Typography variant="caption" color={theme.colors.foregroundMuted}>Vence</Typography>
        </View>
      </View>

      {/* Selected Day Title */}
      <Typography variant="h3" color={gold[400]} style={styles.selectedDayTitle}>
        {format(selectedDate, 'd \'DE\' MMMM', { locale: es }).toUpperCase()}
      </Typography>

      {/* Selected Day Tasks */}
      <View style={styles.tasksContainer}>
        {selectedTasks.map(task => (
          <Pressable 
            key={task.id} 
            style={[styles.taskCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => router.push(`/bucket/${task.id}` as any)}
          >
            <View style={[styles.taskThumbnail, { backgroundColor: task.status === 'completed' ? '#f97316' : '#7c3aed' }]} />
            <View style={{ flex: 1 }}>
              <Typography variant="bodySemibold" color={theme.colors.foreground} numberOfLines={1}>
                {task.title}
              </Typography>
              <Typography variant="caption" color={theme.colors.foregroundMuted} style={{ marginTop: 4 }}>
                {task.visibility} · {task.status === 'completed' ? 'Completado' : 'Pendiente'}
              </Typography>
            </View>
            <ChevronRight color={theme.colors.foregroundMuted} size={20} />
          </Pressable>
        ))}
      </View>
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
  },
  navButton: {
    padding: 8,
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  loaderContainer: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  dayCell: {
    width: '14.28%', // 100 / 7
    aspectRatio: 0.8,
    alignItems: 'center',
    paddingTop: 4,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedDayTitle: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
    fontFamily: 'PlayfairDisplay-Bold',
    letterSpacing: 1,
  },
  tasksContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // For the bottom tab bar and FAB
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: dark[400],
  },
  taskThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 16,
  },
});

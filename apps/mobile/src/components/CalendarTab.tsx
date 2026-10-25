import React, { useState, useMemo } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

import { useBuckets } from '../hooks/useBuckets';
import { useAuthStore } from '../stores/auth.store';
import { usePullToRefresh } from '../hooks/useAutoRefresh';

import { styles } from '../features/calendar/styles/calendar.styles';
import { CalendarMonthGrid } from '../features/calendar/components/CalendarMonthGrid';
import { CalendarTaskListSections } from '../features/calendar/components/CalendarTaskListSections';

export interface CalendarTabProps {
  headerComponent?: React.ReactNode;
}

export const CalendarTab = React.forwardRef<ScrollView, CalendarTabProps>(function CalendarTab(
  { headerComponent },
  ref
) {
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

  const expiredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (buckets || [])
      .filter((item: any) => {
        if (item.status === 'completed') return false;
        if (!item.deadline) return false;
        try {
          const d = new Date(item.deadline);
          d.setHours(0, 0, 0, 0);
          return d.getTime() < today.getTime();
        } catch {
          return false;
        }
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      );
  }, [buckets]);

  const unscheduledTasks = useMemo(() => {
    return (buckets || []).filter(
      (item: any) => item.status !== 'completed' && !item.deadline
    );
  }, [buckets]);

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

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedTasks = tasksByDay.get(selectedDateStr) || [];

  return (
    <ScrollView
      ref={ref}
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor="#D4B13A"
        />
      }
    >
      {headerComponent}
      <CalendarMonthGrid
        currentDate={currentDate}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        daysInGrid={daysInGrid}
        tasksByDay={tasksByDay}
        completedThisMonth={completedThisMonth}
        isLoading={isLoading}
      />

      <CalendarTaskListSections
        selectedDate={selectedDate}
        selectedTasks={selectedTasks}
        expiredTasks={expiredTasks}
        unscheduledTasks={unscheduledTasks}
        showUnscheduled={showUnscheduled}
        onToggleUnscheduled={() => setShowUnscheduled(!showUnscheduled)}
      />
    </ScrollView>
  );
});

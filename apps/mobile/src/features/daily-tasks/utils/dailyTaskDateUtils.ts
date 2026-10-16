import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInCalendarDays,
  addDays,
  startOfDay,
  isBefore,
  addMonths,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { DailyTaskRecurrenceUnit } from '../types';

export function parseLocalDate(str?: string | null): Date {
  if (!str) return new Date();
  const [year, month, day] = str.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function formatTaskDateBadge(dateStr?: string | null): { text: string; isOverdue: boolean } {
  if (!dateStr) return { text: 'Sin fecha', isOverdue: false };
  const d = parseLocalDate(dateStr);
  const now = startOfDay(new Date());
  const taskDay = startOfDay(d);

  if (isToday(d)) return { text: 'Hoy', isOverdue: false };
  if (isTomorrow(d)) return { text: 'Mañana', isOverdue: false };
  if (isYesterday(d)) return { text: 'Ayer', isOverdue: true };
  if (isBefore(taskDay, now)) {
    return { text: format(d, 'd MMM', { locale: es }), isOverdue: true };
  }
  return { text: format(d, 'd MMM', { locale: es }), isOverdue: false };
}

export function isStandardRecurrencePreset(interval?: number, unit?: DailyTaskRecurrenceUnit): boolean {
  const i = interval || 1;
  const u = unit || 'days';
  if (u === 'days' && (i === 1 || i === 2)) return true;
  if (u === 'weeks' && (i === 1 || i === 2)) return true;
  if (u === 'months' && i === 1) return true;
  return false;
}

export function calculateNextRecurringDate(
  currentDueDateStr: string | null | undefined,
  interval: number = 1,
  unit: DailyTaskRecurrenceUnit = 'days'
): string {
  const today = startOfDay(new Date());
  let baseDate = currentDueDateStr ? startOfDay(parseISO(currentDueDateStr)) : today;

  if (isBefore(baseDate, today)) {
    baseDate = today;
  }

  const safeInterval = Math.max(1, interval || 1);
  let nextDate: Date;

  if (unit === 'weeks') {
    nextDate = addDays(baseDate, safeInterval * 7);
  } else if (unit === 'months') {
    nextDate = addMonths(baseDate, safeInterval);
  } else {
    nextDate = addDays(baseDate, safeInterval);
  }

  return format(nextDate, 'yyyy-MM-dd');
}

export function getRecurrenceLabel(
  interval: number = 1,
  unit: DailyTaskRecurrenceUnit = 'days'
): string {
  const safeInterval = Math.max(1, interval || 1);
  if (unit === 'days') {
    if (safeInterval === 1) return 'Cada día';
    return `Cada ${safeInterval} días`;
  }
  if (unit === 'weeks') {
    if (safeInterval === 1) return 'Cada semana';
    return `Cada ${safeInterval} semanas`;
  }
  if (unit === 'months') {
    if (safeInterval === 1) return 'Cada mes';
    return `Cada ${safeInterval} meses`;
  }
  return `Cada ${safeInterval} días`;
}

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
import i18n from 'i18next';
import { getDateFnsLocale } from '@/utils/dateLocale';
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

export function formatTaskDateBadge(
  dateStr?: string | null,
  language?: string
): { text: string; isOverdue: boolean; isToday: boolean } {
  const t = (key: string, options?: any): string => String(i18n.t(key, { lng: language, ...options }));
  if (!dateStr) return { text: t('daily.no_date'), isOverdue: false, isToday: false };
  const d = parseLocalDate(dateStr);
  const now = startOfDay(new Date());
  const taskDay = startOfDay(d);
  const dateFnsLocale = getDateFnsLocale(language || i18n.language);

  if (isToday(d)) return { text: t('daily.today'), isOverdue: false, isToday: true };
  if (isTomorrow(d)) return { text: t('daily.tomorrow'), isOverdue: false, isToday: false };
  if (isYesterday(d)) return { text: t('daily.yesterday'), isOverdue: true, isToday: false };
  if (isBefore(taskDay, now)) {
    return { text: format(d, 'd MMM', { locale: dateFnsLocale }), isOverdue: true, isToday: false };
  }
  return { text: format(d, 'd MMM', { locale: dateFnsLocale }), isOverdue: false, isToday: false };
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
  unit: DailyTaskRecurrenceUnit = 'days',
  language?: string
): string {
  const t = (key: string, options?: any): string => String(i18n.t(key, { lng: language, ...options }));
  const safeInterval = Math.max(1, interval || 1);

  if (unit === 'days') {
    if (safeInterval === 1) return t('daily.every_day');
    return t('daily.every_x_days', { count: safeInterval });
  }
  if (unit === 'weeks') {
    if (safeInterval === 1) return t('daily.every_week');
    return t('daily.every_x_weeks', { count: safeInterval });
  }
  if (unit === 'months') {
    if (safeInterval === 1) return t('daily.every_month');
    return t('daily.every_x_months', { count: safeInterval });
  }
  return t('daily.every_x_days', { count: safeInterval });
}

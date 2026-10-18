import type { DailyTaskPriority } from './types';

export const SORT_PREF_STORAGE_KEY = '@bucketlist_daily_sort_pref';
export const TIME_VIEW_STORAGE_KEY = '@bucketlist_daily_time_view';

export const PRIORITY_WEIGHT: Record<DailyTaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const PRIORITY_CONFIG: Record<
  DailyTaskPriority,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  low: { label: 'Baja', color: '#10B981', bgColor: '#0F261B', borderColor: '#194D31' },
  medium: { label: 'Media', color: '#D4B13A', bgColor: '#262010', borderColor: '#3D3310' },
  high: { label: 'Alta', color: '#F97316', bgColor: '#2B190E', borderColor: '#5C2D13' },
  urgent: { label: 'Urgente', color: '#EF4444', bgColor: '#2A1111', borderColor: '#592020' },
};

export function getPriorityConfig(priority: DailyTaskPriority, isDark: boolean = true) {
  if (isDark) return PRIORITY_CONFIG[priority];
  switch (priority) {
    case 'low':
      return { label: 'Baja', color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' };
    case 'medium':
      return { label: 'Media', color: '#B45309', bgColor: '#FFFBEB', borderColor: '#FDE68A' };
    case 'high':
      return { label: 'Alta', color: '#EA580C', bgColor: '#FFF7ED', borderColor: '#FED7AA' };
    case 'urgent':
      return { label: 'Urgente', color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' };
    default:
      return PRIORITY_CONFIG[priority];
  }
}

export const PRIORITY_ORDER: DailyTaskPriority[] = ['low', 'medium', 'high', 'urgent'];

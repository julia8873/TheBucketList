import i18n from 'i18next';
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

export function getPriorityConfig(
  priority: DailyTaskPriority,
  isDark: boolean = true,
  language?: string
) {
  const base = isDark
    ? PRIORITY_CONFIG[priority]
    : priority === 'low'
    ? { color: '#059669', bgColor: '#ECFDF5', borderColor: '#A7F3D0' }
    : priority === 'medium'
    ? { color: '#B45309', bgColor: '#FFFBEB', borderColor: '#FDE68A' }
    : priority === 'high'
    ? { color: '#EA580C', bgColor: '#FFF7ED', borderColor: '#FED7AA' }
    : { color: '#DC2626', bgColor: '#FEF2F2', borderColor: '#FECACA' };

  return {
    ...base,
    label: String(i18n.t(`daily.priority_label_${priority}`, { lng: language })),
  };
}

export const PRIORITY_ORDER: DailyTaskPriority[] = ['low', 'medium', 'high', 'urgent'];

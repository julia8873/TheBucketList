import React from 'react';
import { isPast, differenceInCalendarDays } from 'date-fns';
import { CheckCircle2, MoreHorizontal, Clock, AlertCircle } from 'lucide-react-native';

export type ItemStatusType = 'completed' | 'in_progress' | 'pending' | 'expired';

export function getTaskStatusType(item: { status?: string; deadline?: string | null }): ItemStatusType {
  if (item.status === 'completed') return 'completed';
  if (item.deadline) {
    const d = new Date(item.deadline);
    if (!isNaN(d.getTime()) && isPast(d) && differenceInCalendarDays(d, new Date()) < 0) {
      return 'expired';
    }
  }
  if (item.status === 'in_progress') return 'in_progress';
  if (item.status === 'expired') return 'expired';
  return 'pending';
}

export function getAlbumStatusType(item: {
  is_closed?: boolean;
  total_tasks?: number;
  completed_tasks?: number;
  deadline?: string | null;
}): ItemStatusType {
  const total = item.total_tasks ?? 0;
  const completed = item.completed_tasks ?? 0;
  if (total > 0 && completed === total) return 'completed';
  if (item.deadline) {
    const d = new Date(item.deadline);
    if (!isNaN(d.getTime()) && isPast(d) && differenceInCalendarDays(d, new Date()) < 0) {
      return 'expired';
    }
  }
  if (total > 0 && completed > 0 && completed < total) return 'in_progress';
  return 'pending';
}

export interface StatusConfig {
  status: ItemStatusType;
  label: string;
  color: string;
  bg: string;
  badgeBg: string;
  renderGalleryIcon: (size?: number) => React.ReactNode;
  rowIcon: React.ReactNode;
}

export function getStatusConfig(status: ItemStatusType, t: any, isAlbum?: boolean): StatusConfig {
  switch (status) {
    case 'completed': {
      const color = '#34C759';
      return {
        status,
        label: isAlbum
          ? t('albums.status_completed', { defaultValue: 'Completado' })
          : t('bucket.status_completed', { defaultValue: 'Completada' }),
        color,
        bg: 'rgba(52, 199, 89, 0.14)',
        badgeBg: 'rgba(52, 199, 89, 0.9)',
        renderGalleryIcon: (size = 12) => <CheckCircle2 size={size} color="#FFFFFF" strokeWidth={2.4} />,
        rowIcon: <CheckCircle2 size={10} color={color} strokeWidth={2.4} />,
      };
    }
    case 'in_progress': {
      const color = '#007AFF';
      return {
        status,
        label: t('bucket.status_in_progress', { defaultValue: 'En progreso' }),
        color,
        bg: 'rgba(0, 122, 255, 0.14)',
        badgeBg: 'rgba(0, 122, 255, 0.9)',
        renderGalleryIcon: (size = 12) => <MoreHorizontal size={size + 1} color="#FFFFFF" strokeWidth={2.4} />,
        rowIcon: <MoreHorizontal size={10} color={color} strokeWidth={2.4} />,
      };
    }
    case 'expired': {
      const color = '#EF4444';
      return {
        status,
        label: isAlbum
          ? t('common.expired', { defaultValue: 'Caducado' })
          : t('bucket.status_expired', { defaultValue: 'Caducada' }),
        color,
        bg: 'rgba(239, 68, 68, 0.14)',
        badgeBg: 'rgba(239, 68, 68, 0.9)',
        renderGalleryIcon: (size = 12) => <AlertCircle size={size} color="#FFFFFF" strokeWidth={2.4} />,
        rowIcon: <AlertCircle size={10} color={color} strokeWidth={2.4} />,
      };
    }
    case 'pending':
    default: {
      const color = '#8E8E93';
      return {
        status: 'pending',
        label: t('bucket.status_pending', { defaultValue: 'Pendiente' }),
        color,
        bg: 'rgba(142, 142, 147, 0.14)',
        badgeBg: 'rgba(142, 142, 147, 0.9)',
        renderGalleryIcon: (size = 12) => <Clock size={size} color="#FFFFFF" strokeWidth={2.2} />,
        rowIcon: <Clock size={10} color={color} strokeWidth={2.2} />,
      };
    }
  }
}


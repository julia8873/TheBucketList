import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Check, GripVertical } from 'lucide-react-native';
import type { SortField, SortDir } from '../types';
import { SheetFrame, SheetGroup, SheetLabel, SheetOption } from './ListControls';

interface MyListSortModalProps {
  visible: boolean;
  onClose: () => void;
  position: { top: number; right: number; centerX?: number };
  activeTab: string;
  sortField: SortField;
  sortDir: SortDir;
  isReordering: boolean;
  albumSortField: SortField;
  albumSortDir: SortDir;
  isAlbumReordering: boolean;
  theme: any;
  onSelectOption: (field: any) => void;
}

export function MyListSortModal({
  visible,
  onClose,
  position,
  activeTab,
  sortField,
  sortDir,
  isReordering,
  albumSortField,
  albumSortDir,
  isAlbumReordering,
  theme,
  onSelectOption,
}: MyListSortModalProps) {
  const { t } = useTranslation();

  const options =
    activeTab === 'albums'
      ? albumSortField === 'status'
        ? [
            { field: 'reorder_status' as const, label: t('my_list.sort_reorder_status') },
            { field: 'status' as const, label: t('my_list.sort_status') },
            { field: 'manual' as const, label: t('my_list.sort_manual_no_categories') },
            { field: 'priority' as const, label: t('my_list.sort_priority') },
            { field: 'alphabetical' as const, label: t('my_list.sort_alphabetical') },
            { field: 'created_at' as const, label: t('my_list.sort_created_at') },
            { field: 'completed_at' as const, label: t('my_list.sort_completed_at') },
          ]
        : [
            { field: 'manual' as const, label: t('my_list.sort_manual') },
            { field: 'status' as const, label: t('my_list.sort_status') },
            { field: 'priority' as const, label: t('my_list.sort_priority') },
            { field: 'alphabetical' as const, label: t('my_list.sort_alphabetical') },
            { field: 'created_at' as const, label: t('my_list.sort_created_at') },
            { field: 'completed_at' as const, label: t('my_list.sort_completed_at') },
          ]
      : sortField === 'status'
      ? [
          { field: 'reorder_status' as const, label: t('my_list.sort_reorder_status') },
          { field: 'status' as const, label: t('my_list.sort_status') },
          { field: 'manual' as const, label: t('my_list.sort_manual_no_categories') },
          { field: 'priority' as const, label: t('my_list.sort_priority') },
          { field: 'alphabetical' as const, label: t('my_list.sort_alphabetical') },
          { field: 'created_at' as const, label: t('my_list.sort_created_at') },
          { field: 'completed_at' as const, label: t('my_list.sort_completed_at') },
          { field: 'deadline' as const, label: t('my_list.sort_deadline') },
        ]
      : [
          { field: 'manual' as const, label: t('my_list.sort_manual') },
          { field: 'status' as const, label: t('my_list.sort_status') },
          { field: 'priority' as const, label: t('my_list.sort_priority') },
          { field: 'alphabetical' as const, label: t('my_list.sort_alphabetical') },
          { field: 'created_at' as const, label: t('my_list.sort_created_at') },
          { field: 'completed_at' as const, label: t('my_list.sort_completed_at') },
          { field: 'deadline' as const, label: t('my_list.sort_deadline') },
        ];

  const currentField = activeTab === 'albums' ? albumSortField : sortField;
  const currentDir = activeTab === 'albums' ? albumSortDir : sortDir;
  const isCurrentlyReordering = activeTab === 'albums' ? isAlbumReordering : isReordering;

  const primary = theme.colors.primary;

  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      theme={theme}
      title={activeTab === 'albums' ? t('my_list.sort_albums', { defaultValue: 'Ordenar álbumes' }) : t('my_list.sort_tasks', { defaultValue: 'Ordenar tareas' })}
      footerLabel={t('common.done', { defaultValue: 'Listo' })}
    >
      <View>
        <SheetLabel theme={theme}>{t('my_list.sort_criteria', { defaultValue: 'Criterio' })}</SheetLabel>
        <SheetGroup theme={theme}>
          {options.map((option) => {
            const selected =
              option.field === 'reorder_status' ? isCurrentlyReordering : currentField === option.field;
            let right: React.ReactNode = undefined;
            if (selected && option.field !== 'manual' && option.field !== 'reorder_status') {
              right = currentDir === 'desc' ? <ArrowDown color={primary} size={16} /> : <ArrowUp color={primary} size={16} />;
            } else if (option.field === 'reorder_status') {
              right = isCurrentlyReordering ? (
                <Check color={primary} size={16} strokeWidth={2.5} />
              ) : (
                <GripVertical color={theme.colors.foregroundMuted} size={16} />
              );
            }
            return (
              <SheetOption
                key={option.field}
                theme={theme}
                label={option.label}
                selected={selected}
                right={right}
                onPress={() => onSelectOption(option.field)}
              />
            );
          })}
        </SheetGroup>
      </View>
    </SheetFrame>
  );
}

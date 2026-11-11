import React from 'react';
import { View } from 'react-native';
import { ArrowDown, ArrowUp, Check } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import type { DailySortField, DailySortDirection } from '../types';
import { SheetFrame, SheetGroup, SheetLabel, SheetOption, SheetToggle } from '@/features/my-list/components/ListControls';

interface DailySortSheetProps {
  visible: boolean;
  onClose: () => void;
  sortField: DailySortField;
  sortDirection: DailySortDirection;
  groupByTag: boolean;
  onSelectSort: (field: DailySortField) => void;
  onToggleGroupByTag: () => void;
  onResetSort: () => void;
}

export const DailySortSheet: React.FC<DailySortSheetProps> = ({
  visible,
  onClose,
  sortField,
  sortDirection,
  groupByTag,
  onSelectSort,
  onToggleGroupByTag,
  onResetSort,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  if (!visible) return null;

  const primary = theme.colors.primary;

  const sortOptions: Array<{ field: DailySortField; label: string }> = [
    { field: 'manual', label: t('daily.sort_manual', { defaultValue: 'Manual (arrastrar)' }) },
    { field: 'priority', label: t('daily.sort_priority', { defaultValue: 'Prioridad' }) },
    { field: 'name', label: t('daily.sort_name', { defaultValue: 'Alfabético' }) },
    { field: 'date', label: t('daily.sort_date', { defaultValue: 'Fecha de vencimiento' }) },
    { field: 'created_at', label: t('daily.sort_created_at', { defaultValue: 'Fecha de creación' }) },
  ];

  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      theme={theme}
      title={t('daily.sort_and_classify', { defaultValue: 'Ordenar y clasificar' })}
      action={{
        label: t('daily.reset', { defaultValue: 'Restablecer' }),
        onPress: onResetSort,
      }}
      footerLabel={t('common.done', { defaultValue: 'Listo' })}
    >
      {/* Sección 1: Clasificación */}
      <View>
        <SheetLabel theme={theme}>
          {t('daily.classify_section', { defaultValue: 'Clasificar' })}
        </SheetLabel>
        <SheetGroup theme={theme}>
          <SheetToggle
            theme={theme}
            label={t('daily.classify_by_tags', { defaultValue: 'Agrupar por etiquetas' })}
            value={groupByTag}
            onChange={onToggleGroupByTag}
          />
        </SheetGroup>
      </View>

      {/* Sección 2: Criterio de ordenación */}
      <View>
        <SheetLabel theme={theme}>
          {t('daily.sort_by_section', { defaultValue: 'Criterio de ordenación' })}
        </SheetLabel>
        <SheetGroup theme={theme}>
          {sortOptions.map((opt) => {
            const isSelected = sortField === opt.field;
            let right: React.ReactNode = undefined;
            if (isSelected) {
              if (opt.field === 'manual') {
                right = <Check color={primary} size={16} strokeWidth={2.5} />;
              } else {
                right = sortDirection === 'desc' ? (
                  <ArrowDown color={primary} size={16} />
                ) : (
                  <ArrowUp color={primary} size={16} />
                );
              }
            }

            return (
              <SheetOption
                key={opt.field}
                theme={theme}
                label={opt.label}
                selected={isSelected}
                right={right}
                onPress={() => onSelectSort(opt.field)}
              />
            );
          })}
        </SheetGroup>
      </View>
    </SheetFrame>
  );
};

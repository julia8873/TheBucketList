import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@bucketlist/ui';
import { useDailyTasksCustomizationStore } from '@/stores/dailyTasksCustomization.store';
import { SheetFrame, SheetGroup, SheetLabel, SheetToggle } from '@/features/my-list/components/ListControls';

interface DailyTasksCustomizeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DailyTasksCustomizeModal({
  visible,
  onClose,
}: DailyTasksCustomizeModalProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const {
    customization,
    setOption,
    resetOptions,
  } = useDailyTasksCustomizationStore();

  if (!visible) return null;

  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      theme={theme}
      title={t('daily.customize_view', { defaultValue: 'Personalizar vista' })}
      action={{
        label: t('daily.reset', { defaultValue: 'Restablecer' }),
        onPress: resetOptions,
      }}
      footerLabel={t('common.done', { defaultValue: 'Listo' })}
    >
      <View>
        <SheetLabel theme={theme}>
          {t('my_list.customize_visible_elements', { defaultValue: 'Elementos visibles' })}
        </SheetLabel>
        <SheetGroup theme={theme}>
          <SheetToggle
            theme={theme}
            label={t('daily.customize_opt_priority', { defaultValue: 'Prioridad' })}
            value={customization.showPriority}
            onChange={(v) => setOption('showPriority', v)}
          />
          <SheetToggle
            theme={theme}
            label={t('daily.customize_opt_tags', { defaultValue: 'Etiquetas' })}
            value={customization.showTags}
            onChange={(v) => setOption('showTags', v)}
          />
          <SheetToggle
            theme={theme}
            label={t('daily.customize_opt_dates', { defaultValue: 'Fechas límite' })}
            value={customization.showDates}
            onChange={(v) => setOption('showDates', v)}
          />
          <SheetToggle
            theme={theme}
            label={t('daily.customize_opt_subtasks', { defaultValue: 'Progreso de subtareas' })}
            value={customization.showSubtasksProgress}
            onChange={(v) => setOption('showSubtasksProgress', v)}
          />
          <SheetToggle
            theme={theme}
            label={t('daily.customize_opt_recurrence', { defaultValue: 'Recurrencia' })}
            value={customization.showRecurrence}
            onChange={(v) => setOption('showRecurrence', v)}
          />
          <SheetToggle
            theme={theme}
            label={t('daily.customize_opt_desc', { defaultValue: 'Descripción' })}
            value={customization.showDescription}
            onChange={(v) => setOption('showDescription', v)}
          />
        </SheetGroup>
      </View>
    </SheetFrame>
  );
}

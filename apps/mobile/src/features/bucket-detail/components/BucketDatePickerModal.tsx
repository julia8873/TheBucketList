import React, { useState } from 'react';
import { View, Modal, Pressable, Platform } from 'react-native';
import { Typography, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UniversalDatePicker } from '@/components/UniversalDatePicker';

export interface DatePickerConfig {
  visible: boolean;
  type: 'deadline' | 'completed_at';
  date: Date;
}

interface BucketDatePickerModalProps {
  config: DatePickerConfig | null;
  onClose: () => void;
  onChangeDate: (date: Date, type: 'deadline' | 'completed_at') => Promise<void> | void;
}

export function BucketDatePickerModal({
  config,
  onClose,
  onChangeDate,
}: BucketDatePickerModalProps) {
  if (!config || !config.visible) return null;

  return (
    <BucketDatePickerModalInner
      key={`${config.type}-${config.date?.getTime?.() ?? 0}`}
      config={config}
      onClose={onClose}
      onChangeDate={onChangeDate}
    />
  );
}

function BucketDatePickerModalInner({
  config,
  onClose,
  onChangeDate,
}: {
  config: DatePickerConfig;
  onClose: () => void;
  onChangeDate: (date: Date, type: 'deadline' | 'completed_at') => Promise<void> | void;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(config.date || new Date());

  const handleConfirm = async () => {
    onClose();
    await onChangeDate(selectedDate, config.type);
  };

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent animationType="slide" visible={true} onRequestClose={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: theme.colors.surface, padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: theme.colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Pressable onPress={onClose} hitSlop={10}>
                <Typography variant="body" color={theme.colors.foregroundMuted}>{t('common.cancel')}</Typography>
              </Pressable>
              <Pressable onPress={handleConfirm} hitSlop={10}>
                <Typography variant="bodySemibold" color="#D4B13A">{t('common.save')}</Typography>
              </Pressable>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              themeVariant={theme.dark ? 'dark' : 'light'}
              maximumDate={config.type === 'completed_at' ? new Date() : undefined}
              onChange={(_event, date) => {
                if (date) {
                  setSelectedDate(date);
                }
              }}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <UniversalDatePicker
      value={config.date || new Date()}
      maximumDate={config.type === 'completed_at' ? new Date() : undefined}
      onChange={async (date) => {
        const type = config.type;
        onClose();
        if (date) {
          await onChangeDate(date, type);
        }
      }}
      onClose={onClose}
    />
  );
}

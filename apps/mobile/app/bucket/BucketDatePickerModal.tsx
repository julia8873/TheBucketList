import React, { useState } from 'react';
import { View, Modal, Pressable, Platform } from 'react-native';
import { Typography } from '@bucketlist/ui';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [selectedDate, setSelectedDate] = useState<Date>(config.date || new Date());

  const handleConfirm = async () => {
    onClose();
    await onChangeDate(selectedDate, config.type);
  };

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent animationType="slide" visible={true} onRequestClose={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#1C1C1E', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Pressable onPress={onClose} hitSlop={10}>
                <Typography variant="body" color="#8E8E93">Cancelar</Typography>
              </Pressable>
              <Pressable onPress={handleConfirm} hitSlop={10}>
                <Typography variant="bodySemibold" color="#D4B13A">Guardar</Typography>
              </Pressable>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              themeVariant="dark"
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
    <DateTimePicker
      value={config.date || new Date()}
      mode="date"
      display="default"
      maximumDate={config.type === 'completed_at' ? new Date() : undefined}
      onChange={async (event, date) => {
        const type = config.type;
        onClose();
        if (event.type === 'set' && date) {
          await onChangeDate(date, type);
        }
      }}
    />
  );
}

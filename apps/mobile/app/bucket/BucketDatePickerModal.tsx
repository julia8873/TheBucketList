import React from 'react';
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

  if (Platform.OS === 'ios') {
    return (
      <Modal transparent animationType="slide" visible={true} onRequestClose={onClose}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#1C1C1E', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
              <Pressable onPress={onClose}>
                <Typography variant="bodySemibold" color="#0A84FF">Hecho</Typography>
              </Pressable>
            </View>
            <DateTimePicker
              value={config.date}
              mode="date"
              display="spinner"
              themeVariant="dark"
              onChange={async (_event, date) => {
                if (date) {
                  await onChangeDate(date, config.type);
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
      value={config.date}
      mode="date"
      display="default"
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

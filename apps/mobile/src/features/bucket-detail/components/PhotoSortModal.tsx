import React from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { Typography } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { ArrowUp, ArrowDown } from 'lucide-react-native';

export type PhotoSortField = 'date' | 'title' | 'manual';
export type PhotoSortDir = 'asc' | 'desc';

interface PhotoSortModalProps {
  visible: boolean;
  canEdit: boolean;
  photoSortField: PhotoSortField;
  photoSortDir: PhotoSortDir;
  sortMenuPos: { top: number; right: number };
  theme: any;
  onClose: () => void;
  onSelectSort: (field: PhotoSortField) => void;
}

export function PhotoSortModal({
  visible,
  canEdit,
  photoSortField,
  photoSortDir,
  sortMenuPos,
  theme,
  onClose,
  onSelectSort,
}: PhotoSortModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View
          style={{
            position: 'absolute',
            top: sortMenuPos.top,
            right: sortMenuPos.right,
            minWidth: 130,
            backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: theme.dark ? 0.3 : 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {([
            { field: 'date', label: 'Fecha' },
            { field: 'title', label: 'Nombre' },
            ...(canEdit ? [{ field: 'manual', label: 'Manual' } as const] : []),
          ] as const).map((option, i) => {
            const selected = photoSortField === option.field;
            return (
              <Pressable
                key={option.field}
                onPress={() => onSelectSort(option.field)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: theme.colors.borderSubtle ?? theme.colors.border,
                }}
              >
                <Typography
                  variant={selected ? 'bodySemibold' : 'body'}
                  color={selected ? gold[400] : theme.colors.foreground}
                >
                  {option.label}
                </Typography>
                {selected && option.field !== 'manual' &&
                  (photoSortDir === 'desc' ? (
                    <ArrowDown color={gold[400]} size={16} />
                  ) : (
                    <ArrowUp color={gold[400]} size={16} />
                  ))}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

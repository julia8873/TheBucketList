import React from 'react';
import { View, StyleSheet, Pressable, Modal } from 'react-native';
import { Typography } from '@bucketlist/ui';
import { dark, gold } from '@bucketlist/ui/src/tokens/colors';
import { ArrowDown, ArrowUp, Check, GripVertical } from 'lucide-react-native';
import { SortField, SortDir } from '../types';

interface MyListSortModalProps {
  visible: boolean;
  onClose: () => void;
  position: { top: number; right: number };
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
  if (!visible) return null;

  const options =
    activeTab === 'albums'
      ? albumSortField === 'status'
        ? [
            { field: 'reorder_status' as const, label: 'Reordenar manualmente' },
            { field: 'status' as const, label: 'Estado' },
            { field: 'manual' as const, label: 'Manual (sin categorías)' },
            { field: 'priority' as const, label: 'Prioridad' },
            { field: 'alphabetical' as const, label: 'Alfabético' },
            { field: 'created_at' as const, label: 'Fecha de creación' },
          ]
        : [
            { field: 'manual' as const, label: 'Manual' },
            { field: 'status' as const, label: 'Estado' },
            { field: 'priority' as const, label: 'Prioridad' },
            { field: 'alphabetical' as const, label: 'Alfabético' },
            { field: 'created_at' as const, label: 'Fecha de creación' },
          ]
      : sortField === 'status'
      ? [
          { field: 'reorder_status' as const, label: 'Reordenar manualmente' },
          { field: 'status' as const, label: 'Estado' },
          { field: 'manual' as const, label: 'Manual (sin categorías)' },
          { field: 'priority' as const, label: 'Prioridad' },
          { field: 'alphabetical' as const, label: 'Alfabético' },
          { field: 'created_at' as const, label: 'Fecha de creación' },
        ]
      : [
          { field: 'manual' as const, label: 'Manual' },
          { field: 'status' as const, label: 'Estado' },
          { field: 'priority' as const, label: 'Prioridad' },
          { field: 'alphabetical' as const, label: 'Alfabético' },
          { field: 'created_at' as const, label: 'Fecha de creación' },
        ];

  const currentField = activeTab === 'albums' ? albumSortField : sortField;
  const currentDir = activeTab === 'albums' ? albumSortDir : sortDir;
  const isCurrentlyReordering = activeTab === 'albums' ? isAlbumReordering : isReordering;

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
            top: position.top,
            right: position.right,
            minWidth: 160,
            backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            overflow: 'hidden',
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: theme.dark ? 0.35 : 0.15,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {options.map((option, i) => {
            const selected =
              option.field === 'reorder_status'
                ? isCurrentlyReordering
                : currentField === option.field;
            return (
              <Pressable
                key={option.field}
                onPress={() => onSelectOption(option.field)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
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
                {selected && option.field !== 'manual' && option.field !== 'reorder_status' &&
                  (currentDir === 'desc' ? (
                    <ArrowDown color={gold[400]} size={16} />
                  ) : (
                    <ArrowUp color={gold[400]} size={16} />
                  ))}
                {option.field === 'reorder_status' &&
                  (isCurrentlyReordering ? (
                    <Check color={gold[400]} size={16} strokeWidth={2.5} />
                  ) : (
                    <GripVertical color={gold[400]} size={16} />
                  ))}
                {selected && option.field === 'manual' && (
                  <Check color={gold[400]} size={16} strokeWidth={2.5} />
                )}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

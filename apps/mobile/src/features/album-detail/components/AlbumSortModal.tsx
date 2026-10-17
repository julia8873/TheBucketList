import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { ArrowDown, ArrowUp, Check, GripVertical } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { styles } from '../styles/album-detail.styles';

export type TaskSortField = 'manual' | 'priority' | 'alphabetical' | 'completed_at';
export type TaskSortDir = 'asc' | 'desc';

interface AlbumSortModalProps {
  visible: boolean;
  canEdit: boolean;
  albumId: string;
  taskSortField: TaskSortField;
  taskSortDir: TaskSortDir;
  isReorderingTasks: boolean;
  sortMenuPos: { top: number; right: number };
  onClose: () => void;
  onSelectOption: (field: TaskSortField) => void;
}

export function AlbumSortModal({
  visible,
  canEdit,
  albumId,
  taskSortField,
  taskSortDir,
  isReorderingTasks,
  sortMenuPos,
  onClose,
  onSelectOption,
}: AlbumSortModalProps) {
  const { theme } = useTheme();
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View
          style={[
            styles.sortMenu,
            {
              top: sortMenuPos.top,
              right: sortMenuPos.right,
              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {(
            [
              ...(canEdit && albumId !== 'unassigned'
                ? [{ field: 'manual' as const, label: 'Reordenar manualmente' }]
                : []),
              { field: 'priority' as const, label: 'Prioridad' },
              { field: 'alphabetical' as const, label: 'Nombre' },
              { field: 'completed_at' as const, label: 'Fecha de completado' },
            ] as const
          ).map((opt, i) => {
            const selected =
              opt.field === 'manual' ? isReorderingTasks : taskSortField === opt.field;
            return (
              <Pressable
                key={opt.field}
                onPress={() => onSelectOption(opt.field)}
                style={[
                  styles.sortMenuItem,
                  i > 0 && [styles.sortMenuItemBorder, { borderTopColor: theme.colors.border }],
                ]}
              >
                <Text
                  style={[
                    styles.sortMenuText,
                    { color: selected ? '#D4B13A' : theme.colors.foreground },
                    selected && { fontFamily: 'Inter_600SemiBold' },
                  ]}
                >
                  {opt.label}
                </Text>
                {selected && opt.field !== 'manual' &&
                  (taskSortDir === 'desc' ? (
                    <ArrowDown size={14} color="#D4B13A" />
                  ) : (
                    <ArrowUp size={14} color="#D4B13A" />
                  ))}
                {opt.field === 'manual' &&
                  (isReorderingTasks ? (
                    <Check size={14} color="#D4B13A" strokeWidth={2.5} />
                  ) : (
                    <GripVertical size={14} color="#D4B13A" />
                  ))}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

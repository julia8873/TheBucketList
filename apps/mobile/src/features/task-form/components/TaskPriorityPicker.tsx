import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flag } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { styles } from '../styles/task-form.styles';

interface TaskPriorityPickerProps {
  value: 'low' | 'medium' | 'high';
  onChange: (priority: 'low' | 'medium' | 'high') => void;
}

const PRIORITIES = [
  { id: 'low' as const, label: 'Baja', color: '#10B981', bgActive: 'rgba(16, 185, 129, 0.14)', borderActive: '#10B981' },
  { id: 'medium' as const, label: 'Media', color: '#D4B13A', bgActive: 'rgba(212, 177, 58, 0.14)', borderActive: '#D4B13A' },
  { id: 'high' as const, label: 'Alta', color: '#EF4444', bgActive: 'rgba(239, 68, 68, 0.14)', borderActive: '#EF4444' },
];

export function TaskPriorityPicker({
  value = 'medium',
  onChange,
}: TaskPriorityPickerProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.priorityRow}>
      {PRIORITIES.map((p) => {
        const active = (value || 'medium') === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => onChange(p.id)}
            style={[
              styles.priorityPill,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
              active && { backgroundColor: p.bgActive, borderColor: p.borderActive },
            ]}
          >
            <Flag
              size={15}
              color={active ? p.color : theme.colors.foregroundMuted}
              strokeWidth={active ? 2.2 : 1.8}
            />
            <Text
              style={[
                styles.priorityText,
                { color: theme.colors.foregroundMuted },
                active && { color: p.color, fontWeight: '700' },
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

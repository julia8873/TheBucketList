import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertCircle, Calendar, CheckCircle2, Trash2 } from 'lucide-react-native';

import { styles } from '../styles/explore.styles';
import { DailyTask } from '../types';
import { DraggableTaskList, DragHandle } from '@/components/DraggableTaskList';

interface DailyOverdueSectionProps {
  tasks: DailyTask[];
  renderOverdueTaskRow: (item: DailyTask, drag?: DragHandle, isLast?: boolean) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onDraggingChange: (isDragging: boolean) => void;
  onMoveAllToToday?: () => void;
  onCompleteAll?: () => void;
  onDeleteAll?: () => void;
}

export function DailyOverdueSection({
  tasks,
  renderOverdueTaskRow,
  onReorder,
  onDraggingChange,
  onMoveAllToToday,
  onCompleteAll,
  onDeleteAll,
}: DailyOverdueSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <View style={styles.overdueSectionWrapper}>
      <View style={styles.overdueSectionHeader}>
        <View style={styles.overdueSectionHeaderLeft}>
          <View style={styles.overdueIconCircle}>
            <AlertCircle size={15} color="#F59E0B" strokeWidth={2.4} />
          </View>
          <Text style={styles.overdueSectionTitle}>
            Atrasadas ({tasks.length})
          </Text>
        </View>
        <Text style={styles.overdueSectionHint}>Pasa a hoy o reprograma</Text>
      </View>

      {/* Bulk action buttons */}
      <View style={styles.overdueActionsRow}>
        {onMoveAllToToday && (
          <Pressable
            style={styles.overdueActionBtn}
            onPress={onMoveAllToToday}
            accessibilityRole="button"
            accessibilityLabel="Mover todas las tareas atrasadas a hoy"
          >
            <Calendar size={12} color="#F59E0B" strokeWidth={2} />
            <Text style={styles.overdueActionText}>Mover a hoy</Text>
          </Pressable>
        )}

        {onCompleteAll && (
          <Pressable
            style={styles.overdueActionBtn}
            onPress={onCompleteAll}
            accessibilityRole="button"
            accessibilityLabel="Completar todas las tareas atrasadas"
          >
            <CheckCircle2 size={12} color="#34C759" strokeWidth={2} />
            <Text style={[styles.overdueActionText, { color: '#34C759' }]}>Completar todas</Text>
          </Pressable>
        )}

        {onDeleteAll && (
          <Pressable
            style={[styles.overdueActionBtn, styles.overdueActionDeleteBtn]}
            onPress={onDeleteAll}
            accessibilityRole="button"
            accessibilityLabel="Borrar todas las tareas atrasadas"
          >
            <Trash2 size={12} color="#EF4444" strokeWidth={2} />
            <Text style={[styles.overdueActionText, { color: '#EF4444' }]}>Borrar todas</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.overdueListCard}>
        <DraggableTaskList
          items={tasks}
          gap={0}
          renderItem={(item, drag) =>
            renderOverdueTaskRow(
              item,
              drag,
              tasks.indexOf(item) === tasks.length - 1
            )
          }
          onReorder={onReorder}
          onDraggingChange={onDraggingChange}
        />
      </View>
    </View>
  );
}

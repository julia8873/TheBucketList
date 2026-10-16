import React from 'react';
import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

import { styles } from '../styles/explore.styles';
import { DailyTask } from '../types';
import { DraggableTaskList, DragHandle } from '@/components/DraggableTaskList';

interface DailyOverdueSectionProps {
  tasks: DailyTask[];
  renderOverdueTaskRow: (item: DailyTask, drag?: DragHandle, isLast?: boolean) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onDraggingChange: (isDragging: boolean) => void;
}

export function DailyOverdueSection({
  tasks,
  renderOverdueTaskRow,
  onReorder,
  onDraggingChange,
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

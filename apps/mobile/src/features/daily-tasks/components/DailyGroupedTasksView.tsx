import React from 'react';
import { View, Text } from 'react-native';

import { styles } from '../styles/explore.styles';
import { DailyTask, DailyTag } from '../types';
import { DraggableTaskList, DragHandle } from '@/components/DraggableTaskList';

interface DailyGroupedTasksViewProps {
  groups: { id: string; tag: DailyTag | null; tasks: DailyTask[] }[];
  renderTaskRow: (task: DailyTask, drag?: DragHandle, isLast?: boolean) => React.ReactNode;
  onReorder: (orderedIds: string[]) => void;
  onDraggingChange: (isDragging: boolean) => void;
}

export function DailyGroupedTasksView({
  groups,
  renderTaskRow,
  onReorder,
  onDraggingChange,
}: DailyGroupedTasksViewProps) {
  return (
    <View style={styles.tagGroupsContainer}>
      {groups.map((grp) => (
        <View key={grp.id} style={styles.tagGroupBlock}>
          <View style={styles.tagGroupHeader}>
            <View
              style={[
                styles.tagGroupDot,
                { backgroundColor: grp.tag?.color || '#888' },
              ]}
            />
            <Text style={styles.tagGroupTitle}>
              {grp.tag ? `${grp.tag.emoji ? grp.tag.emoji + ' ' : ''}${grp.tag.name}` : 'Sin etiqueta'}
            </Text>
            <View style={styles.tagGroupBadge}>
              <Text style={styles.tagGroupBadgeText}>{grp.tasks.length}</Text>
            </View>
          </View>
          <View style={styles.compactListCard}>
            <DraggableTaskList
              items={grp.tasks}
              gap={0}
              renderItem={(task, drag) =>
                renderTaskRow(task, drag, grp.tasks.indexOf(task) === grp.tasks.length - 1)
              }
              onReorder={onReorder}
              onDraggingChange={onDraggingChange}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

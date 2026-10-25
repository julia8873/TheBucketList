import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { AlertCircle, Calendar, CheckCircle2, Trash2 } from 'lucide-react-native';

import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
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
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (tasks.length === 0) return null;

  return (
    <View style={styles.overdueSectionWrapper}>
      <View style={styles.overdueSectionHeader}>
        <View style={styles.overdueSectionHeaderLeft}>
          <View
            style={[
              styles.overdueIconCircle,
              {
                backgroundColor: theme.dark ? '#342105' : '#FDF3E1',
                borderColor: theme.dark ? '#603B08' : '#F7D694',
              },
            ]}
          >
            <AlertCircle size={15} color="#F59E0B" strokeWidth={2.4} />
          </View>
          <Text style={[styles.overdueSectionTitle, { color: theme.dark ? '#F59E0B' : '#B45309' }]}>
            {t('daily.overdue_title')} ({tasks.length})
          </Text>
        </View>
        <Text style={[styles.overdueSectionHint, { color: theme.colors.foregroundMuted }]}>{t('daily.overdue_hint')}</Text>
      </View>

      {/* Bulk action buttons - deslizable horizontalmente para que ninguna acción se corte */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.overdueActionsScroll}
        style={styles.overdueActionsScrollContainer}
      >
        {onMoveAllToToday && (
          <Pressable
            style={styles.overdueActionBtn}
            onPress={onMoveAllToToday}
            accessibilityRole="button"
            accessibilityLabel={t('daily.overdue_move_today')}
          >
            <Calendar size={12} color="#F59E0B" strokeWidth={2} />
            <Text style={styles.overdueActionText}>{t('daily.overdue_move_today')}</Text>
          </Pressable>
        )}

        {onCompleteAll && (
          <Pressable
            style={styles.overdueActionBtn}
            onPress={onCompleteAll}
            accessibilityRole="button"
            accessibilityLabel={t('daily.overdue_complete_all')}
          >
            <CheckCircle2 size={12} color="#34C759" strokeWidth={2} />
            <Text style={[styles.overdueActionText, { color: '#34C759' }]}>{t('daily.overdue_complete_all')}</Text>
          </Pressable>
        )}

        {onDeleteAll && (
          <Pressable
            style={[styles.overdueActionBtn, styles.overdueActionDeleteBtn]}
            onPress={onDeleteAll}
            accessibilityRole="button"
            accessibilityLabel={t('daily.overdue_delete_all')}
          >
            <Trash2 size={12} color="#EF4444" strokeWidth={2} />
            <Text style={[styles.overdueActionText, { color: '#EF4444' }]}>{t('daily.overdue_delete_all')}</Text>
          </Pressable>
        )}
      </ScrollView>

      <View
        style={[
          styles.overdueListCard,
          {
            backgroundColor: theme.dark ? '#15110A' : '#FFF9F0',
            borderColor: theme.dark ? '#38250A' : '#F2D39A',
          },
        ]}
      >
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

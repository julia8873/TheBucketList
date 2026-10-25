import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TaskRow, useTheme } from '@bucketlist/ui';
import { ChevronRight, Calendar } from 'lucide-react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/utils/dateLocale';
import { useRouter } from 'expo-router';
import { BucketCover } from '../../../components/BucketCover';
import { resolveTaskImage } from '../../../utils/taskImage';
import { styles } from '../styles/calendar.styles';

interface CalendarTaskListSectionsProps {
  selectedDate: Date;
  selectedTasks: any[];
  expiredTasks: any[];
  unscheduledTasks: any[];
  showUnscheduled: boolean;
  onToggleUnscheduled: () => void;
}

export function CalendarTaskListSections({
  selectedDate,
  selectedTasks,
  expiredTasks,
  unscheduledTasks,
  showUnscheduled,
  onToggleUnscheduled,
}: CalendarTaskListSectionsProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = getDateFnsLocale(i18n.language);

  const renderThumbnail = (task: any) => (
    <BucketCover
      value={resolveTaskImage(task, { preferThumb: true })}
      title={task.title}
      categorySlug={task.category?.slug}
      seed={task.id}
      iconSize={56}
      style={StyleSheet.absoluteFill}
    />
  );

  const getMeta = (task: any) => {
    const pLabel =
      task.priority === 'high'
        ? t('calendar.priority_high')
        : task.priority === 'low'
        ? t('calendar.priority_low')
        : t('calendar.priority_medium');
    const catName = task.priority
      ? pLabel
      : (i18n.language === 'en' ? (task.category?.name_en || task.category?.name_es) : task.category?.name_es) || t('calendar.no_category');
    const subtasks = task.item_subtasks || [];
    const subtasksTotal = subtasks.length;
    const subtasksDone = subtasks.filter((s: any) => s.done).length;

    if (task.status === 'completed') {
      return `${catName} · ${t('calendar.completed_tag')}`;
    }
    if (subtasksTotal > 0) {
      return `${catName} · ${t('calendar.subtasks_progress', { done: subtasksDone, total: subtasksTotal })}`;
    }
    return catName;
  };

  return (
    <>
      {/* ── SECCIÓN: Tareas del Día Seleccionado ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
          <Text style={{ color: '#D4B13A' }}>
            {format(selectedDate, t('calendar.date_format_day_month'), { locale: dateFnsLocale }).toUpperCase()}
          </Text>
          {selectedTasks.length > 0 ? ` · ${selectedTasks.length}` : ''}
        </Text>
      </View>

      <View style={styles.tasksContainer}>
        {selectedTasks.length === 0 ? (
          <View style={[styles.emptyDayContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Calendar color={theme.colors.foregroundMuted} size={28} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyDayText, { color: theme.colors.foregroundMuted }]}>
              {t('calendar.no_tasks_day')}
            </Text>
          </View>
        ) : (
          selectedTasks.map((task) => {
            const isExpired =
              task.status !== 'completed' &&
              task.deadline &&
              new Date(task.deadline).getTime() < new Date().setHours(0, 0, 0, 0);

            return (
              <View key={task.id} style={{ marginBottom: 10 }}>
                <TaskRow
                  title={task.title}
                  meta={getMeta(task)}
                  deadline={task.deadline}
                  thumbnailElement={renderThumbnail(task)}
                  completed={task.status === 'completed'}
                  expiredAction={isExpired}
                  onPress={() => router.push(`/bucket/${task.id}`)}
                />
              </View>
            );
          })
        )}
      </View>

      {/* ── SECCIÓN: TAREAS VENCIDAS ── */}
      {expiredTasks.length > 0 && (
        <View style={[styles.expiredSection, { borderTopColor: theme.colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.expiredDot} />
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                <Text style={{ color: '#EF4444' }}>{t('calendar.overdue')}</Text> · {expiredTasks.length}
              </Text>
            </View>
            <Text style={[styles.expiredSectionSubtitle, { color: theme.colors.foregroundMuted }]}>
              {expiredTasks.length === 1
                ? t('calendar.overdue_single')
                : t('calendar.overdue_plural', { count: expiredTasks.length })}
            </Text>
          </View>

          <View style={styles.tasksContainer}>
            {expiredTasks.map((task) => (
              <View key={task.id} style={{ marginBottom: 10 }}>
                <TaskRow
                  title={task.title}
                  meta={getMeta(task)}
                  deadline={task.deadline}
                  thumbnailElement={renderThumbnail(task)}
                  completed={false}
                  expiredAction={true}
                  onPress={() => router.push(`/bucket/${task.id}`)}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── SECCIÓN: Tareas sin fecha asignada ── */}
      {unscheduledTasks.length > 0 && (
        <View style={[styles.unscheduledSection, { borderTopColor: theme.colors.border }]}>
          <Pressable
            style={styles.unscheduledHeader}
            onPress={onToggleUnscheduled}
          >
            <Text style={[styles.unscheduledTitle, { color: theme.colors.foregroundMuted }]}>
              {t('calendar.unscheduled')} · {unscheduledTasks.length}
            </Text>
            <ChevronRight
              color={theme.colors.foregroundMuted}
              size={18}
              style={{ transform: [{ rotate: showUnscheduled ? '90deg' : '0deg' }] }}
            />
          </Pressable>

          {showUnscheduled && (
            <View style={[styles.tasksContainer, { marginTop: 10 }]}>
              {unscheduledTasks.map((task) => (
                <View key={task.id} style={{ marginBottom: 10 }}>
                  <TaskRow
                    title={task.title}
                    meta={getMeta(task)}
                    thumbnailElement={renderThumbnail(task)}
                    completed={false}
                    onPress={() => router.push(`/bucket/${task.id}`)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </>
  );
}

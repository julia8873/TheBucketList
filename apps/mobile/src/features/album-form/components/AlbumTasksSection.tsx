import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ListChecks, Plus, X } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles as formStyles } from '../../task-form/styles/task-form.styles';
import { styles } from '../styles/album-form.styles';
import { MentionThumb } from '../../../components/TaskMentionPickerSheet';
import type { AlbumPickableTask } from '../../../components/AlbumTaskPickerSheet';

interface AlbumTasksSectionProps {
  tasks: AlbumPickableTask[];
  onOpenPicker: () => void;
  onRemoveTask: (id: string) => void;
}

/** Sección «Tareas»: botón para añadir tareas existentes al álbum y lista compacta de las elegidas. */
export function AlbumTasksSection({ tasks, onOpenPicker, onRemoveTask }: AlbumTasksSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const label =
    tasks.length === 0
      ? t('album_form.add_tasks_placeholder')
      : tasks.length === 1
        ? t('album_form.tasks_added_single')
        : t('album_form.tasks_added_plural', { count: tasks.length });

  return (
    <View style={styles.section}>
      <Text style={[formStyles.sectionLabel, { color: theme.colors.foreground, marginTop: 0 }]}>
        <Text style={{ color: '#D4B13A' }}>{t('album_form.section_tasks')}</Text>
        {tasks.length > 0 ? ` · ${tasks.length}` : ''}
      </Text>

      <Pressable
        style={[
          formStyles.collaboratorRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, height: 54, marginTop: 0 },
        ]}
        onPress={onOpenPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <ListChecks color="#D4B13A" size={22} />
        <Text style={[formStyles.collaboratorPlaceholder, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
          {label}
        </Text>
        <Plus color="#D4B13A" size={20} />
      </Pressable>

      {tasks.length > 0 && (
        <View style={{ marginTop: 8, gap: 6 }}>
          {tasks.map((task) => (
            <View
              key={task.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 6,
                paddingLeft: 6,
                paddingRight: 12,
                borderRadius: 14,
                borderWidth: 1,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <MentionThumb task={task} size={36} />
              <Text
                style={{ flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: theme.colors.foreground }}
                numberOfLines={1}
              >
                {task.title}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => onRemoveTask(task.id)}
                accessibilityRole="button"
                accessibilityLabel={t('album_form.remove_task')}
              >
                <X color="#D4B13A" size={16} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

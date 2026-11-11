import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { AlertCircle, Calendar, CheckCircle2, Trash2, ChevronUp, ChevronDown } from 'lucide-react-native';

import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import type { DailyTask } from '../types';
import type { DragHandle } from '@/components/DraggableTaskList';
import { DraggableTaskList } from '@/components/DraggableTaskList';

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.dark ? '#3A2E12' : '#E8C56A',
        backgroundColor: theme.dark ? '#13110C' : '#FFFDF8',
        padding: 12,
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: 1.5,
              borderColor: gold[400],
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
              backgroundColor: theme.dark ? 'rgba(212,177,58,0.12)' : 'rgba(212,177,58,0.18)',
            }}
          >
            <AlertCircle size={13} color={gold[400]} strokeWidth={2.4} />
          </View>
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'Inter_700Bold',
              letterSpacing: 0.8,
              color: gold[400],
              textTransform: 'uppercase',
            }}
          >
            {t('daily.overdue_title', { defaultValue: 'ATRASADAS' })}
          </Text>
          <View
            style={{
              marginLeft: 8,
              paddingHorizontal: 7,
              paddingVertical: 1,
              borderRadius: 8,
              backgroundColor: theme.dark ? '#241D0E' : '#FDF4DC',
              borderWidth: 1,
              borderColor: theme.dark ? '#423712' : '#E8C56A',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Inter_700Bold',
                color: gold[400],
              }}
            >
              {tasks.length}
            </Text>
          </View>
        </View>

        {/* Botón Plegar / Desplegar */}
        <Pressable
          onPress={() => setIsCollapsed(!isCollapsed)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isCollapsed ? t('daily.show', { defaultValue: 'Mostrar' }) : t('daily.hide', { defaultValue: 'Ocultar' })}
        >
          <Text style={{ fontSize: 12, fontFamily: 'Inter_500Medium', color: theme.colors.foregroundMuted }}>
            {isCollapsed ? t('daily.show', { defaultValue: 'Mostrar' }) : t('daily.hide', { defaultValue: 'Ocultar' })}
          </Text>
          {isCollapsed ? (
            <ChevronDown size={14} color={theme.colors.foregroundMuted} />
          ) : (
            <ChevronUp size={14} color={theme.colors.foregroundMuted} />
          )}
        </Pressable>
      </View>

      {!isCollapsed && (
        <>
          {/* Bulk action buttons: Mover a hoy | Completar | Borrar */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 }}>
            {onMoveAllToToday && (
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  height: 32,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.dark ? '#4A3B10' : '#E8C56A',
                  backgroundColor: theme.dark ? 'rgba(212,177,58,0.06)' : 'rgba(212,177,58,0.12)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: pressed ? 0.8 : 1,
                })}
                onPress={onMoveAllToToday}
                accessibilityRole="button"
                accessibilityLabel={t('daily.overdue_move_today', { defaultValue: 'Mover a hoy' })}
              >
                <Calendar size={13} color={gold[400]} strokeWidth={2} />
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: gold[400] }} numberOfLines={1}>
                  {t('daily.overdue_move_today', { defaultValue: 'Mover a hoy' })}
                </Text>
              </Pressable>
            )}

            {onCompleteAll && (
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  height: 32,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.dark ? '#1E3E2B' : '#86EFAC',
                  backgroundColor: theme.dark ? 'rgba(52,199,89,0.06)' : 'rgba(52,199,89,0.12)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: pressed ? 0.8 : 1,
                })}
                onPress={onCompleteAll}
                accessibilityRole="button"
                accessibilityLabel={t('daily.overdue_complete_all', { defaultValue: 'Completar todas' })}
              >
                <CheckCircle2 size={13} color="#34C759" strokeWidth={2} />
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#34C759' }} numberOfLines={1}>
                  {t('daily.overdue_complete_short', { defaultValue: 'Completar' })}
                </Text>
              </Pressable>
            )}

            {onDeleteAll && (
              <Pressable
                style={({ pressed }) => ({
                  flex: 1,
                  height: 32,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: theme.dark ? '#4E1F1F' : '#FCA5A5',
                  backgroundColor: theme.dark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.12)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: pressed ? 0.8 : 1,
                })}
                onPress={onDeleteAll}
                accessibilityRole="button"
                accessibilityLabel={t('daily.overdue_delete_all', { defaultValue: 'Borrar todas' })}
              >
                <Trash2 size={13} color="#EF4444" strokeWidth={2} />
                <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#EF4444' }} numberOfLines={1}>
                  {t('daily.overdue_delete_short', { defaultValue: 'Borrar' })}
                </Text>
              </Pressable>
            )}
          </View>

          {/* List of overdue tasks */}
          <DraggableTaskList
            items={tasks}
            gap={6}
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
        </>
      )}
    </View>
  );
}

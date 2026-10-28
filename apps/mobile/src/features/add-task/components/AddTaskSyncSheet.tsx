import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Flag, Eye, Users, Lock } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';
import type { AddTaskSyncPrompt } from '../hooks/useAddTaskState';

interface AddTaskSyncSheetProps {
  prompt: AddTaskSyncPrompt | null;
  onClose: () => void;
  onConfirm: (apply: { visibility: boolean; priority: boolean }) => void;
}

const GOLD = '#D4B13A';

/**
 * Menú inferior que aparece al añadir tareas a un álbum cuando su prioridad o visibilidad
 * difieren de las del álbum. Permite elegir qué propiedades se igualan a las del álbum.
 */
export function AddTaskSyncSheet({ prompt, onClose, onConfirm }: AddTaskSyncSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [applyPriority, setApplyPriority] = useState(true);
  const [applyVisibility, setApplyVisibility] = useState(true);

  // Cada vez que se abre, ambas opciones vienen marcadas
  useEffect(() => {
    if (prompt) {
      setApplyPriority(true);
      setApplyVisibility(true);
    }
  }, [prompt]);

  if (!prompt) return null;

  const showPriority = prompt.priorityCount > 0;
  const showVisibility = prompt.visibilityCount > 0;

  const priorityLabel =
    prompt.albumPriority === 'urgent'
      ? t('common.urgent')
      : prompt.albumPriority === 'high'
        ? t('common.high')
        : prompt.albumPriority === 'low'
          ? t('common.low')
          : t('common.medium');
  const priorityColor =
    prompt.albumPriority === 'urgent'
      ? '#DC2626'
      : prompt.albumPriority === 'high'
        ? '#EF4444'
        : prompt.albumPriority === 'low'
          ? '#10B981'
          : GOLD;

  const visibilityLabel =
    prompt.albumVisibility === 'public'
      ? t('albums.visibility_public')
      : prompt.albumVisibility === 'followers'
        ? t('albums.visibility_followers')
        : t('albums.visibility_private');
  const VisibilityIcon =
    prompt.albumVisibility === 'public' ? Eye : prompt.albumVisibility === 'followers' ? Users : Lock;

  const countText = (count: number, kind: 'priority' | 'visibility') => {
    const one = count === 1;
    return t(`add_task.sync_${kind}_sub_${one ? 'one' : 'other'}`, { count });
  };

  const nothingSelected =
    (!showPriority || !applyPriority) && (!showVisibility || !applyVisibility);

  const renderRow = (
    checked: boolean,
    onToggle: () => void,
    icon: React.ReactNode,
    title: string,
    sub: string,
  ) => (
    <Pressable
      style={[localStyles.row, checked && localStyles.rowActive]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={localStyles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={localStyles.rowTitle}>{title}</Text>
        <Text style={localStyles.rowSub}>{sub}</Text>
      </View>
      <View style={[localStyles.checkbox, checked && localStyles.checkboxChecked]}>
        {checked && <Check size={14} color="#0D0D0D" strokeWidth={3} />}
      </View>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={localStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[localStyles.sheet, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
          <View style={localStyles.handle} />
          <Text style={localStyles.title}>{t('add_task.sync_title')}</Text>
          <Text style={localStyles.subtitle}>
            {t('add_task.sync_subtitle', { albumName: prompt.albumName })}
          </Text>

          <View style={{ gap: 10, marginTop: 16 }}>
            {showPriority &&
              renderRow(
                applyPriority,
                () => setApplyPriority((v) => !v),
                <Flag size={20} color={priorityColor} strokeWidth={2} />,
                t('add_task.sync_priority_title', { label: priorityLabel }),
                countText(prompt.priorityCount, 'priority'),
              )}
            {showVisibility &&
              renderRow(
                applyVisibility,
                () => setApplyVisibility((v) => !v),
                <VisibilityIcon size={20} color={GOLD} strokeWidth={2} />,
                t('add_task.sync_visibility_title', { label: visibilityLabel }),
                countText(prompt.visibilityCount, 'visibility'),
              )}
          </View>

          <Pressable
            style={localStyles.primaryBtn}
            onPress={() =>
              onConfirm({
                priority: showPriority && applyPriority,
                visibility: showVisibility && applyVisibility,
              })
            }
            accessibilityRole="button"
          >
            <Text style={localStyles.primaryBtnText}>
              {nothingSelected ? t('add_task.sync_keep') : t('add_task.sync_apply')}
            </Text>
          </Pressable>

          {!nothingSelected && (
            <Pressable
              style={localStyles.secondaryBtn}
              onPress={() => onConfirm({ priority: false, visibility: false })}
              accessibilityRole="button"
            >
              <Text style={localStyles.secondaryBtnText}>{t('add_task.sync_keep')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#262626',
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3A',
    marginBottom: 16,
  },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#F3EEE3' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#A0A0A0', marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#1A1A1A',
  },
  rowActive: { borderColor: '#6B5A22', backgroundColor: 'rgba(212,177,58,0.08)' },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#F3EEE3' },
  rowSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8F8F8F', marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: GOLD, borderColor: GOLD },
  primaryBtn: {
    height: 54,
    borderRadius: 999,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#0D0D0D' },
  secondaryBtn: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  secondaryBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#A0A0A0' },
});

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/add-task.styles';

interface AddTaskSegmentedControlProps {
  activeTab: 'user' | 'default';
  onChangeTab: (tab: 'user' | 'default') => void;
  userSelectedCount: number;
  defaultSelectedCount: number;
}

export function AddTaskSegmentedControl({
  activeTab,
  onChangeTab,
  userSelectedCount,
  defaultSelectedCount,
}: AddTaskSegmentedControlProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.segmentedControl}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'user' }}
        style={[styles.segmentBtn, activeTab === 'user' && styles.segmentBtnActive]}
        onPress={() => onChangeTab('user')}
      >
        <Text style={[styles.segmentText, activeTab === 'user' && styles.segmentTextActive]}>
          {t('add_task.tab_user', { defaultValue: 'Tus tareas' })}
        </Text>
        {userSelectedCount > 0 && (
          <View style={[styles.badge, activeTab === 'user' ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, activeTab === 'user' ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {userSelectedCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'default' }}
        style={[styles.segmentBtn, activeTab === 'default' && styles.segmentBtnActive]}
        onPress={() => onChangeTab('default')}
      >
        <Text style={[styles.segmentText, activeTab === 'default' && styles.segmentTextActive]}>
          {t('add_task.tab_default', { defaultValue: 'Por defecto' })}
        </Text>
        {defaultSelectedCount > 0 && (
          <View style={[styles.badge, activeTab === 'default' ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, activeTab === 'default' ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {defaultSelectedCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

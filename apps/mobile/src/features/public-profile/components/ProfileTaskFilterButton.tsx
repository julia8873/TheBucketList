import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlidersHorizontal, ChevronDown, Check, X } from 'lucide-react-native';
import { useTheme, fontFamily } from '@bucketlist/ui';

export type TaskFilter = 'all' | 'active' | 'completed';

interface ProfileTaskFilterButtonProps {
  filter: TaskFilter;
  onChangeFilter: (f: TaskFilter) => void;
}

export function ProfileTaskFilterButton({ filter, onChangeFilter }: ProfileTaskFilterButtonProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  const taskFilterOptions: Array<{ key: TaskFilter; label: string; description: string }> = useMemo(() => [
    { key: 'all', label: t('profile.filter_all'), description: t('profile.filter_tasks_all_desc') },
    { key: 'active', label: t('profile.filter_active'), description: t('profile.filter_tasks_active_desc') },
    { key: 'completed', label: t('profile.filter_completed'), description: t('profile.filter_tasks_completed_desc') },
  ], [t]);

  const activeOption =
    taskFilterOptions.find((o) => o.key === filter) || taskFilterOptions[0]!;

  return (
    <>
      <Pressable
        onPress={() => setModalVisible(true)}
        style={[
          styles.filterButton,
          {
            backgroundColor: theme.dark ? '#1B1B1B' : '#EAE5DB',
            borderColor:
              filter !== 'all'
                ? theme.colors.primary
                : theme.dark
                ? '#2B2B2B'
                : '#D9D3C7',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('profile.filter_tasks_btn_label', { label: activeOption.label })}
      >
        <SlidersHorizontal
          size={14}
          color={filter !== 'all' ? theme.colors.primary : theme.colors.foreground}
          strokeWidth={2}
        />
        <Text
          style={[
            styles.filterButtonText,
            {
              color: filter !== 'all' ? theme.colors.primary : theme.colors.foreground,
            },
          ]}
        >
          {activeOption.label}
        </Text>
        <ChevronDown
          size={14}
          color={
            filter !== 'all' ? theme.colors.primary : theme.colors.foregroundMuted
          }
          strokeWidth={2}
        />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setModalVisible(false)}
            accessibilityLabel={t('profile.filter_tasks_close_label')}
          />
          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: theme.dark ? '#161616' : '#FFFFFF',
                borderColor: theme.dark ? '#282828' : '#E5E0D5',
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            {/* Handle */}
            <View
              style={[
                styles.dragHandle,
                { backgroundColor: theme.dark ? '#3A3A3A' : '#D0C9BD' },
              ]}
            />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.colors.foreground }]}>
                {t('profile.filter_tasks_title')}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                hitSlop={8}
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.dark ? '#242424' : '#EFEAE1' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <X size={16} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {taskFilterOptions.map((option) => {
                const isSelected = option.key === filter;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      onChangeFilter(option.key);
                      setModalVisible(false);
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        backgroundColor: isSelected
                          ? theme.dark
                            ? 'rgba(212,175,55,0.08)'
                            : 'rgba(184,134,11,0.08)'
                          : pressed
                          ? theme.dark
                            ? '#202020'
                            : '#F5F0E6'
                          : 'transparent',
                        borderColor: isSelected
                          ? theme.dark
                            ? 'rgba(212,175,55,0.35)'
                            : 'rgba(184,134,11,0.35)'
                          : 'transparent',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={[
                          styles.optionLabel,
                          {
                            color: isSelected
                              ? theme.colors.primary
                              : theme.colors.foreground,
                            fontFamily: isSelected
                              ? fontFamily.bold
                              : fontFamily.medium,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionDescription,
                          { color: theme.colors.foregroundMuted },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                    {isSelected ? (
                      <View
                        style={[
                          styles.checkCircle,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Check
                          size={14}
                          color={theme.colors.primaryForeground}
                          strokeWidth={2.5}
                        />
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.unselectedCircle,
                          { borderColor: theme.dark ? '#333' : '#D5CFC3' },
                        ]}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = themedStyleSheet({
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  bottomSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionLabel: {
    fontSize: 15,
  },
  optionDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  unselectedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    marginLeft: 12,
  },
});

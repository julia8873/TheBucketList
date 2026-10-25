import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  SlidersHorizontal,
  X,
  Layers,
  GripVertical,
  Flag,
  ArrowDownAZ,
  Calendar,
  Check,
  ArrowDown,
  ArrowUp,
} from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/explore.styles';
import type { DailySortField, DailySortDirection } from '../types';

interface DailySortSheetProps {
  visible: boolean;
  onClose: () => void;
  sortField: DailySortField;
  sortDirection: DailySortDirection;
  groupByTag: boolean;
  onSelectSort: (field: DailySortField) => void;
  onToggleGroupByTag: () => void;
  onResetSort: () => void;
}

export const DailySortSheet: React.FC<DailySortSheetProps> = ({
  visible,
  onClose,
  sortField,
  sortDirection,
  groupByTag,
  onSelectSort,
  onToggleGroupByTag,
  onResetSort,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sortSheetCard, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={18} color={gold[400]} />
              <Text style={[styles.sheetTitle, { color: theme.colors.foreground }]}>{t('daily.sort_and_classify')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            {/* Section 1: Agrupar por etiquetas */}
            <View style={styles.sortSection}>
              <Text style={[styles.sortSectionTitle, { color: theme.colors.foregroundMuted }]}>{t('daily.classify_section')}</Text>
              <Pressable
                style={[
                  styles.sortOptionCard,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  groupByTag && {
                    backgroundColor: theme.dark ? '#262010' : '#FDF4DC',
                    borderColor: gold[400],
                  },
                ]}
                onPress={onToggleGroupByTag}
              >
                <View style={styles.sortOptionLeft}>
                  <View
                    style={[
                      styles.sortOptionIconBox,
                      { backgroundColor: theme.dark ? '#262626' : '#E8E3D8' },
                      groupByTag && styles.sortOptionIconBoxActive,
                    ]}
                  >
                    <Layers size={18} color={groupByTag ? '#0E0E0E' : gold[400]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, { color: theme.colors.foreground }, groupByTag && styles.sortOptionTitleActive]}>
                      {t('daily.classify_by_tags')}
                    </Text>
                    <Text style={[styles.sortOptionSubtitle, { color: theme.colors.foregroundMuted }]}>
                      {t('daily.classify_by_tags_desc')}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.sortTogglePill,
                    { backgroundColor: theme.dark ? '#262626' : '#E8E3D8' },
                    groupByTag && styles.sortTogglePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortTogglePillText,
                      { color: theme.colors.foregroundMuted },
                      groupByTag && styles.sortTogglePillTextActive,
                    ]}
                  >
                    {groupByTag ? t('daily.status_enabled') : t('daily.status_disabled')}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Section 2: Criterio de ordenación */}
            <View style={styles.sortSection}>
              <Text style={[styles.sortSectionTitle, { color: theme.colors.foregroundMuted }]}>{t('daily.sort_by_section')}</Text>

              {/* Manual / Arrastrar */}
              <Pressable
                style={[
                  styles.sortOptionCard,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  sortField === 'manual' && {
                    backgroundColor: theme.dark ? '#262010' : '#FDF4DC',
                    borderColor: gold[400],
                  },
                ]}
                onPress={() => onSelectSort('manual')}
              >
                <View style={styles.sortOptionLeft}>
                  <View
                    style={[
                      styles.sortOptionIconBox,
                      { backgroundColor: theme.dark ? '#262626' : '#E8E3D8' },
                      sortField === 'manual' && styles.sortOptionIconBoxActive,
                    ]}
                  >
                    <GripVertical size={18} color={sortField === 'manual' ? '#0E0E0E' : theme.colors.foregroundMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, { color: theme.colors.foreground }, sortField === 'manual' && styles.sortOptionTitleActive]}>
                      {t('daily.sort_manual')}
                    </Text>
                    <Text style={[styles.sortOptionSubtitle, { color: theme.colors.foregroundMuted }]}>
                      {t('daily.sort_manual_desc')}
                    </Text>
                  </View>
                </View>
                {sortField === 'manual' && (
                  <View style={styles.sortCheckCircle}>
                    <Check size={14} color="#0E0E0E" strokeWidth={3} />
                  </View>
                )}
              </Pressable>

              {/* Prioridad */}
              <Pressable
                style={[
                  styles.sortOptionCard,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  sortField === 'priority' && {
                    backgroundColor: theme.dark ? '#262010' : '#FDF4DC',
                    borderColor: gold[400],
                  },
                ]}
                onPress={() => onSelectSort('priority')}
              >
                <View style={styles.sortOptionLeft}>
                  <View
                    style={[
                      styles.sortOptionIconBox,
                      { backgroundColor: theme.dark ? '#262626' : '#E8E3D8' },
                      sortField === 'priority' && styles.sortOptionIconBoxActive,
                    ]}
                  >
                    <Flag size={18} color={sortField === 'priority' ? '#0E0E0E' : '#FF453A'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, { color: theme.colors.foreground }, sortField === 'priority' && styles.sortOptionTitleActive]}>
                      {t('daily.sort_priority')}
                    </Text>
                    <Text style={[styles.sortOptionSubtitle, { color: theme.colors.foregroundMuted }]}>
                      {sortField === 'priority'
                        ? sortDirection === 'desc'
                          ? t('daily.sort_priority_desc_urgent_first')
                          : t('daily.sort_priority_desc_low_first')
                        : t('daily.sort_priority_desc_general')}
                    </Text>
                  </View>
                </View>
                {sortField === 'priority' && (
                  <View style={styles.sortCheckCircle}>
                    {sortDirection === 'desc' ? (
                      <ArrowDown size={14} color="#0E0E0E" strokeWidth={2.8} />
                    ) : (
                      <ArrowUp size={14} color="#0E0E0E" strokeWidth={2.8} />
                    )}
                  </View>
                )}
              </Pressable>

              {/* Nombre */}
              <Pressable
                style={[
                  styles.sortOptionCard,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  sortField === 'name' && {
                    backgroundColor: theme.dark ? '#262010' : '#FDF4DC',
                    borderColor: gold[400],
                  },
                ]}
                onPress={() => onSelectSort('name')}
              >
                <View style={styles.sortOptionLeft}>
                  <View
                    style={[
                      styles.sortOptionIconBox,
                      { backgroundColor: theme.dark ? '#262626' : '#E8E3D8' },
                      sortField === 'name' && styles.sortOptionIconBoxActive,
                    ]}
                  >
                    <ArrowDownAZ size={18} color={sortField === 'name' ? '#0E0E0E' : '#3B82F6'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, { color: theme.colors.foreground }, sortField === 'name' && styles.sortOptionTitleActive]}>
                      {t('daily.sort_name')}
                    </Text>
                    <Text style={[styles.sortOptionSubtitle, { color: theme.colors.foregroundMuted }]}>
                      {sortField === 'name'
                        ? sortDirection === 'asc'
                          ? t('daily.sort_name_az')
                          : t('daily.sort_name_za')
                        : t('daily.sort_name_desc_general')}
                    </Text>
                  </View>
                </View>
                {sortField === 'name' && (
                  <View style={styles.sortCheckCircle}>
                    {sortDirection === 'asc' ? (
                      <ArrowUp size={14} color="#0E0E0E" strokeWidth={2.8} />
                    ) : (
                      <ArrowDown size={14} color="#0E0E0E" strokeWidth={2.8} />
                    )}
                  </View>
                )}
              </Pressable>

              {/* Fecha */}
              <Pressable
                style={[
                  styles.sortOptionCard,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                  sortField === 'date' && {
                    backgroundColor: theme.dark ? '#262010' : '#FDF4DC',
                    borderColor: gold[400],
                  },
                ]}
                onPress={() => onSelectSort('date')}
              >
                <View style={styles.sortOptionLeft}>
                  <View
                    style={[
                      styles.sortOptionIconBox,
                      { backgroundColor: theme.dark ? '#262626' : '#E8E3D8' },
                      sortField === 'date' && styles.sortOptionIconBoxActive,
                    ]}
                  >
                    <Calendar size={18} color={sortField === 'date' ? '#0E0E0E' : gold[400]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, { color: theme.colors.foreground }, sortField === 'date' && styles.sortOptionTitleActive]}>
                      {t('daily.sort_date')}
                    </Text>
                    <Text style={[styles.sortOptionSubtitle, { color: theme.colors.foregroundMuted }]}>
                      {sortField === 'date'
                        ? sortDirection === 'asc'
                          ? t('daily.sort_date_nearest')
                          : t('daily.sort_date_furthest')
                        : t('daily.sort_date_desc_general')}
                    </Text>
                  </View>
                </View>
                {sortField === 'date' && (
                  <View style={styles.sortCheckCircle}>
                    {sortDirection === 'asc' ? (
                      <ArrowUp size={14} color="#0E0E0E" strokeWidth={2.8} />
                    ) : (
                      <ArrowDown size={14} color="#0E0E0E" strokeWidth={2.8} />
                    )}
                  </View>
                )}
              </Pressable>
            </View>
          </ScrollView>

          {/* Footer: Restablecer + Aplicar */}
          <View style={[styles.sortSheetFooter, { borderTopColor: theme.colors.border }]}>
            <Pressable
              style={[
                styles.sortResetBtn,
                { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 },
              ]}
              onPress={onResetSort}
            >
              <Text style={[styles.sortResetBtnText, { color: theme.colors.foreground }]}>{t('daily.reset')}</Text>
            </Pressable>
            <Pressable
              style={styles.sortApplyBtn}
              onPress={onClose}
            >
              <Text style={styles.sortApplyBtnText}>{t('daily.apply')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};


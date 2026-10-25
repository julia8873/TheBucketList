import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import {
  Plus,
  Tag as TagIcon,
  X,
  ListTodo,
  CheckCircle2,
  Pin,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  SlidersHorizontal,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/utils/dateLocale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gold } from '@bucketlist/ui/src/tokens/colors';
import { PageTitle, useTheme, FilterChip } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/explore.styles';
import { DailyTag, DailySortField, DailySortDirection, TimeView, StatusFilter } from '../types';
import type { WeekBlockItem } from './DailyWeekView';
import { TagSheetShell } from '@/components/TagSheetShell';
import { useDailyTasksCustomizationStore } from '@/stores/dailyTasksCustomization.store';

export interface DailyTasksTopBarProps {
  timeView: TimeView;
  setTimeView: (v: TimeView) => void;
  style?: any;
}

/**
 * Barra superior con el título y las pestañas temporales (Hoy, Semana, Calendario, Todas).
 */
export function DailyTasksTopBar({ timeView, setTimeView, style }: DailyTasksTopBarProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [goldDaily, ...restDaily] = t('nav.daily', { defaultValue: 'Día a día' }).split(' ');

  return (
    <View style={[styles.header, style]}>
      <View style={styles.titleRow}>
        <PageTitle gold={goldDaily} rest={restDaily.join(' ')} />
      </View>

      {/* Time View Switcher: Hoy | Semana | Calendario | Todas */}
      <View style={[styles.segmentedContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Pressable
          style={[styles.segmentedTab, timeView === 'today' && [styles.segmentedTabActive, { backgroundColor: theme.dark ? '#242424' : '#E8E3D8', borderColor: theme.colors.border }]]}
          onPress={() => setTimeView('today')}
        >
          <Text
            style={[
              styles.segmentedTabText,
              { color: theme.colors.foregroundMuted },
              timeView === 'today' && [styles.segmentedTabTextActive, { color: theme.colors.foreground }],
            ]}
          >
            {t('daily.tab_today')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentedTab, timeView === 'week' && [styles.segmentedTabActive, { backgroundColor: theme.dark ? '#242424' : '#E8E3D8', borderColor: theme.colors.border }]]}
          onPress={() => setTimeView('week')}
        >
          <Text
            style={[
              styles.segmentedTabText,
              { color: theme.colors.foregroundMuted },
              timeView === 'week' && [styles.segmentedTabTextActive, { color: theme.colors.foreground }],
            ]}
          >
            {t('daily.tab_week')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentedTab, timeView === 'calendar' && [styles.segmentedTabActive, { backgroundColor: theme.dark ? '#242424' : '#E8E3D8', borderColor: theme.colors.border }]]}
          onPress={() => setTimeView('calendar')}
        >
          <Text
            style={[
              styles.segmentedTabText,
              { color: theme.colors.foregroundMuted },
              timeView === 'calendar' && [styles.segmentedTabTextActive, { color: theme.colors.foreground }],
            ]}
          >
            {t('daily.tab_calendar')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentedTab, timeView === 'all' && [styles.segmentedTabActive, { backgroundColor: theme.dark ? '#242424' : '#E8E3D8', borderColor: theme.colors.border }]]}
          onPress={() => setTimeView('all')}
        >
          <Text
            style={[
              styles.segmentedTabText,
              { color: theme.colors.foregroundMuted },
              timeView === 'all' && [styles.segmentedTabTextActive, { color: theme.colors.foreground }],
            ]}
          >
            {t('daily.tab_all')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export interface DailyQuickAddBarProps {
  newTitle: string;
  setNewTitle: (t: string) => void;
  handleQuickAddTask: () => void;
  inputRef: React.RefObject<TextInput>;
  containerStyle?: any;
}

/**
 * Barra de añadir tarea rápida para hoy.
 */
export function DailyQuickAddBar({
  newTitle,
  setNewTitle,
  handleQuickAddTask,
  inputRef,
  containerStyle,
}: DailyQuickAddBarProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[{ paddingHorizontal: 16, marginBottom: 2 }, containerStyle]}>
      <View style={[styles.inputCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 2 }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.foreground }]}
          placeholder={t('daily.quick_add_placeholder')}
          placeholderTextColor={theme.colors.foregroundMuted}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleQuickAddTask}
          returnKeyType="done"
        />

        <Pressable
          style={[styles.addBtn, !newTitle.trim() && styles.addBtnDisabled]}
          onPress={handleQuickAddTask}
          disabled={!newTitle.trim()}
          accessibilityLabel={t('daily.quick_add_placeholder')}
        >
          <Plus size={18} color="#0E0E0E" strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

export interface DailyTasksScrollControlsProps {
  timeView: TimeView;
  newTitle?: string;
  setNewTitle?: (t: string) => void;
  handleQuickAddTask?: () => void;
  inputRef?: React.RefObject<TextInput>;
  selectedTagFilters: string[];
  setSelectedTagFilters: React.Dispatch<React.SetStateAction<string[]>>;
  tagMap: Map<string, DailyTag>;
  onOpenTagFilterSheet: () => void;
  statusFilter: StatusFilter;
  setStatusFilter: (f: StatusFilter | ((prev: StatusFilter) => StatusFilter)) => void;
  onlyFavorites: boolean;
  setOnlyFavorites: React.Dispatch<React.SetStateAction<boolean>>;
  favoritesCount: number;
  priorityFilter: string;
  setPriorityFilter: React.Dispatch<React.SetStateAction<string>>;
  sortField: DailySortField;
  sortDirection: DailySortDirection;
  groupByTag: boolean;
  onOpenSortModal: () => void;
  onOpenCustomize?: () => void;
  displayedWeeks?: WeekBlockItem[];
  weeksToShow?: number;
  setWeeksToShow?: (n: number) => void;
  weekOffset?: number;
  setWeekOffset?: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Controles de filtrado y etiquetas que se mueven dentro del ScrollView.
 * En la vista Semana se muestra el selector de semana sobre los filtros de etiquetas.
 */
export function DailyTasksScrollControls({
  timeView,
  selectedTagFilters,
  setSelectedTagFilters,
  tagMap,
  onOpenTagFilterSheet,
  statusFilter,
  setStatusFilter,
  onlyFavorites,
  setOnlyFavorites,
  favoritesCount,
  priorityFilter,
  setPriorityFilter,
  sortField,
  sortDirection,
  groupByTag,
  onOpenSortModal,
  onOpenCustomize,
  displayedWeeks,
  weeksToShow = 1,
  setWeeksToShow,
  weekOffset = 0,
  setWeekOffset,
}: DailyTasksScrollControlsProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [prioritySheetVisible, setPrioritySheetVisible] = useState(false);

  const isStatusActive = statusFilter !== 'all' || onlyFavorites;
  const isPriorityActive = priorityFilter !== 'all';
  const hasActiveFilters = isStatusActive || isPriorityActive || selectedTagFilters.length > 0;
  const dateFnsLocale = getDateFnsLocale(i18n.language);
  const customization = useDailyTasksCustomizationStore((s) => s.customization);
  const isCustomized = Object.values(customization).some((val) => !val);

  const dailyStatusOptions: Array<{ key: 'all' | 'pending' | 'completed' | 'favorites'; label: string; desc: string }> = [
    { key: 'all', label: t('daily.filter_status_all'), desc: t('daily.filter_status_all_desc') },
    { key: 'pending', label: t('daily.filter_status_pending'), desc: t('daily.filter_status_pending_desc') },
    { key: 'completed', label: t('daily.filter_status_completed'), desc: t('daily.filter_status_completed_desc') },
    { key: 'favorites', label: t('daily.filter_status_favorites'), desc: t('daily.filter_status_favorites_desc') },
  ];

  const dailyPriorityOptions: Array<{ key: string; label: string; desc: string }> = [
    { key: 'all', label: t('daily.filter_priority_all'), desc: t('daily.filter_priority_all_desc') },
    { key: 'urgent', label: t('daily.filter_priority_urgent'), desc: t('daily.filter_priority_urgent_desc') },
    { key: 'high', label: t('daily.filter_priority_high'), desc: t('daily.filter_priority_high_desc') },
    { key: 'medium', label: t('daily.filter_priority_medium'), desc: t('daily.filter_priority_medium_desc') },
    { key: 'low', label: t('daily.filter_priority_low'), desc: t('daily.filter_priority_low_desc') },
  ];

  const dailyPriorityShortLabel: Record<string, string> = {
    all: t('daily.filter_priority'),
    urgent: `${t('daily.filter_priority')}: ${t('daily.filter_priority_urgent')}`,
    high: `${t('daily.filter_priority')}: ${t('daily.filter_priority_high')}`,
    medium: `${t('daily.filter_priority')}: ${t('daily.filter_priority_medium')}`,
    low: `${t('daily.filter_priority')}: ${t('daily.filter_priority_low')}`,
  };

  return (
    <View style={{ marginBottom: 6 }}>
      {/* Week Navigation Card: En vista Semana se sitúa aquí, justo encima del filtrado de etiquetas */}
      {timeView === 'week' && displayedWeeks && displayedWeeks.length > 0 && (
        <View style={[styles.weekNavigationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.weekNavRow}>
            <Pressable
              style={[
                styles.weekNavBtn,
                { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                weekOffset <= 0 && { opacity: 0.25 },
              ]}
              onPress={() => setWeekOffset?.((prev) => Math.max(0, prev - 1))}
              disabled={weekOffset <= 0}
              hitSlop={8}
              accessibilityLabel={t('calendar.prev_month')}
            >
              <ChevronLeft size={18} color={weekOffset <= 0 ? theme.colors.foregroundSubtle : theme.colors.foreground} />
            </Pressable>

            <View style={styles.weekNavCenter}>
              <Text style={[styles.weekNavTitle, { color: theme.colors.foreground }]}>
                {weeksToShow === 1
                  ? displayedWeeks[0]?.weekLabel
                  : `${t('daily.weeks_count', { count: weeksToShow })} (${format(displayedWeeks[0]?.monday || new Date(), 'd MMM', { locale: dateFnsLocale })} – ${format(displayedWeeks[displayedWeeks.length - 1]?.sunday || new Date(), 'd MMM', { locale: dateFnsLocale })})`}
              </Text>
              {weekOffset > 0 && (
                <Pressable
                  style={[
                    styles.weekNavTodayBadge,
                    {
                      backgroundColor: theme.dark ? '#262010' : '#FDF4DC',
                      borderColor: theme.dark ? '#4A3B10' : '#E8C56A',
                    },
                  ]}
                  onPress={() => setWeekOffset?.(0)}
                >
                  <Text style={styles.weekNavTodayText}>{t('daily.back_to_today')}</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              style={[
                styles.weekNavBtn,
                { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => setWeekOffset?.((prev) => prev + 1)}
              hitSlop={8}
              accessibilityLabel={t('calendar.next_month')}
            >
              <ChevronRight size={18} color={theme.colors.foreground} />
            </Pressable>
          </View>

          {/* Selector de número de semanas (1 sem | 2 sems | 3 sems | 4 sems) */}
          {setWeeksToShow && (
            <View style={styles.weekSpanSelector}>
              <Text style={[styles.weekSpanLabel, { color: theme.colors.foregroundMuted }]}>{t('daily.show_label')}</Text>
              {[1, 2, 3, 4].map((n) => (
                <Pressable
                  key={n}
                  style={[
                    styles.weekSpanPill,
                    { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
                    weeksToShow === n && {
                      backgroundColor: theme.dark ? '#2A2210' : '#FDF4DC',
                      borderColor: gold[400],
                    },
                  ]}
                  onPress={() => setWeeksToShow(n)}
                >
                  <Text
                    style={[
                      styles.weekSpanPillText,
                      { color: theme.colors.foregroundMuted },
                      weeksToShow === n && styles.weekSpanPillTextActive,
                    ]}
                  >
                    {n} {n === 1 ? t('daily.week_abbr') : t('daily.weeks_abbr')}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Quick Filters Bar agrupada y consistente */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.tagsFilterScroll,
          { paddingLeft: 16, paddingRight: 32, gap: 10 },
        ]}
        style={{ marginHorizontal: -16 }}
      >
        {/* Todas */}
        <FilterChip
          label={t('daily.filter_all')}
          active={statusFilter === 'all' && !onlyFavorites && priorityFilter === 'all'}
          onPress={() => {
            setStatusFilter('all');
            setOnlyFavorites(false);
            setPriorityFilter('all');
          }}
        />

        {/* Filtrar por estado */}
        <Pressable
          style={[
            styles.tagFilterPill,
            {
              backgroundColor: isStatusActive
                ? (theme.dark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.14)')
                : theme.colors.surface,
              borderColor: isStatusActive ? gold[400] : theme.colors.border,
            },
          ]}
          onPress={() => setStatusSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('daily.filter_status_title')}
        >
          <Text
            style={[
              styles.tagFilterText,
              { color: isStatusActive ? gold[400] : theme.colors.foregroundMuted },
            ]}
          >
            {onlyFavorites
              ? `${t('daily.filter_status')}: ${t('daily.filter_status_favorites')}${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`
              : statusFilter === 'pending'
              ? `${t('daily.filter_status')}: ${t('daily.filter_status_pending')}`
              : statusFilter === 'completed'
              ? `${t('daily.filter_status')}: ${t('daily.filter_status_completed')}`
              : t('daily.filter_status')}
          </Text>
          <ChevronDown size={14} color={isStatusActive ? gold[400] : theme.colors.foregroundMuted} />
        </Pressable>

        {/* Filtrar por prioridad */}
        <Pressable
          style={[
            styles.tagFilterPill,
            {
              backgroundColor: isPriorityActive
                ? (theme.dark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.14)')
                : theme.colors.surface,
              borderColor: isPriorityActive ? gold[400] : theme.colors.border,
            },
          ]}
          onPress={() => setPrioritySheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('daily.filter_priority_title')}
        >
          <Text
            style={[
              styles.tagFilterText,
              { color: isPriorityActive ? gold[400] : theme.colors.foregroundMuted },
            ]}
          >
            {dailyPriorityShortLabel[priorityFilter] || t('daily.filter_priority')}
          </Text>
          <ChevronDown size={14} color={isPriorityActive ? gold[400] : theme.colors.foregroundMuted} />
        </Pressable>

        {/* Botón Etiquetas */}
        <Pressable
          style={[
            styles.tagFilterPill,
            {
              backgroundColor: selectedTagFilters.length > 0
                ? (theme.dark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.14)')
                : theme.colors.surface,
              borderColor: selectedTagFilters.length > 0 ? gold[400] : theme.colors.border,
            },
          ]}
          onPress={onOpenTagFilterSheet}
          accessibilityRole="button"
          accessibilityLabel={t('daily.filter_tags_title')}
        >
          <TagIcon
            size={13}
            color={selectedTagFilters.length > 0 ? gold[400] : theme.colors.foregroundMuted}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.tagFilterText,
              { color: selectedTagFilters.length > 0 ? gold[400] : theme.colors.foregroundMuted },
            ]}
          >
            {selectedTagFilters.length > 0
              ? `${t('daily.filter_tags')} (${selectedTagFilters.length})`
              : t('daily.filter_tags')}
          </Text>
        </Pressable>

        {/* Etiquetas activas individuales seleccionadas con icono/emoji y nombre */}
        {selectedTagFilters.map((id) => {
          const tag = tagMap.get(id);
          if (!tag) return null;
          return (
            <Pressable
              key={tag.id}
              style={[
                styles.tagFilterPill,
                {
                  borderColor: tag.color ? `${tag.color}88` : (theme.dark ? '#4A3B12' : '#E8D298'),
                  backgroundColor: tag.color ? (theme.dark ? `${tag.color}22` : `${tag.color}15`) : (theme.dark ? '#2C2512' : '#FDF4DC'),
                },
              ]}
              onPress={() => {
                setSelectedTagFilters((prev) => prev.filter((tid) => tid !== tag.id));
              }}
              accessibilityLabel={`Quitar filtro ${tag.name}`}
            >
              {tag.emoji ? (
                <Text style={{ fontSize: 11 }}>{tag.emoji}</Text>
              ) : (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: tag.color || '#D4B13A',
                  }}
                />
              )}
              <Text style={[styles.tagFilterText, { color: tag.color || gold[400], fontWeight: '600' }]}>
                {tag.name}
              </Text>
              <X size={10} color={theme.colors.foregroundMuted} />
            </Pressable>
          );
        })}

        {/* Botón rápido para limpiar filtros activos */}
        {hasActiveFilters && (
          <Pressable
            style={[styles.clearFiltersPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => {
              setStatusFilter('all');
              setOnlyFavorites(false);
              setPriorityFilter('all');
              setSelectedTagFilters([]);
            }}
            accessibilityLabel={t('daily.clear_filters')}
          >
            <X size={11} color={theme.colors.foregroundMuted} />
            <Text style={[styles.clearFiltersPillText, { color: theme.colors.foregroundMuted }]}>{t('daily.clear_filters')}</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Sub-toolbar: Personalizar y Prioridad a la derecha */}
      <View style={[styles.toolbarRow, { justifyContent: 'flex-end', gap: 8 }]}>
        {/* Botón Personalizar */}
        {onOpenCustomize && (
          <Pressable
            onPress={onOpenCustomize}
            hitSlop={8}
            style={[
              styles.sortTriggerBtn,
              {
                height: 32,
                paddingHorizontal: 8,
                borderRadius: 8,
                backgroundColor: isCustomized
                  ? (theme.dark ? 'rgba(212, 175, 55, 0.12)' : 'rgba(212, 175, 55, 0.14)')
                  : theme.colors.surface,
                borderWidth: 1,
                borderColor: isCustomized ? gold[400] : theme.colors.border,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('daily.customize_view', 'Personalizar vista')}
          >
            <SlidersHorizontal size={14} color={gold[400]} />
          </Pressable>
        )}

        {/* Derecha: Botón Prioridad (abre opciones de ordenación y clasificación) */}
        <Pressable
          style={[
            styles.sortTriggerBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            (sortField !== 'manual' || groupByTag) && [styles.sortTriggerBtnActive, { backgroundColor: theme.dark ? '#262010' : '#FDF4DC' }],
          ]}
          onPress={onOpenSortModal}
          accessibilityLabel={t('daily.sort_and_classify')}
        >
          <ArrowUpDown
            size={12}
            color={sortField !== 'manual' || groupByTag ? gold[400] : theme.colors.foregroundMuted}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.sortTriggerText,
              { color: theme.colors.foregroundMuted },
              (sortField !== 'manual' || groupByTag) && styles.sortTriggerTextActive,
            ]}
          >
            {sortField === 'manual'
              ? (groupByTag ? t('daily.filter_tags') : t('daily.filter_priority'))
              : sortField === 'priority'
              ? `${t('daily.sort_priority')} ${sortDirection === 'desc' ? '↓' : '↑'}`
              : sortField === 'name'
              ? `${t('daily.sort_name')} ${sortDirection === 'asc' ? 'A-Z' : 'Z-A'}`
              : `${t('daily.sort_date')} ${sortDirection === 'asc' ? '↑' : '↓'}`}
          </Text>
          {(sortField !== 'manual' || groupByTag) && <View style={styles.sortActiveDot} />}
        </Pressable>
      </View>

      {/* Bottom Sheet: Filtrar por Estado */}
      <TagSheetShell visible={statusSheetVisible} onClose={() => setStatusSheetVisible(false)}>
        <View style={[dailySheetStyles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={dailySheetStyles.sheetHeader}>
            <Text style={[dailySheetStyles.sheetTitle, { color: theme.colors.foreground }]}>{t('daily.filter_status_title')}</Text>
            <Pressable
              onPress={() => setStatusSheetVisible(false)}
              hitSlop={8}
              style={[dailySheetStyles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={dailySheetStyles.sheetOptionList}>
            {dailyStatusOptions.map((opt) => {
              const isSelected =
                opt.key === 'favorites'
                  ? onlyFavorites
                  : !onlyFavorites && statusFilter === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    if (opt.key === 'favorites') {
                      setOnlyFavorites(true);
                      setStatusFilter('all');
                    } else {
                      setOnlyFavorites(false);
                      setStatusFilter(opt.key);
                    }
                    setStatusSheetVisible(false);
                  }}
                  style={({ pressed }) => [
                    dailySheetStyles.sheetOptionRow,
                    {
                      backgroundColor: isSelected
                        ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : 'rgba(212, 177, 58, 0.12)')
                        : theme.colors.surface,
                      borderColor: isSelected ? gold[400] : theme.colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('daily.filter_status')}: ${opt.label}`}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={[
                        dailySheetStyles.sheetOptionTitle,
                        { color: isSelected ? gold[400] : theme.colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[dailySheetStyles.sheetOptionDesc, { color: theme.colors.foregroundMuted }]}>{opt.desc}</Text>
                  </View>
                  {isSelected && <Check size={18} color={gold[400]} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </TagSheetShell>

      {/* Bottom Sheet: Filtrar por Prioridad */}
      <TagSheetShell visible={prioritySheetVisible} onClose={() => setPrioritySheetVisible(false)}>
        <View style={[dailySheetStyles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={dailySheetStyles.sheetHeader}>
            <Text style={[dailySheetStyles.sheetTitle, { color: theme.colors.foreground }]}>{t('daily.filter_priority_title')}</Text>
            <Pressable
              onPress={() => setPrioritySheetVisible(false)}
              hitSlop={8}
              style={[dailySheetStyles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={dailySheetStyles.sheetOptionList}>
            {dailyPriorityOptions.map((opt) => {
              const isSelected = priorityFilter === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setPriorityFilter(opt.key);
                    setPrioritySheetVisible(false);
                  }}
                  style={({ pressed }) => [
                    dailySheetStyles.sheetOptionRow,
                    {
                      backgroundColor: isSelected
                        ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : 'rgba(212, 177, 58, 0.12)')
                        : theme.colors.surface,
                      borderColor: isSelected ? gold[400] : theme.colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('daily.filter_priority')}: ${opt.label}`}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={[
                        dailySheetStyles.sheetOptionTitle,
                        { color: isSelected ? gold[400] : theme.colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={[dailySheetStyles.sheetOptionDesc, { color: theme.colors.foregroundMuted }]}>{opt.desc}</Text>
                  </View>
                  {isSelected && <Check size={18} color={gold[400]} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </TagSheetShell>
    </View>
  );
}

const dailySheetStyles = themedStyleSheet({
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Newsreader_700Bold',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionList: {
    gap: 8,
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sheetOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sheetOptionDesc: {
    fontSize: 12,
  },
});

export interface DailyTasksHeaderProps extends DailyTasksTopBarProps, DailyTasksScrollControlsProps {}

export function DailyTasksHeader(props: DailyTasksHeaderProps) {
  return (
    <>
      <DailyTasksTopBar timeView={props.timeView} setTimeView={props.setTimeView} />
      <DailyTasksScrollControls {...props} />
    </>
  );
}

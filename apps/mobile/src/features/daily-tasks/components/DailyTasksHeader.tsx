import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import {
  Plus,
  Tag as TagIcon,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Search,
  Clock,
  Flag,
  List as ListIcon,
  AlignJustify,
  Layers,
  Check,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/utils/dateLocale';

import { gold } from '@bucketlist/ui/src/tokens/colors';
import { PageTitle, useTheme, SegmentedControl } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/explore.styles';
import type { DailyTag, DailySortField, DailySortDirection, TimeView, StatusFilter } from '../types';
import type { WeekBlockItem } from './DailyWeekView';
import {
  IconBtn,
  SheetFrame,
  SheetGroup,
  SheetOption,
  SheetLabel,
} from '@/features/my-list/components/ListControls';
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
  const { t } = useTranslation();
  const [goldDaily, ...restDaily] = t('nav.daily', { defaultValue: 'Día a día' }).split(' ');

  return (
    <View style={style}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          <PageTitle gold={goldDaily} rest={restDaily.join(' ')} />
        </View>
      </View>

      {/* Time View Switcher: Hoy | Semana | Calendario | Todas */}
      <View style={styles.tabsContainer}>
        <SegmentedControl
          options={[
            { key: 'today', label: t('daily.tab_today', { defaultValue: 'Hoy' }) },
            { key: 'week', label: t('daily.tab_week', { defaultValue: 'Semana' }) },
            { key: 'calendar', label: t('daily.tab_calendar', { defaultValue: 'Calendario' }) },
            { key: 'all', label: t('daily.tab_all', { defaultValue: 'Todas' }) },
          ]}
          selected={timeView}
          onChange={(val) => setTimeView(val as TimeView)}
        />
      </View>
    </View>
  );
}

export interface DailyQuickAddBarProps {
  newTitle: string;
  setNewTitle: (t: string) => void;
  handleQuickAddTask: () => void;
  inputRef: React.RefObject<TextInput | null> | React.RefObject<TextInput>;
  containerStyle?: any;
  userTags?: DailyTag[];
  selectedTagId?: string | null;
  onSelectTagId?: (id: string | null) => void;
}

/**
 * Barra de añadir tarea rápida para hoy con bordes redondeados estilo buscador.
 */
export function DailyQuickAddBar({
  newTitle,
  setNewTitle,
  handleQuickAddTask,
  inputRef,
  containerStyle,
  userTags = [],
  selectedTagId,
  onSelectTagId,
}: DailyQuickAddBarProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const selectedTag = selectedTagId ? userTags.find((tg) => tg.id === selectedTagId) : null;

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.exploreSearchContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 6,
          },
        ]}
      >
        <TextInput
          ref={inputRef as any}
          style={[styles.exploreSearchInput, { color: theme.colors.foreground, flex: 1 }]}
          placeholder={t('daily.quick_add_placeholder', { defaultValue: '¿Qué quieres hacer hoy?' })}
          placeholderTextColor={theme.colors.foregroundMuted}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleQuickAddTask}
          returnKeyType="done"
        />

        {/* Tag chip if tag selected or available */}
        {selectedTag ? (
          <Pressable
            onPress={() => onSelectTagId?.(null)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              marginRight: 6,
              backgroundColor: selectedTag.color
                ? `${selectedTag.color}22`
                : (theme.dark ? '#222' : '#E8E8E8'),
              borderWidth: 1,
              borderColor: selectedTag.color ? `${selectedTag.color}66` : theme.colors.border,
            }}
          >
            {selectedTag.emoji ? <Text style={{ fontSize: 11 }}>{selectedTag.emoji}</Text> : null}
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Inter_600SemiBold',
                color: selectedTag.color || theme.colors.foreground,
                maxWidth: 70,
              }}
              numberOfLines={1}
            >
              {selectedTag.name}
            </Text>
            <X size={11} color={theme.colors.foregroundMuted} />
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.addBtn, !newTitle.trim() && styles.addBtnDisabled]}
          onPress={handleQuickAddTask}
          disabled={!newTitle.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('daily.quick_add_placeholder', { defaultValue: 'Añadir tarea' })}
        >
          <Plus size={16} color="#0E0E0E" strokeWidth={2.4} />
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
  onToggleGroupByTag?: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  viewMode?: 'detailed' | 'compact' | 'grouped';
  setViewMode?: (m: 'detailed' | 'compact' | 'grouped') => void;
  displayedWeeks?: WeekBlockItem[];
  weeksToShow?: number;
  setWeeksToShow?: (n: number) => void;
  weekOffset?: number;
  setWeekOffset?: React.Dispatch<React.SetStateAction<number>>;
  tasksCount?: number;
}

/**
 * Controles de filtrado y toolbar unificada que coinciden con el diseño de Mi Lista.
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
  groupByTag,
  onOpenSortModal,
  onOpenCustomize,
  onToggleGroupByTag,
  searchQuery = '',
  setSearchQuery,
  viewMode = groupByTag ? 'grouped' : 'detailed',
  setViewMode,
  displayedWeeks,
  weeksToShow = 1,
  setWeeksToShow,
  weekOffset = 0,
  setWeekOffset,
  tasksCount,
}: DailyTasksScrollControlsProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [prioritySheetVisible, setPrioritySheetVisible] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isStatusActive = statusFilter !== 'all' || onlyFavorites;
  const isPriorityActive = priorityFilter !== 'all';
  const hasActiveFilters = isStatusActive || isPriorityActive || selectedTagFilters.length > 0;
  const isSortActive = sortField !== 'manual' || groupByTag;
  const isSearching = searchOpen || !!searchQuery.trim();

  const dateFnsLocale = getDateFnsLocale(i18n.language);
  const customization = useDailyTasksCustomizationStore((s) => s.customization);
  const isCustomized = Object.values(customization).some((val) => !val);

  const dailyStatusOptions: Array<{ key: 'all' | 'pending' | 'completed' | 'favorites'; label: string }> = [
    { key: 'all', label: t('daily.filter_status_all', { defaultValue: 'Todas' }) },
    { key: 'pending', label: t('daily.filter_status_pending', { defaultValue: 'Pendientes' }) },
    { key: 'completed', label: t('daily.filter_status_completed', { defaultValue: 'Completadas' }) },
    { key: 'favorites', label: t('daily.filter_status_favorites', { defaultValue: 'Favoritas' }) },
  ];

  const dailyPriorityOptions: Array<{ key: string; label: string }> = [
    { key: 'all', label: t('daily.filter_priority_all', { defaultValue: 'Todas las prioridades' }) },
    { key: 'urgent', label: t('daily.filter_priority_urgent', { defaultValue: 'Urgente' }) },
    { key: 'high', label: t('daily.filter_priority_high', { defaultValue: 'Alta' }) },
    { key: 'medium', label: t('daily.filter_priority_medium', { defaultValue: 'Media' }) },
    { key: 'low', label: t('daily.filter_priority_low', { defaultValue: 'Baja' }) },
  ];

  const currentView: 'detailed' | 'compact' | 'grouped' = groupByTag
    ? 'grouped'
    : (viewMode || 'detailed');

  const handleSelectViewMode = (key: 'detailed' | 'compact' | 'grouped') => {
    if (setViewMode) {
      setViewMode(key);
    }
    if (key === 'grouped' && !groupByTag && onToggleGroupByTag) {
      onToggleGroupByTag();
    } else if (key !== 'grouped' && groupByTag && onToggleGroupByTag) {
      onToggleGroupByTag();
    }
  };

  const getCountText = () => {
    const num = typeof tasksCount === 'number' ? tasksCount : 0;
    if (timeView === 'today') {
      return num === 1 ? '1 TAREA HOY' : `${num} TAREAS HOY`;
    } else if (timeView === 'week') {
      return num === 1 ? '1 TAREA EN SEMANA' : `${num} TAREAS EN SEMANA`;
    } else if (timeView === 'calendar') {
      return num === 1 ? '1 TAREA EN CALENDARIO' : `${num} TAREAS EN CALENDARIO`;
    }
    return num === 1 ? '1 TAREA' : `${num} TAREAS`;
  };

  return (
    <View style={{ marginBottom: 6 }}>
      {/* Week Navigation Card: En vista Semana */}
      {timeView === 'week' && displayedWeeks && displayedWeeks.length > 0 && (
        <View style={[styles.weekNavigationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 12 }]}>
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
              accessibilityLabel={t('calendar.prev_month', { defaultValue: 'Semana anterior' })}
            >
              <ChevronLeft size={18} color={weekOffset <= 0 ? theme.colors.foregroundSubtle : theme.colors.foreground} />
            </Pressable>

            <View style={styles.weekNavCenter}>
              <Text style={[styles.weekNavTitle, { color: theme.colors.foreground }]}>
                {weeksToShow === 1
                  ? displayedWeeks[0]?.weekLabel
                  : `${t('daily.weeks_count', { count: weeksToShow, defaultValue: `${weeksToShow} semanas` })} (${format(displayedWeeks[0]?.monday || new Date(), 'd MMM', { locale: dateFnsLocale })} – ${format(displayedWeeks[displayedWeeks.length - 1]?.sunday || new Date(), 'd MMM', { locale: dateFnsLocale })})`}
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
                  <Text style={styles.weekNavTodayText}>{t('daily.back_to_today', { defaultValue: 'Volver a hoy' })}</Text>
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
              accessibilityLabel={t('calendar.next_month', { defaultValue: 'Semana siguiente' })}
            >
              <ChevronRight size={18} color={theme.colors.foreground} />
            </Pressable>
          </View>

          {/* Selector de número de semanas (1 sem | 2 sems | 3 sems | 4 sems) */}
          {setWeeksToShow && (
            <View style={styles.weekSpanSelector}>
              <Text style={[styles.weekSpanLabel, { color: theme.colors.foregroundMuted }]}>{t('daily.show_label', { defaultValue: 'Ver:' })}</Text>
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
                    {n} {n === 1 ? t('daily.week_abbr', { defaultValue: 'sem' }) : t('daily.weeks_abbr', { defaultValue: 'sems' })}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ──────────────── Toolbar idéntica a Mi lista y al Mockup ──────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: 10,
        }}
      >
        {/* Lado izquierdo: Selector de modo de vista [ ≡  ☰  ▦ ] */}
        <View
          style={{
            flexDirection: 'row',
            padding: 2,
            borderRadius: 14,
            backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.dark ? '#2A2A2A' : theme.colors.border,
            height: 30,
            alignItems: 'center',
          }}
        >
          {/* 1. Detallada */}
          <Pressable
            onPress={() => handleSelectViewMode('detailed')}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t('daily.view_detailed', { defaultValue: 'Vista detallada' })}
            style={{
              width: 26,
              height: 24,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: currentView === 'detailed' ? theme.colors.primary : 'transparent',
            }}
          >
            <ListIcon
              size={14}
              color={currentView === 'detailed' ? theme.colors.primaryForeground : theme.colors.foregroundMuted}
            />
          </Pressable>

          {/* 2. Compacta */}
          <Pressable
            onPress={() => handleSelectViewMode('compact')}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t('daily.view_compact', { defaultValue: 'Vista compacta' })}
            style={{
              width: 26,
              height: 24,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: currentView === 'compact' ? theme.colors.primary : 'transparent',
            }}
          >
            <AlignJustify
              size={14}
              color={currentView === 'compact' ? theme.colors.primaryForeground : theme.colors.foregroundMuted}
            />
          </Pressable>

          {/* 3. Agrupada por etiquetas */}
          <Pressable
            onPress={() => handleSelectViewMode('grouped')}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t('daily.view_grouped', { defaultValue: 'Agrupar por etiquetas' })}
            style={{
              width: 26,
              height: 24,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: currentView === 'grouped' ? theme.colors.primary : 'transparent',
            }}
          >
            <Layers
              size={14}
              color={currentView === 'grouped' ? theme.colors.primaryForeground : theme.colors.foregroundMuted}
            />
          </Pressable>
        </View>

        {/* Lado derecho: Botones icono (30x30 rounded 10) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* 1. Búsqueda */}
          <IconBtn
            theme={theme}
            active={isSearching}
            onPress={() => {
              if (searchOpen && searchQuery && setSearchQuery) {
                setSearchQuery('');
              }
              setSearchOpen(!searchOpen);
            }}
            label={t('common.search', { defaultValue: 'Buscar' })}
          >
            <Search size={14} color={isSearching ? theme.colors.primaryForeground : theme.colors.primary} />
          </IconBtn>

          {/* 2. Filtrar por estado / tiempo */}
          <IconBtn
            theme={theme}
            active={isStatusActive}
            badge={isStatusActive ? 1 : 0}
            onPress={() => setStatusSheetVisible(true)}
            label={t('daily.filter_status_title', { defaultValue: 'Filtrar por estado' })}
          >
            <Clock size={14} color={isStatusActive ? theme.colors.primaryForeground : theme.colors.primary} />
          </IconBtn>

          {/* 3. Filtrar por prioridad */}
          <IconBtn
            theme={theme}
            active={isPriorityActive}
            badge={isPriorityActive ? 1 : 0}
            onPress={() => setPrioritySheetVisible(true)}
            label={t('daily.filter_priority_title', { defaultValue: 'Filtrar por prioridad' })}
          >
            <Flag size={14} color={isPriorityActive ? theme.colors.primaryForeground : theme.colors.primary} />
          </IconBtn>

          {/* 4. Filtrar por etiquetas */}
          <IconBtn
            theme={theme}
            active={selectedTagFilters.length > 0}
            badge={selectedTagFilters.length}
            onPress={onOpenTagFilterSheet}
            label={t('daily.filter_tags_title', { defaultValue: 'Etiquetas' })}
          >
            <TagIcon size={14} color={selectedTagFilters.length > 0 ? theme.colors.primaryForeground : theme.colors.primary} />
          </IconBtn>

          {/* 5. Personalizar vista */}
          {onOpenCustomize && (
            <IconBtn
              theme={theme}
              active={isCustomized}
              onPress={onOpenCustomize}
              label={t('daily.customize_view', { defaultValue: 'Personalizar vista' })}
            >
              <SlidersHorizontal size={14} color={isCustomized ? theme.colors.primaryForeground : theme.colors.primary} />
            </IconBtn>
          )}

          {/* 6. Ordenar y clasificar */}
          <IconBtn
            theme={theme}
            active={isSortActive}
            onPress={onOpenSortModal}
            label={t('daily.sort_and_classify', { defaultValue: 'Ordenar' })}
          >
            <ArrowUpDown size={14} color={isSortActive ? theme.colors.primaryForeground : theme.colors.primary} />
          </IconBtn>
        </View>
      </View>

      {/* Barra de búsqueda si está abierta */}
      {searchOpen && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 38,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: theme.dark ? '#181818' : theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.dark ? '#2E2E2E' : theme.colors.border,
            marginBottom: 10,
          }}
        >
          <Search size={14} color={theme.colors.foregroundMuted} style={{ marginRight: 8 }} />
          <TextInput
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('common.search_placeholder', { defaultValue: 'Buscar en tareas...' })}
            placeholderTextColor={theme.colors.foregroundMuted}
            style={{
              flex: 1,
              color: theme.colors.foreground,
              fontSize: 13,
              fontFamily: 'Inter_400Regular',
              padding: 0,
            }}
          />
          {!!searchQuery && (
            <Pressable onPress={() => setSearchQuery?.('')} hitSlop={6}>
              <X size={14} color={theme.colors.foregroundMuted} />
            </Pressable>
          )}
        </View>
      )}

      {/* Chips de filtros activos (descartables con ✕) */}
      {hasActiveFilters && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {isStatusActive && (
            <Pressable
              onPress={() => {
                setStatusFilter('all');
                setOnlyFavorites(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                height: 26,
                paddingHorizontal: 9,
                borderRadius: 13,
                backgroundColor: theme.colors.primary,
              }}
            >
              <Text style={{ color: theme.colors.primaryForeground, fontSize: 11, fontFamily: 'Inter_700Bold' }}>
                {onlyFavorites
                  ? `${t('daily.filter_status_favorites', { defaultValue: 'Favoritas' })}${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`
                  : statusFilter === 'pending'
                  ? t('daily.filter_status_pending', { defaultValue: 'Pendientes' })
                  : t('daily.filter_status_completed', { defaultValue: 'Completadas' })}
              </Text>
              <X size={12} color={theme.colors.primaryForeground} strokeWidth={2.5} />
            </Pressable>
          )}

          {isPriorityActive && (
            <Pressable
              onPress={() => setPriorityFilter('all')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                height: 26,
                paddingHorizontal: 9,
                borderRadius: 13,
                backgroundColor: theme.colors.primary,
              }}
            >
              <Text style={{ color: theme.colors.primaryForeground, fontSize: 11, fontFamily: 'Inter_700Bold' }}>
                {priorityFilter === 'urgent'
                  ? t('daily.filter_priority_urgent', { defaultValue: 'Urgente' })
                  : priorityFilter === 'high'
                  ? t('daily.filter_priority_high', { defaultValue: 'Alta' })
                  : priorityFilter === 'medium'
                  ? t('daily.filter_priority_medium', { defaultValue: 'Media' })
                  : t('daily.filter_priority_low', { defaultValue: 'Baja' })}
              </Text>
              <X size={12} color={theme.colors.primaryForeground} strokeWidth={2.5} />
            </Pressable>
          )}

          {selectedTagFilters.map((id) => {
            const tag = tagMap.get(id);
            if (!tag) return null;
            return (
              <Pressable
                key={tag.id}
                onPress={() => setSelectedTagFilters((prev) => prev.filter((tid) => tid !== tag.id))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  height: 26,
                  paddingHorizontal: 9,
                  borderRadius: 13,
                  backgroundColor: tag.color ? `${tag.color}22` : (theme.dark ? '#222' : '#EAE6DC'),
                  borderWidth: 1,
                  borderColor: tag.color ? `${tag.color}66` : theme.colors.border,
                }}
              >
                {tag.emoji ? <Text style={{ fontSize: 11 }}>{tag.emoji}</Text> : (
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tag.color || gold[400] }} />
                )}
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontSize: 11,
                    fontFamily: 'Inter_600SemiBold',
                    maxWidth: 100,
                  }}
                  numberOfLines={1}
                >
                  {tag.name}
                </Text>
                <X size={12} color={theme.colors.foregroundMuted} strokeWidth={2.5} />
              </Pressable>
            );
          })}

          <Pressable
            onPress={() => {
              setStatusFilter('all');
              setOnlyFavorites(false);
              setPriorityFilter('all');
              setSelectedTagFilters([]);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              height: 26,
              paddingHorizontal: 8,
              borderRadius: 13,
              backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.dark ? '#2A2A2A' : theme.colors.border,
            }}
          >
            <X size={12} color={theme.colors.foregroundMuted} />
            <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11, fontFamily: 'Inter_500Medium' }}>
              {t('daily.clear_filters', { defaultValue: 'Limpiar' })}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Contador de tareas: exactamente como en el screenshot */}
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          letterSpacing: 0.9,
          textTransform: 'uppercase',
          color: theme.colors.foregroundMuted,
          marginBottom: 10,
        }}
      >
        {getCountText()}
      </Text>

      {/* ──────────────── Menú desde abajo: Filtrar por Estado ──────────────── */}
      <SheetFrame
        visible={statusSheetVisible}
        onClose={() => setStatusSheetVisible(false)}
        theme={theme}
        title={t('daily.filter_status_title', { defaultValue: 'Filtrar por estado' })}
        footerLabel={t('common.done', { defaultValue: 'Listo' })}
      >
        <View>
          <SheetLabel theme={theme}>
            {t('daily.filter_status_title', { defaultValue: 'Estado' })}
          </SheetLabel>
          <SheetGroup theme={theme}>
            {dailyStatusOptions.map((opt) => {
              const isSelected =
                opt.key === 'favorites'
                  ? onlyFavorites
                  : !onlyFavorites && statusFilter === opt.key;

              return (
                <SheetOption
                  key={opt.key}
                  theme={theme}
                  label={opt.label}
                  selected={isSelected}
                  right={isSelected ? <Check size={16} color={theme.colors.primary} strokeWidth={2.5} /> : null}
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
                />
              );
            })}
          </SheetGroup>
        </View>
      </SheetFrame>

      {/* ──────────────── Menú desde abajo: Filtrar por Prioridad ──────────────── */}
      <SheetFrame
        visible={prioritySheetVisible}
        onClose={() => setPrioritySheetVisible(false)}
        theme={theme}
        title={t('daily.filter_priority_title', { defaultValue: 'Filtrar por prioridad' })}
        footerLabel={t('common.done', { defaultValue: 'Listo' })}
      >
        <View>
          <SheetLabel theme={theme}>
            {t('daily.filter_priority_title', { defaultValue: 'Prioridad' })}
          </SheetLabel>
          <SheetGroup theme={theme}>
            {dailyPriorityOptions.map((opt) => {
              const isSelected = priorityFilter === opt.key;

              return (
                <SheetOption
                  key={opt.key}
                  theme={theme}
                  label={opt.label}
                  selected={isSelected}
                  right={isSelected ? <Check size={16} color={theme.colors.primary} strokeWidth={2.5} /> : null}
                  onPress={() => {
                    setPriorityFilter(opt.key);
                    setPrioritySheetVisible(false);
                  }}
                />
              );
            })}
          </SheetGroup>
        </View>
      </SheetFrame>
    </View>
  );
}

export interface DailyTasksHeaderProps extends DailyTasksTopBarProps, DailyTasksScrollControlsProps { }

export function DailyTasksHeader(props: DailyTasksHeaderProps) {
  return (
    <>
      <DailyTasksTopBar timeView={props.timeView} setTimeView={props.setTimeView} />
      <DailyTasksScrollControls {...props} />
    </>
  );
}

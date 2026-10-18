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
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gold } from '@bucketlist/ui/src/tokens/colors';
import { PageTitle, useTheme, FilterChip } from '@bucketlist/ui';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles/explore.styles';
import { DailyTag, DailySortField, DailySortDirection, TimeView, StatusFilter } from '../types';
import type { WeekBlockItem } from './DailyWeekView';
import { TagSheetShell } from '@/components/TagSheetShell';

const DAILY_STATUS_OPTIONS: Array<{ key: 'all' | 'pending' | 'completed' | 'favorites'; label: string; desc: string }> = [
  { key: 'all', label: 'Todas las tareas', desc: 'Muestra todas las tareas sin filtrar por estado' },
  { key: 'pending', label: 'Pendientes', desc: 'Tareas activas o pendientes de realizar' },
  { key: 'completed', label: 'Completadas', desc: 'Tareas que ya has marcado como completadas' },
  { key: 'favorites', label: 'Fijadas', desc: 'Tareas destacadas o ancladas arriba' },
];

const DAILY_PRIORITY_OPTIONS: Array<{ key: string; label: string; desc: string }> = [
  { key: 'all', label: 'Todas las prioridades', desc: 'Muestra tareas de cualquier prioridad' },
  { key: 'urgent', label: '🚨 Urgente', desc: 'Tareas críticas que requieren atención inmediata' },
  { key: 'high', label: '🔴 Alta', desc: 'Tareas prioritarias o de gran importancia' },
  { key: 'medium', label: '🟡 Media', desc: 'Tareas de prioridad habitual' },
  { key: 'low', label: '🟢 Baja', desc: 'Tareas secundarias sin urgencia' },
];

const DAILY_PRIORITY_SHORT_LABEL: Record<string, string> = {
  all: 'Filtrar por prioridad',
  urgent: 'Prioridad: 🚨 Urgente',
  high: 'Prioridad: 🔴 Alta',
  medium: 'Prioridad: 🟡 Media',
  low: 'Prioridad: 🟢 Baja',
};

export interface DailyTasksTopBarProps {
  timeView: TimeView;
  setTimeView: (v: TimeView) => void;
}

/**
 * Barra superior fija con el título y las pestañas temporales (Hoy, Semana, Calendario, Todas).
 * Se eliminó el subtítulo para que todo esté más arriba y compacto.
 */
export function DailyTasksTopBar({ timeView, setTimeView }: DailyTasksTopBarProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [goldDaily, ...restDaily] = t('nav.daily', { defaultValue: 'Día a día' }).split(' ');

  return (
    <View style={styles.header}>
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
            Hoy
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
            Semana
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
            Calendario
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
            Todas
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
}

/**
 * Barra fija de añadir tarea rápida situada fuera del ScrollView para que no se
 * desplace ni suba hacia arriba al abrir el teclado en móvil.
 */
export function DailyQuickAddBar({
  newTitle,
  setNewTitle,
  handleQuickAddTask,
  inputRef,
}: DailyQuickAddBarProps) {
  const { theme } = useTheme();

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 2 }}>
      <View style={[styles.inputCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 2 }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.foreground }]}
          placeholder="Añadir tarea rápida para hoy..."
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
          accessibilityLabel="Añadir tarea rápida"
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
  displayedWeeks,
  weeksToShow = 1,
  setWeeksToShow,
  weekOffset = 0,
  setWeekOffset,
}: DailyTasksScrollControlsProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [prioritySheetVisible, setPrioritySheetVisible] = useState(false);

  const isStatusActive = statusFilter !== 'all' || onlyFavorites;
  const isPriorityActive = priorityFilter !== 'all';
  const hasActiveFilters = isStatusActive || isPriorityActive || selectedTagFilters.length > 0;

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
              accessibilityLabel="Semana anterior"
            >
              <ChevronLeft size={18} color={weekOffset <= 0 ? theme.colors.foregroundSubtle : theme.colors.foreground} />
            </Pressable>

            <View style={styles.weekNavCenter}>
              <Text style={[styles.weekNavTitle, { color: theme.colors.foreground }]}>
                {weeksToShow === 1
                  ? displayedWeeks[0]?.weekLabel
                  : `${weeksToShow} semanas (${format(displayedWeeks[0]?.monday || new Date(), 'd MMM', { locale: es })} – ${format(displayedWeeks[displayedWeeks.length - 1]?.sunday || new Date(), 'd MMM', { locale: es })})`}
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
                  <Text style={styles.weekNavTodayText}>Volver a hoy</Text>
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
              accessibilityLabel="Semana siguiente"
            >
              <ChevronRight size={18} color={theme.colors.foreground} />
            </Pressable>
          </View>

          {/* Selector de número de semanas (1 sem | 2 sems | 3 sems | 4 sems) */}
          {setWeeksToShow && (
            <View style={styles.weekSpanSelector}>
              <Text style={[styles.weekSpanLabel, { color: theme.colors.foregroundMuted }]}>Mostrar:</Text>
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
                    {n} {n === 1 ? 'sem' : 'sems'}
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
          { paddingLeft: 16, paddingRight: 32, gap: 8 },
        ]}
        style={{ marginHorizontal: -16 }}
      >
        {/* Todas */}
        <FilterChip
          label="Todas"
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
          accessibilityLabel="Filtrar por estado"
        >
          <Text
            style={[
              styles.tagFilterText,
              { color: isStatusActive ? gold[400] : theme.colors.foregroundMuted },
            ]}
          >
            {onlyFavorites
              ? `Estado: Fijadas${favoritesCount > 0 ? ` (${favoritesCount})` : ''}`
              : statusFilter === 'pending'
              ? 'Estado: Pendientes'
              : statusFilter === 'completed'
              ? 'Estado: Completadas'
              : 'Filtrar por estado'}
          </Text>
          <ChevronDown size={14} color={isStatusActive ? gold[400] : theme.colors.foregroundMuted} />
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
          accessibilityLabel="Gestionar y filtrar etiquetas"
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
              ? `Etiquetas (${selectedTagFilters.length})`
              : 'Etiquetas'}
          </Text>
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
          accessibilityLabel="Filtrar por prioridad"
        >
          <Text
            style={[
              styles.tagFilterText,
              { color: isPriorityActive ? gold[400] : theme.colors.foregroundMuted },
            ]}
          >
            {DAILY_PRIORITY_SHORT_LABEL[priorityFilter] || 'Filtrar por prioridad'}
          </Text>
          <ChevronDown size={14} color={isPriorityActive ? gold[400] : theme.colors.foregroundMuted} />
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
            accessibilityLabel="Restablecer filtros"
          >
            <X size={11} color={theme.colors.foregroundMuted} />
            <Text style={[styles.clearFiltersPillText, { color: theme.colors.foregroundMuted }]}>Limpiar</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Sub-toolbar: 'Prioridad' a la derecha */}
      <View style={[styles.toolbarRow, { justifyContent: 'flex-end' }]}>
        {/* Derecha: Botón Prioridad (abre opciones de ordenación y clasificación) */}
        <Pressable
          style={[
            styles.sortTriggerBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            (sortField !== 'manual' || groupByTag) && [styles.sortTriggerBtnActive, { backgroundColor: theme.dark ? '#262010' : '#FDF4DC' }],
          ]}
          onPress={onOpenSortModal}
          accessibilityLabel="Ordenar por prioridad y opciones"
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
              ? (groupByTag ? 'Etiquetas' : 'Prioridad')
              : sortField === 'priority'
              ? `Prioridad ${sortDirection === 'desc' ? '↓' : '↑'}`
              : sortField === 'name'
              ? `Nombre ${sortDirection === 'asc' ? 'A-Z' : 'Z-A'}`
              : `Fecha ${sortDirection === 'asc' ? '↑' : '↓'}`}
          </Text>
          {(sortField !== 'manual' || groupByTag) && <View style={styles.sortActiveDot} />}
        </Pressable>
      </View>

      {/* Bottom Sheet: Filtrar por Estado */}
      <TagSheetShell visible={statusSheetVisible} onClose={() => setStatusSheetVisible(false)}>
        <View style={[dailySheetStyles.sheetContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={dailySheetStyles.sheetHeader}>
            <Text style={[dailySheetStyles.sheetTitle, { color: theme.colors.foreground }]}>Filtrar por estado</Text>
            <Pressable
              onPress={() => setStatusSheetVisible(false)}
              hitSlop={8}
              style={[dailySheetStyles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtro de estado"
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={dailySheetStyles.sheetOptionList}>
            {DAILY_STATUS_OPTIONS.map((opt) => {
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
                  accessibilityLabel={`Filtrar por ${opt.label}`}
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
            <Text style={[dailySheetStyles.sheetTitle, { color: theme.colors.foreground }]}>Filtrar por prioridad</Text>
            <Pressable
              onPress={() => setPrioritySheetVisible(false)}
              hitSlop={8}
              style={[dailySheetStyles.sheetCloseBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtro de prioridad"
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <View style={dailySheetStyles.sheetOptionList}>
            {DAILY_PRIORITY_OPTIONS.map((opt) => {
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
                  accessibilityLabel={`Filtrar por prioridad ${opt.label}`}
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

const dailySheetStyles = StyleSheet.create({
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

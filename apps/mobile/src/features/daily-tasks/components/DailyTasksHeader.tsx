import React from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import {
  Plus,
  Tag as TagIcon,
  X,
  ListTodo,
  CheckCircle2,
  Star,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { gold } from '@bucketlist/ui/src/tokens/colors';
import { PageTitle, useTheme } from '@bucketlist/ui';
import { useTranslation } from 'react-i18next';
import { styles } from '../styles/explore.styles';
import { DailyTag, DailySortField, DailySortDirection, TimeView, StatusFilter } from '../types';
import type { WeekBlockItem } from './DailyWeekView';

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

      {/* Quick Filters Bar (Etiquetas, Pendientes, Completadas, Favoritas) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.tagsFilterScroll,
          { paddingLeft: 16, paddingRight: 32 },
        ]}
        style={{ marginHorizontal: -16 }}
      >
        {/* Botón principal "Etiquetas" que abre el panel inferior de filtrado múltiple y edición */}
        <Pressable
          style={[
            styles.tagFilterPill,
            styles.tagFilterMainBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            selectedTagFilters.length > 0 && styles.tagFilterMainBtnActive,
          ]}
          onPress={onOpenTagFilterSheet}
          accessibilityLabel="Gestionar y filtrar etiquetas"
        >
          <TagIcon
            size={13}
            color={selectedTagFilters.length > 0 ? '#0E0E0E' : gold[400]}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.tagFilterText,
              styles.tagFilterMainBtnText,
              { color: theme.colors.foregroundMuted },
              selectedTagFilters.length > 0 && styles.tagFilterMainBtnTextActive,
            ]}
          >
            {selectedTagFilters.length > 0
              ? `Etiquetas (${selectedTagFilters.length})`
              : 'Etiquetas'}
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
                  borderColor: tag.color ? `${tag.color}88` : '#D4B13A',
                  backgroundColor: tag.color ? `${tag.color}22` : (theme.dark ? '#2C2512' : '#F5E6B8'),
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

        {/* Filtro rápido: Todas (entre etiquetas y pendientes) */}
        <Pressable
          style={[
            styles.tagFilterPill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            statusFilter === 'all' && [styles.filterPillActive, { backgroundColor: theme.dark ? '#262012' : '#FDF4DC' }],
          ]}
          onPress={() => setStatusFilter('all')}
          accessibilityLabel="Ver todas las tareas"
        >
          <Text
            style={[
              styles.tagFilterText,
              { color: theme.colors.foregroundMuted },
              statusFilter === 'all' && styles.filterPillTextActive,
            ]}
          >
            Todas
          </Text>
        </Pressable>

        {/* Filtro rápido: Pendientes */}
        <Pressable
          style={[
            styles.tagFilterPill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            statusFilter === 'pending' && [styles.filterPillActive, { backgroundColor: theme.dark ? '#262012' : '#FDF4DC' }],
          ]}
          onPress={() => {
            setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'));
          }}
          accessibilityLabel="Filtrar por tareas pendientes"
        >
          <ListTodo
            size={12}
            color={statusFilter === 'pending' ? gold[400] : theme.colors.foregroundMuted}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.tagFilterText,
              { color: theme.colors.foregroundMuted },
              statusFilter === 'pending' && styles.filterPillTextActive,
            ]}
          >
            Pendientes
          </Text>
        </Pressable>

        {/* Filtro rápido: Completadas */}
        <Pressable
          style={[
            styles.tagFilterPill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            statusFilter === 'completed' && [styles.filterPillActive, { backgroundColor: theme.dark ? '#262012' : '#FDF4DC' }],
          ]}
          onPress={() => {
            setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'));
          }}
          accessibilityLabel="Filtrar por tareas completadas"
        >
          <CheckCircle2
            size={12}
            color={statusFilter === 'completed' ? '#34C759' : theme.colors.foregroundMuted}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.tagFilterText,
              { color: theme.colors.foregroundMuted },
              statusFilter === 'completed' && styles.filterPillTextActive,
            ]}
          >
            Completadas
          </Text>
        </Pressable>

        {/* Filtro rápido: Favoritas */}
        <Pressable
          style={[
            styles.tagFilterPill,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            onlyFavorites && [styles.filterPillActive, { backgroundColor: theme.dark ? '#262012' : '#FDF4DC' }],
          ]}
          onPress={() => setOnlyFavorites((prev) => !prev)}
          accessibilityLabel="Filtrar por favoritas"
        >
          <Star
            size={12}
            color={onlyFavorites ? gold[400] : theme.colors.foregroundMuted}
            fill={onlyFavorites ? gold[400] : 'transparent'}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.tagFilterText,
              { color: theme.colors.foregroundMuted },
              onlyFavorites && styles.filterPillTextActive,
            ]}
          >
            Favoritas{favoritesCount > 0 ? ` (${favoritesCount})` : ''}
          </Text>
        </Pressable>

        {/* Botón rápido para limpiar filtros activos */}
        {(statusFilter !== 'all' ||
          onlyFavorites ||
          priorityFilter !== 'all' ||
          selectedTagFilters.length > 0) && (
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
    </View>
  );
}

export interface DailyTasksHeaderProps extends DailyTasksTopBarProps, DailyTasksScrollControlsProps {}

export function DailyTasksHeader(props: DailyTasksHeaderProps) {
  return (
    <>
      <DailyTasksTopBar timeView={props.timeView} setTimeView={props.setTimeView} />
      <DailyTasksScrollControls {...props} />
    </>
  );
}

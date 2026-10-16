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
} from 'lucide-react-native';

import { gold } from '@bucketlist/ui/src/tokens/colors';
import { PageTitle } from '@bucketlist/ui';
import { styles } from '../styles/explore.styles';
import { DailyTag, DailySortField, DailySortDirection, TimeView, StatusFilter } from '../types';

interface DailyTasksHeaderProps {
  timeView: TimeView;
  setTimeView: (v: TimeView) => void;
  newTitle: string;
  setNewTitle: (t: string) => void;
  handleQuickAddTask: () => void;
  inputRef: React.RefObject<TextInput>;
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
}

export function DailyTasksHeader({
  timeView,
  setTimeView,
  newTitle,
  setNewTitle,
  handleQuickAddTask,
  inputRef,
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
}: DailyTasksHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <PageTitle gold="Día" rest="a día" />
      </View>
      <Text style={styles.subtitle}>
        Tus tareas personales. Organiza tu día a día con etiquetas, fechas y colaboradores.
      </Text>

      {/* Time View Switcher: Hoy | Semana | Calendario | Todas */}
      <View style={styles.segmentedContainer}>
        <Pressable
          style={[styles.segmentedTab, timeView === 'today' && styles.segmentedTabActive]}
          onPress={() => setTimeView('today')}
        >
          <Text style={[styles.segmentedTabText, timeView === 'today' && styles.segmentedTabTextActive]}>
            Hoy
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentedTab, timeView === 'week' && styles.segmentedTabActive]}
          onPress={() => setTimeView('week')}
        >
          <Text style={[styles.segmentedTabText, timeView === 'week' && styles.segmentedTabTextActive]}>
            Semana
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentedTab, timeView === 'calendar' && styles.segmentedTabActive]}
          onPress={() => setTimeView('calendar')}
        >
          <Text style={[styles.segmentedTabText, timeView === 'calendar' && styles.segmentedTabTextActive]}>
            Calendario
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentedTab, timeView === 'all' && styles.segmentedTabActive]}
          onPress={() => setTimeView('all')}
        >
          <Text style={[styles.segmentedTabText, timeView === 'all' && styles.segmentedTabTextActive]}>
            Todas
          </Text>
        </Pressable>
      </View>

      {/* Quick Add Bar */}
      <View style={styles.inputCard}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Añadir tarea rápida para hoy..."
          placeholderTextColor="#777"
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleQuickAddTask}
          returnKeyType="done"
        />

        {/* Quick add button */}
        <Pressable
          style={[styles.addBtn, !newTitle.trim() && styles.addBtnDisabled]}
          onPress={handleQuickAddTask}
          disabled={!newTitle.trim()}
          accessibilityLabel="Añadir tarea rápida"
        >
          <Plus size={18} color="#0E0E0E" strokeWidth={2.4} />
        </Pressable>
      </View>

      {/* Quick Filters Bar (Etiquetas, Pendientes, Completadas, Favoritas, Colaboradores) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagsFilterScroll}
      >
        {/* Botón principal "Etiquetas" que abre el panel inferior de filtrado múltiple y edición */}
        <Pressable
          style={[
            styles.tagFilterPill,
            styles.tagFilterMainBtn,
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
                  backgroundColor: tag.color ? `${tag.color}22` : '#2C2512',
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
              <X size={10} color="#AAA" />
            </Pressable>
          );
        })}

        {/* Filtro rápido: Pendientes */}
        <Pressable
          style={[
            styles.tagFilterPill,
            statusFilter === 'pending' && styles.filterPillActive,
          ]}
          onPress={() => {
            setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'));
          }}
          accessibilityLabel="Filtrar por tareas pendientes"
        >
          <ListTodo
            size={12}
            color={statusFilter === 'pending' ? gold[400] : '#888'}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.tagFilterText,
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
            statusFilter === 'completed' && styles.filterPillActive,
          ]}
          onPress={() => {
            setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'));
          }}
          accessibilityLabel="Filtrar por tareas completadas"
        >
          <CheckCircle2
            size={12}
            color={statusFilter === 'completed' ? '#34C759' : '#888'}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.tagFilterText,
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
            onlyFavorites && styles.filterPillActive,
          ]}
          onPress={() => setOnlyFavorites((prev) => !prev)}
          accessibilityLabel="Filtrar por favoritas"
        >
          <Star
            size={12}
            color={onlyFavorites ? gold[400] : '#888'}
            fill={onlyFavorites ? gold[400] : 'transparent'}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.tagFilterText,
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
            style={styles.clearFiltersPill}
            onPress={() => {
              setStatusFilter('all');
              setOnlyFavorites(false);
              setPriorityFilter('all');
              setSelectedTagFilters([]);
            }}
            accessibilityLabel="Restablecer filtros"
          >
            <X size={11} color="#AAA" />
            <Text style={styles.clearFiltersPillText}>Limpiar</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Sub-toolbar: 'Todas' a la izquierda y 'Prioridad' a la derecha */}
      <View style={styles.toolbarRow}>
        {/* Izquierda: Botón Todas */}
        <Pressable
          style={[
            styles.statusChip,
            statusFilter === 'all' && styles.statusChipActive,
          ]}
          onPress={() => setStatusFilter('all')}
          accessibilityLabel="Ver todas las tareas"
        >
          <Text
            style={[
              styles.statusChipText,
              statusFilter === 'all' && styles.statusChipTextActive,
            ]}
          >
            Todas
          </Text>
        </Pressable>

        {/* Derecha: Botón Prioridad (abre opciones de ordenación y clasificación) */}
        <Pressable
          style={[
            styles.sortTriggerBtn,
            (sortField !== 'manual' || groupByTag) && styles.sortTriggerBtnActive,
          ]}
          onPress={onOpenSortModal}
          accessibilityLabel="Ordenar por prioridad y opciones"
        >
          <ArrowUpDown
            size={12}
            color={sortField !== 'manual' || groupByTag ? gold[400] : '#9E9E9E'}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.sortTriggerText,
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

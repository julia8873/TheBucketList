/**
 * Controles compartidos de «Mi lista» (Tareas y Álbumes) con el nuevo diseño:
 *  - ListControlsBar: contador + modos de vista + selección + búsqueda + filtros + orden + plegar secciones
 *  - ActiveFilterChips: chips de filtros activos (se quitan con ✕)
 *  - ListFiltersSheet: hoja única de filtros (estado, prioridad y etiquetas)
 *  - SheetFrame / SheetGroup / SheetOption / SheetToggle: piezas de hoja inferior unificadas
 *  - SectionHeader: cabecera de sección plegable (FAVORITAS ★ 3 · Ocultar ⌄)
 */
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  AlignJustify,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  LayoutGrid,
  LayoutList,
  ListChecks,
  ListFilter,
  ArrowUpDown,
  Search,
  Star,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { TagSheetShell } from '@/components/TagSheetShell';
import type { Tag } from '@/hooks/useTags';
import { hexToRgba } from '@/constants/tagPresets';
import type { PriorityFilter } from '../types';

/* ───────────────────────── Botón-icono cuadrado (28px) ───────────────────────── */

export function IconBtn({
  children,
  onPress,
  active,
  label,
  theme,
  badge,
  innerRef,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  active?: boolean;
  label: string;
  theme: any;
  badge?: number;
  innerRef?: any;
  style?: any;
}) {
  return (
    <Pressable
      ref={innerRef}
      collapsable={false}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={[
        {
          width: 30,
          height: 30,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.colors.primary : theme.dark ? '#141414' : theme.colors.surface,
          borderWidth: 1,
          borderColor: active ? theme.colors.primary : theme.dark ? '#2A2A2A' : theme.colors.border,
        },
        style,
      ]}
    >
      {children}
      {!!badge && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 3,
            borderRadius: 8,
            backgroundColor: theme.dark ? '#000' : '#FFF',
            borderWidth: 1,
            borderColor: theme.colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: theme.colors.primary, fontSize: 9, fontFamily: 'Inter_700Bold' }}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ───────────────────────────── Barra de controles ───────────────────────────── */

export type ViewKey = 'list' | 'gallery' | 'compact';

interface ControlsBarProps {
  countLabel: string;
  viewMode: ViewKey;
  setViewMode: (m: any) => void;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  searchActive: boolean;
  onToggleSearch: () => void;
  filtersCount: number;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  sortTriggerRef: any;
  sortDir?: 'asc' | 'desc';
  showSortDir?: boolean;
  allCollapsed?: boolean;
  onToggleAllCollapsed?: () => void;
  isReordering?: boolean;
  onFinishReordering?: () => void;
  isSearching?: boolean;
  theme: any;
}

export function ListControlsBar({
  countLabel,
  viewMode,
  setViewMode,
  isSelectionMode,
  onToggleSelectionMode,
  searchActive,
  onToggleSearch,
  filtersCount,
  onOpenFilters,
  onOpenSort,
  sortTriggerRef,
  sortDir,
  showSortDir,
  allCollapsed,
  onToggleAllCollapsed,
  isReordering,
  onFinishReordering,
  isSearching,
  theme,
}: ControlsBarProps) {
  const { t } = useTranslation();
  const c = theme.colors;
  const muted = c.foregroundMuted;

  const views: Array<{ key: ViewKey; icon: React.ComponentType<any>; label: string }> = [
    { key: 'compact', icon: AlignJustify, label: t('my_list.view_compact') },
    { key: 'gallery', icon: LayoutGrid, label: t('my_list.view_gallery') },
    { key: 'list', icon: LayoutList, label: t('my_list.view_detailed') },
  ];

  const viewModesEl = (
    <View
      style={{
        flexDirection: 'row',
        padding: 2,
        borderRadius: 14,
        backgroundColor: theme.dark ? '#1A1A1A' : c.surface,
        borderWidth: 1,
        borderColor: theme.dark ? '#2A2A2A' : c.border,
        height: 30,
        alignItems: 'center',
      }}
    >
      {views.map((v) => {
        const Icon = v.icon;
        const on = viewMode === v.key;
        return (
          <Pressable
            key={v.key}
            onPress={() => setViewMode(v.key)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={v.label}
            accessibilityState={{ selected: on }}
            style={{
              width: 26,
              height: 24,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.primary : 'transparent',
            }}
          >
            <Icon size={14} color={on ? c.primaryForeground : muted} />
          </Pressable>
        );
      })}
    </View>
  );

  const actionButtonsEl = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {onToggleSelectionMode && (
        <IconBtn
          theme={theme}
          active={!!isSelectionMode}
          onPress={onToggleSelectionMode}
          label={
            isSelectionMode
              ? t('my_list.exit_selection_a11y', { defaultValue: 'Salir de selección múltiple' })
              : t('my_list.select_tasks_a11y', { defaultValue: 'Seleccionar' })
          }
        >
          <ListChecks size={15} color={isSelectionMode ? c.primaryForeground : c.primary} />
        </IconBtn>
      )}

      <IconBtn
        theme={theme}
        active={searchActive}
        onPress={onToggleSearch}
        label={t('common.search', { defaultValue: 'Buscar' })}
      >
        <Search size={15} color={searchActive ? c.primaryForeground : c.primary} />
      </IconBtn>

      <IconBtn
        theme={theme}
        active={filtersCount > 0}
        badge={filtersCount}
        onPress={onOpenFilters}
        label={t('my_list.filters', { defaultValue: 'Filtros' })}
      >
        <ListFilter size={15} color={filtersCount > 0 ? c.primaryForeground : c.primary} />
      </IconBtn>

      <IconBtn
        theme={theme}
        innerRef={sortTriggerRef}
        onPress={onOpenSort}
        label={t('my_list.sort_tasks', { defaultValue: 'Ordenar' })}
      >
        {showSortDir && sortDir ? (
          sortDir === 'desc' ? (
            <ArrowDown size={15} color={c.primary} />
          ) : (
            <ArrowUp size={15} color={c.primary} />
          )
        ) : (
          <ArrowUpDown size={15} color={c.primary} />
        )}
      </IconBtn>

      {onToggleAllCollapsed && (
        <IconBtn
          theme={theme}
          onPress={onToggleAllCollapsed}
          label={t('my_list.collapse_sections', { defaultValue: 'Compactar secciones' })}
        >
          {allCollapsed ? <ChevronsUpDown size={15} color={c.primary} /> : <ChevronsDownUp size={15} color={c.primary} />}
        </IconBtn>
      )}

      {!isSearching && isReordering && onFinishReordering && (
        <Pressable
          onPress={onFinishReordering}
          hitSlop={8}
          style={{
            height: 30,
            paddingHorizontal: 10,
            borderRadius: 10,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11, fontFamily: 'Inter_700Bold', color: c.primaryForeground }}>OK</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 12,
      }}
    >
      {countLabel ? (
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: muted,
            fontFamily: 'Inter_600SemiBold',
            fontSize: 11,
            letterSpacing: 0.9,
          }}
        >
          {countLabel}
        </Text>
      ) : (
        viewModesEl
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {countLabel ? viewModesEl : null}
        {actionButtonsEl}
      </View>
    </View>
  );
}

/* ─────────────────────────── Chips de filtros activos ─────────────────────────── */

export function ActiveFilterChips({
  statusLabel,
  onClearStatus,
  priorityLabel,
  onClearPriority,
  tags,
  onRemoveTag,
  theme,
}: {
  statusLabel?: string | null;
  onClearStatus: () => void;
  priorityLabel?: string | null;
  onClearPriority: () => void;
  tags: Tag[];
  onRemoveTag: (id: string) => void;
  theme: any;
}) {
  const c = theme.colors;
  if (!statusLabel && !priorityLabel && tags.length === 0) return null;

  const chipBase = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    maxWidth: '100%' as const,
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {statusLabel ? (
        <Pressable
          onPress={onClearStatus}
          style={[chipBase, { backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary }]}
          accessibilityRole="button"
          accessibilityLabel={statusLabel}
        >
          <Text numberOfLines={1} style={{ color: c.primaryForeground, fontSize: 11, fontFamily: 'Inter_700Bold' }}>
            {statusLabel}
          </Text>
          <X size={12} color={c.primaryForeground} strokeWidth={2.5} />
        </Pressable>
      ) : null}
      {priorityLabel ? (
        <Pressable
          onPress={onClearPriority}
          style={[chipBase, { backgroundColor: c.primary, borderWidth: 1, borderColor: c.primary }]}
          accessibilityRole="button"
          accessibilityLabel={priorityLabel}
        >
          <Text numberOfLines={1} style={{ color: c.primaryForeground, fontSize: 11, fontFamily: 'Inter_700Bold' }}>
            {priorityLabel}
          </Text>
          <X size={12} color={c.primaryForeground} strokeWidth={2.5} />
        </Pressable>
      ) : null}
      {tags.map((tag) => (
        <Pressable
          key={tag.id}
          onPress={() => onRemoveTag(tag.id)}
          style={[
            chipBase,
            {
              backgroundColor: hexToRgba(tag.color, 0.16),
              borderWidth: 1,
              borderColor: hexToRgba(tag.color, 0.5),
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={tag.name}
        >
          {tag.emoji ? <Text style={{ fontSize: 11 }}>{tag.emoji}</Text> : (
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tag.color }} />
          )}
          <Text numberOfLines={1} style={{ color: c.foreground, fontSize: 11, fontFamily: 'Inter_600SemiBold', maxWidth: 120 }}>
            {tag.name}
          </Text>
          <X size={12} color={c.foregroundMuted} strokeWidth={2.5} />
        </Pressable>
      ))}
    </View>
  );
}

/* ─────────────────────── Hoja inferior unificada (piezas) ─────────────────────── */

export function SheetFrame({
  visible,
  onClose,
  title,
  action,
  footerLabel,
  onFooter,
  theme,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  action?: { label: string; onPress: () => void };
  footerLabel: string;
  onFooter?: () => void;
  theme: any;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  return (
    <TagSheetShell visible={visible} onClose={onClose}>
      <View style={{ flexShrink: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
        >
          <Text style={{ color: c.foreground, fontSize: 15, fontFamily: 'Inter_700Bold' }}>{title}</Text>
          {action ? (
            <Pressable onPress={action.onPress} hitSlop={10} accessibilityRole="button">
              <Text style={{ color: c.primary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>{action.label}</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 18 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
          <Pressable
            onPress={onFooter ?? onClose}
            accessibilityRole="button"
            style={({ pressed }) => ({
              height: 46,
              borderRadius: 14,
              backgroundColor: c.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: c.primaryForeground, fontSize: 14, fontFamily: 'Inter_700Bold' }}>{footerLabel}</Text>
          </Pressable>
        </View>
      </View>
    </TagSheetShell>
  );
}

export function SheetLabel({ children, theme }: { children: React.ReactNode; theme: any }) {
  return (
    <Text
      style={{
        color: theme.colors.foregroundMuted,
        fontSize: 11,
        fontFamily: 'Inter_600SemiBold',
        letterSpacing: 0.9,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

export function SheetGroup({ children, theme }: { children: React.ReactNode; theme: any }) {
  const items = React.Children.toArray(children);
  return (
    <View
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.dark ? '#2A2A2A' : theme.colors.border,
      }}
    >
      {items.map((child, i) => (
        <View
          key={i}
          style={i > 0 ? { borderTopWidth: 1, borderTopColor: theme.dark ? '#2A2A2A' : theme.colors.border } : undefined}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

export function SheetOption({
  label,
  selected,
  right,
  onPress,
  theme,
}: {
  label: string;
  selected?: boolean;
  right?: React.ReactNode;
  onPress: () => void;
  theme: any;
}) {
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => ({
        height: 48,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? c.primary : c.foreground,
          fontSize: 13,
          fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_400Regular',
        }}
      >
        {label}
      </Text>
      {right ?? (selected ? <Check size={16} color={c.primary} strokeWidth={2.5} /> : null)}
    </Pressable>
  );
}

/** Fila con interruptor (mismo aspecto que «Personalizar vista» de Mi lista). */
export function SheetToggle({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: any;
}) {
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        height: 48,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: c.foreground, fontSize: 13, fontFamily: 'Inter_400Regular', flexShrink: 1, paddingRight: 12 }}>
        {label}
      </Text>
      <View
        style={{
          width: 40,
          height: 24,
          borderRadius: 12,
          padding: 2,
          justifyContent: 'center',
          alignItems: value ? 'flex-end' : 'flex-start',
          backgroundColor: value ? c.primary : theme.dark ? '#2A2A2A' : '#EDE8DE',
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.4,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </View>
    </Pressable>
  );
}

export function SheetChip({
  label,
  count,
  on,
  onPress,
  theme,
}: {
  label: string;
  count?: number;
  on: boolean;
  onPress: () => void;
  theme: any;
}) {
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{
        height: 34,
        paddingHorizontal: 13,
        borderRadius: 17,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: on ? c.primary : theme.dark ? '#1A1A1A' : c.surface,
        borderWidth: 1,
        borderColor: on ? c.primary : theme.dark ? '#2A2A2A' : c.border,
      }}
    >
      <Text
        style={{
          color: on ? c.primaryForeground : c.foreground,
          fontSize: 12,
          fontFamily: on ? 'Inter_700Bold' : 'Inter_500Medium',
        }}
      >
        {label}
      </Text>
      {count !== undefined && (
        <Text style={{ color: on ? c.primaryForeground : c.foregroundMuted, fontSize: 10, opacity: 0.7 }}>{count}</Text>
      )}
    </Pressable>
  );
}

/** Control segmentado de la hoja (Prioridad, Dirección…). */
export function SheetSegment<K extends string>({
  options,
  value,
  onChange,
  theme,
}: {
  options: Array<{ key: K; label: string }>;
  value: K;
  onChange: (k: K) => void;
  theme: any;
}) {
  const c = theme.colors;
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: 12,
        backgroundColor: theme.dark ? '#1A1A1A' : c.surface,
        borderWidth: 1,
        borderColor: theme.dark ? '#2A2A2A' : c.border,
      }}
    >
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.primary : 'transparent',
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                color: on ? c.primaryForeground : c.foregroundMuted,
                fontSize: 12,
                fontFamily: on ? 'Inter_700Bold' : 'Inter_500Medium',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────────── Hoja de filtros ───────────────────────────── */

export function ListFiltersSheet<S extends string>({
  visible,
  onClose,
  title,
  statusOptions,
  status,
  setStatus,
  priority,
  setPriority,
  selectedTagIds,
  onOpenTags,
  onReset,
  resultLabel,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  statusOptions: Array<{ key: S; label: string }>;
  status: S;
  setStatus: (s: S) => void;
  priority: PriorityFilter;
  setPriority: (p: PriorityFilter) => void;
  selectedTagIds: string[];
  onOpenTags: () => void;
  onReset: () => void;
  resultLabel: string;
  theme: any;
}) {
  const { t } = useTranslation();
  const c = theme.colors;
  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      theme={theme}
      title={title}
      action={{ label: t('my_list.reset_filters', { defaultValue: 'Restablecer' }), onPress: onReset }}
      footerLabel={resultLabel}
    >
      <View>
        <SheetLabel theme={theme}>{t('my_list.filters_status')}</SheetLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {statusOptions.map((o) => (
            <SheetChip key={o.key} theme={theme} label={o.label} on={status === o.key} onPress={() => setStatus(o.key)} />
          ))}
        </View>
      </View>

      <View>
        <SheetLabel theme={theme}>{t('my_list.filter_priority', { defaultValue: 'Prioridad' })}</SheetLabel>
        <SheetSegment<PriorityFilter>
          theme={theme}
          value={priority}
          onChange={setPriority}
          options={[
            { key: 'all', label: t('my_list.filter_all') },
            { key: 'high', label: t('my_list.priority_filter_high') },
            { key: 'medium', label: t('my_list.priority_filter_medium') },
            { key: 'low', label: t('my_list.priority_filter_low') },
          ]}
        />
      </View>

      <View>
        <SheetLabel theme={theme}>{t('my_list.filter_tags', { defaultValue: 'Etiquetas' })}</SheetLabel>
        <SheetGroup theme={theme}>
          <SheetOption
            theme={theme}
            selected={selectedTagIds.length > 0}
            label={
              selectedTagIds.length === 0
                ? t('my_list.filter_tags_short', { defaultValue: 'Etiquetas' })
                : selectedTagIds.length === 1
                ? t('my_list.tags_count_single')
                : t('my_list.tags_count_plural', { count: selectedTagIds.length })
            }
            right={<ChevronRight size={16} color={selectedTagIds.length > 0 ? c.primary : c.foregroundMuted} />}
            onPress={onOpenTags}
          />
        </SheetGroup>
      </View>
    </SheetFrame>
  );
}

/* ─────────────────────────── Cabecera de sección plegable ─────────────────────────── */

export function SectionHeader({
  title,
  count,
  collapsed,
  isFavorites,
  onToggle,
  theme,
}: {
  title: string;
  count: number;
  collapsed: boolean;
  isFavorites?: boolean;
  onToggle: () => void;
  theme: any;
}) {
  const { t } = useTranslation();
  const c = theme.colors;
  // Por si algún idioma antiguo aún trae el emoji en el título: la estrella se pinta siempre como icono.
  const cleanTitle = title.replace(/\s*[⭐★☆]\uFE0F?\s*$/u, '');
  const actionLabel = collapsed
    ? t('my_list.show_section', { defaultValue: 'Mostrar' })
    : t('my_list.hide_section', { defaultValue: 'Ocultar' });
  const ActionIcon = collapsed ? ChevronRight : ChevronDown;

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: !collapsed }}
      accessibilityLabel={cleanTitle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingTop: 6,
        paddingBottom: 6,
        marginTop: 14,
        marginBottom: collapsed ? 2 : 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            color: c.foregroundMuted,
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 12,
            letterSpacing: 1.4,
          }}
        >
          {cleanTitle}
        </Text>
        {isFavorites ? (
          <Star size={13} color={c.primary} fill={c.primary} strokeWidth={2} style={{ marginLeft: 6 }} />
        ) : null}
        {count > 0 && (
          <View
            style={{
              marginLeft: 8,
              minWidth: 24,
              height: 20,
              paddingHorizontal: 8,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.dark ? '#141414' : c.surface,
              borderWidth: 1,
              borderColor: theme.dark ? '#2A2A2A' : c.border,
            }}
          >
            <Text style={{ color: c.foregroundSubtle, fontSize: 10, fontFamily: 'Inter_500Medium' }}>{count}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        <Text style={{ color: c.foregroundSubtle, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{actionLabel}</Text>
        <ActionIcon size={14} color={c.foregroundSubtle} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

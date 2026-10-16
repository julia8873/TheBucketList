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
import { gold } from '@bucketlist/ui/src/tokens/colors';
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
        <View style={styles.sortSheetCard}>
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SlidersHorizontal size={18} color={gold[400]} />
              <Text style={styles.sheetTitle}>Ordenar y clasificar</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color="#888" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
            {/* Section 1: Agrupar por etiquetas */}
            <View style={styles.sortSection}>
              <Text style={styles.sortSectionTitle}>CLASIFICAR</Text>
              <Pressable
                style={[
                  styles.sortOptionCard,
                  groupByTag && styles.sortOptionCardActive,
                ]}
                onPress={onToggleGroupByTag}
              >
                <View style={styles.sortOptionLeft}>
                  <View style={[styles.sortOptionIconBox, groupByTag && styles.sortOptionIconBoxActive]}>
                    <Layers size={18} color={groupByTag ? '#0E0E0E' : gold[400]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, groupByTag && styles.sortOptionTitleActive]}>
                      Clasificar por etiquetas
                    </Text>
                    <Text style={styles.sortOptionSubtitle}>
                      Agrupa las tareas en bloques por cada etiqueta
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.sortTogglePill,
                    groupByTag && styles.sortTogglePillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortTogglePillText,
                      groupByTag && styles.sortTogglePillTextActive,
                    ]}
                  >
                    {groupByTag ? 'Activado' : 'Desactivado'}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Section 2: Criterio de ordenación */}
            <View style={styles.sortSection}>
              <Text style={styles.sortSectionTitle}>ORDENAR POR</Text>

              {/* Manual / Arrastrar */}
              <Pressable
                style={[
                  styles.sortOptionCard,
                  sortField === 'manual' && styles.sortOptionCardActive,
                ]}
                onPress={() => onSelectSort('manual')}
              >
                <View style={styles.sortOptionLeft}>
                  <View style={[styles.sortOptionIconBox, sortField === 'manual' && styles.sortOptionIconBoxActive]}>
                    <GripVertical size={18} color={sortField === 'manual' ? '#0E0E0E' : '#AAA'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, sortField === 'manual' && styles.sortOptionTitleActive]}>
                      Manual (Por defecto)
                    </Text>
                    <Text style={styles.sortOptionSubtitle}>
                      Arrastra y reordena las tareas en el orden que prefieras
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
                  sortField === 'priority' && styles.sortOptionCardActive,
                ]}
                onPress={() => onSelectSort('priority')}
              >
                <View style={styles.sortOptionLeft}>
                  <View style={[styles.sortOptionIconBox, sortField === 'priority' && styles.sortOptionIconBoxActive]}>
                    <Flag size={18} color={sortField === 'priority' ? '#0E0E0E' : '#FF453A'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, sortField === 'priority' && styles.sortOptionTitleActive]}>
                      Prioridad
                    </Text>
                    <Text style={styles.sortOptionSubtitle}>
                      {sortField === 'priority'
                        ? sortDirection === 'desc'
                          ? 'Urgente 🔴 → Baja 🟢 (Toca para invertir)'
                          : 'Baja 🟢 → Urgente 🔴 (Toca para invertir)'
                        : 'Urgente 🔴 > Alta 🟠 > Media 🟡 > Baja 🟢'}
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
                  sortField === 'name' && styles.sortOptionCardActive,
                ]}
                onPress={() => onSelectSort('name')}
              >
                <View style={styles.sortOptionLeft}>
                  <View style={[styles.sortOptionIconBox, sortField === 'name' && styles.sortOptionIconBoxActive]}>
                    <ArrowDownAZ size={18} color={sortField === 'name' ? '#0E0E0E' : '#3B82F6'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, sortField === 'name' && styles.sortOptionTitleActive]}>
                      Nombre / Título
                    </Text>
                    <Text style={styles.sortOptionSubtitle}>
                      {sortField === 'name'
                        ? sortDirection === 'asc'
                          ? 'A → Z (Toca para invertir)'
                          : 'Z → A (Toca para invertir)'
                        : 'Orden alfabético de la A a la Z'}
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
                  sortField === 'date' && styles.sortOptionCardActive,
                ]}
                onPress={() => onSelectSort('date')}
              >
                <View style={styles.sortOptionLeft}>
                  <View style={[styles.sortOptionIconBox, sortField === 'date' && styles.sortOptionIconBoxActive]}>
                    <Calendar size={18} color={sortField === 'date' ? '#0E0E0E' : gold[400]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sortOptionTitle, sortField === 'date' && styles.sortOptionTitleActive]}>
                      Fecha de vencimiento
                    </Text>
                    <Text style={styles.sortOptionSubtitle}>
                      {sortField === 'date'
                        ? sortDirection === 'asc'
                          ? 'Más próximas primero (Toca para invertir)'
                          : 'Más lejanas primero (Toca para invertir)'
                        : 'Tareas más próximas o programadas primero'}
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
          <View style={styles.sortSheetFooter}>
            <Pressable
              style={styles.sortResetBtn}
              onPress={onResetSort}
            >
              <Text style={styles.sortResetBtnText}>Restablecer</Text>
            </Pressable>
            <Pressable
              style={styles.sortApplyBtn}
              onPress={onClose}
            >
              <Text style={styles.sortApplyBtnText}>Aplicar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

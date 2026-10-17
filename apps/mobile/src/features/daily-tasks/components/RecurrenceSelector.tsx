import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { RotateCw } from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import { styles } from '../styles/explore.styles';
import { getRecurrenceLabel } from '../utils/dailyTaskDateUtils';
import type { DailyTaskRecurrenceUnit } from '../types';

interface RecurrenceSelectorProps {
  isCreate: boolean;
  isRecurring: boolean;
  setIsRecurring: React.Dispatch<React.SetStateAction<boolean>>;
  interval: number;
  setInterval: React.Dispatch<React.SetStateAction<number>>;
  unit: DailyTaskRecurrenceUnit;
  setUnit: React.Dispatch<React.SetStateAction<DailyTaskRecurrenceUnit>>;
  showCustom: boolean;
  setShowCustom: React.Dispatch<React.SetStateAction<boolean>>;
  onAutoSave?: (updates: {
    is_recurring?: boolean;
    recurrence_interval?: number;
    recurrence_unit?: DailyTaskRecurrenceUnit;
  }) => void;
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  isCreate,
  isRecurring,
  setIsRecurring,
  interval,
  setInterval,
  unit,
  setUnit,
  showCustom,
  setShowCustom,
  onAutoSave,
}) => {
  const { theme } = useTheme();

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Repetir / Recurrencia</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recurrencePresetsScroll}
      >
        {/* No se repite */}
        <Pressable
          style={[
            styles.recurrencePresetPill,
            { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
            !isRecurring && styles.recurrencePresetPillActive,
          ]}
          onPress={() => {
            setIsRecurring(false);
            setShowCustom(false);
            if (!isCreate && onAutoSave) {
              onAutoSave({ is_recurring: false });
            }
          }}
        >
          <Text
            style={[
              styles.recurrencePresetText,
              { color: theme.colors.foregroundMuted },
              !isRecurring && styles.recurrencePresetTextActive,
            ]}
          >
            No se repite
          </Text>
        </Pressable>

        {/* Cada día */}
        <Pressable
          style={[
            styles.recurrencePresetPill,
            { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
            isRecurring && interval === 1 && unit === 'days' && !showCustom && styles.recurrencePresetPillActive,
          ]}
          onPress={() => {
            setIsRecurring(true);
            setInterval(1);
            setUnit('days');
            setShowCustom(false);
            if (!isCreate && onAutoSave) {
              onAutoSave({ is_recurring: true, recurrence_interval: 1, recurrence_unit: 'days' });
            }
          }}
        >
          <RotateCw
            size={12}
            color={isRecurring && interval === 1 && unit === 'days' && !showCustom ? gold[400] : theme.colors.foregroundMuted}
          />
          <Text
            style={[
              styles.recurrencePresetText,
              { color: theme.colors.foregroundMuted },
              isRecurring && interval === 1 && unit === 'days' && !showCustom && styles.recurrencePresetTextActive,
            ]}
          >
            Cada día
          </Text>
        </Pressable>

        {/* Cada 2 días */}
        <Pressable
          style={[
            styles.recurrencePresetPill,
            { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
            isRecurring && interval === 2 && unit === 'days' && !showCustom && styles.recurrencePresetPillActive,
          ]}
          onPress={() => {
            setIsRecurring(true);
            setInterval(2);
            setUnit('days');
            setShowCustom(false);
            if (!isCreate && onAutoSave) {
              onAutoSave({ is_recurring: true, recurrence_interval: 2, recurrence_unit: 'days' });
            }
          }}
        >
          <RotateCw
            size={12}
            color={isRecurring && interval === 2 && unit === 'days' && !showCustom ? gold[400] : theme.colors.foregroundMuted}
          />
          <Text
            style={[
              styles.recurrencePresetText,
              { color: theme.colors.foregroundMuted },
              isRecurring && interval === 2 && unit === 'days' && !showCustom && styles.recurrencePresetTextActive,
            ]}
          >
            Cada 2 días
          </Text>
        </Pressable>

        {/* Cada semana */}
        <Pressable
          style={[
            styles.recurrencePresetPill,
            { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
            isRecurring && interval === 1 && unit === 'weeks' && !showCustom && styles.recurrencePresetPillActive,
          ]}
          onPress={() => {
            setIsRecurring(true);
            setInterval(1);
            setUnit('weeks');
            setShowCustom(false);
            if (!isCreate && onAutoSave) {
              onAutoSave({ is_recurring: true, recurrence_interval: 1, recurrence_unit: 'weeks' });
            }
          }}
        >
          <RotateCw
            size={12}
            color={isRecurring && interval === 1 && unit === 'weeks' && !showCustom ? gold[400] : theme.colors.foregroundMuted}
          />
          <Text
            style={[
              styles.recurrencePresetText,
              { color: theme.colors.foregroundMuted },
              isRecurring && interval === 1 && unit === 'weeks' && !showCustom && styles.recurrencePresetTextActive,
            ]}
          >
            Cada semana
          </Text>
        </Pressable>

        {/* Cada 2 semanas */}
        <Pressable
          style={[
            styles.recurrencePresetPill,
            { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
            isRecurring && interval === 2 && unit === 'weeks' && !showCustom && styles.recurrencePresetPillActive,
          ]}
          onPress={() => {
            setIsRecurring(true);
            setInterval(2);
            setUnit('weeks');
            setShowCustom(false);
            if (!isCreate && onAutoSave) {
              onAutoSave({ is_recurring: true, recurrence_interval: 2, recurrence_unit: 'weeks' });
            }
          }}
        >
          <RotateCw
            size={12}
            color={isRecurring && interval === 2 && unit === 'weeks' && !showCustom ? gold[400] : theme.colors.foregroundMuted}
          />
          <Text
            style={[
              styles.recurrencePresetText,
              { color: theme.colors.foregroundMuted },
              isRecurring && interval === 2 && unit === 'weeks' && !showCustom && styles.recurrencePresetTextActive,
            ]}
          >
            Cada 2 semanas
          </Text>
        </Pressable>

        {/* Cada mes */}
        <Pressable
          style={[
            styles.recurrencePresetPill,
            { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
            isRecurring && interval === 1 && unit === 'months' && !showCustom && styles.recurrencePresetPillActive,
          ]}
          onPress={() => {
            setIsRecurring(true);
            setInterval(1);
            setUnit('months');
            setShowCustom(false);
            if (!isCreate && onAutoSave) {
              onAutoSave({ is_recurring: true, recurrence_interval: 1, recurrence_unit: 'months' });
            }
          }}
        >
          <RotateCw
            size={12}
            color={isRecurring && interval === 1 && unit === 'months' && !showCustom ? gold[400] : theme.colors.foregroundMuted}
          />
          <Text
            style={[
              styles.recurrencePresetText,
              { color: theme.colors.foregroundMuted },
              isRecurring && interval === 1 && unit === 'months' && !showCustom && styles.recurrencePresetTextActive,
            ]}
          >
            Cada mes
          </Text>
        </Pressable>

        {/* Personalizado... */}
        <Pressable
          style={[
            styles.recurrencePresetPill,
            { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border },
            isRecurring && showCustom && styles.recurrencePresetPillActive,
          ]}
          onPress={() => {
            setIsRecurring(true);
            setShowCustom(true);
            if (!isCreate && onAutoSave) {
              onAutoSave({ is_recurring: true, recurrence_interval: interval, recurrence_unit: unit });
            }
          }}
        >
          <Text
            style={[
              styles.recurrencePresetText,
              { color: theme.colors.foregroundMuted },
              isRecurring && showCustom && styles.recurrencePresetTextActive,
            ]}
          >
            Personalizado...
          </Text>
        </Pressable>
      </ScrollView>

      {/* Stepper y selector de unidades para personalizado */}
      {isRecurring && showCustom && (
        <View style={[styles.recurrenceCustomBox, { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.recurrenceStepperRow}>
            <Text style={[styles.recurrenceStepperLabel, { color: theme.colors.foreground }]}>Repetir cada:</Text>
            <View style={styles.recurrenceStepperControls}>
              <Pressable
                style={[styles.recurrenceStepBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => {
                  const nextVal = Math.max(1, interval - 1);
                  setInterval(nextVal);
                  if (!isCreate && onAutoSave) {
                    onAutoSave({ recurrence_interval: nextVal });
                  }
                }}
                hitSlop={6}
              >
                <Text style={[styles.recurrenceStepBtnText, { color: theme.colors.foreground }]}>-</Text>
              </Pressable>
              <Text style={[styles.recurrenceStepValueText, { color: theme.colors.foreground }]}>{interval}</Text>
              <Pressable
                style={[styles.recurrenceStepBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => {
                  const nextVal = Math.min(99, interval + 1);
                  setInterval(nextVal);
                  if (!isCreate && onAutoSave) {
                    onAutoSave({ recurrence_interval: nextVal });
                  }
                }}
                hitSlop={6}
              >
                <Text style={[styles.recurrenceStepBtnText, { color: theme.colors.foreground }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.recurrenceUnitsRow}>
            {(['days', 'weeks', 'months'] as const).map((u) => {
              const isSelected = unit === u;
              const label =
                u === 'days'
                  ? interval === 1 ? 'Día' : 'Días'
                  : u === 'weeks'
                  ? interval === 1 ? 'Semana' : 'Semanas'
                  : interval === 1 ? 'Mes' : 'Meses';
              return (
                <Pressable
                  key={u}
                  style={[
                    styles.recurrenceUnitPill,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                    isSelected && styles.recurrenceUnitPillActive,
                  ]}
                  onPress={() => {
                    setUnit(u);
                    if (!isCreate && onAutoSave) {
                      onAutoSave({ recurrence_unit: u });
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.recurrenceUnitText,
                      { color: theme.colors.foregroundMuted },
                      isSelected && styles.recurrenceUnitTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {isRecurring && (
        <Text style={styles.recurrenceHelperNote}>
          🔄 Se repetirá {getRecurrenceLabel(interval, unit)}. Al completarla, pasará automáticamente a la siguiente fecha.
        </Text>
      )}
    </View>
  );
};

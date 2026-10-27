import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { getDateFnsLocale } from '@/utils/dateLocale';
import { useTheme, gold, fontFamily } from '@bucketlist/ui';

export interface UniversalDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
}

/**
 * Selector de fecha universal.
 * - En móvil (iOS/Android): utiliza el DateTimePicker nativo del sistema.
 * - En web: muestra un modal interactivo con calendario completo para poder
 *   seleccionar y cambiar fechas fácilmente sin depender de APIs nativas.
 */
export function UniversalDatePicker({
  value,
  onChange,
  onClose,
  mode = 'date',
  minimumDate,
  maximumDate,
  title,
}: UniversalDatePickerProps) {
  if (Platform.OS !== 'web') {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={(event, selectedDate) => {
          if (event.type === 'dismissed') {
            onClose();
          } else if (selectedDate) {
            onChange(selectedDate);
          } else {
            onClose();
          }
        }}
      />
    );
  }

  return (
    <WebCalendarPickerModal
      value={value}
      onChange={onChange}
      onClose={onClose}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      title={title}
    />
  );
}

function WebCalendarPickerModal({
  value,
  onChange,
  onClose,
  minimumDate,
  maximumDate,
  title,
}: {
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = getDateFnsLocale(i18n.language);

  const [selectedDate, setSelectedDate] = useState<Date>(value || new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(value || new Date());

  const daysOfWeek = i18n.language.startsWith('en')
    ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    : ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  const grid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return days.map((d) => {
      const isCurrent = isSameMonth(d, currentMonth);
      const isSel = isSameDay(d, selectedDate);
      const isTod = isToday(d);
      const isBeforeMin = minimumDate ? d < minimumDate : false;
      const isAfterMax = maximumDate ? d > maximumDate : false;
      const disabled = isBeforeMin || isAfterMax;

      return {
        date: d,
        dayNumber: format(d, 'd'),
        isCurrentMonth: isCurrent,
        isSelected: isSel,
        isToday: isTod,
        disabled,
      };
    });
  }, [currentMonth, selectedDate, minimumDate, maximumDate]);

  const monthLabel = useMemo(() => {
    const formatted = format(currentMonth, 'MMMM yyyy', { locale: dateFnsLocale });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [currentMonth, dateFnsLocale]);

  const handleDayPress = (day: Date, disabled: boolean) => {
    if (disabled) return;
    setSelectedDate(day);
    if (!isSameMonth(day, currentMonth)) {
      setCurrentMonth(day);
    }
  };

  const handleSelectToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    onClose();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.outsidePressable} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface ?? (theme.dark ? '#1A1A1A' : '#FFFFFF'),
              borderColor: theme.colors.border ?? (theme.dark ? '#2E2E2E' : '#E5E5E5'),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleWithIcon}>
              <CalendarIcon size={18} color={gold[400]} />
              <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>
                {title || t('daily.tab_calendar', { defaultValue: 'Calendario' })}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          {/* Month Navigation */}
          <View style={styles.navRow}>
            <Pressable
              onPress={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              hitSlop={8}
              style={[
                styles.navBtn,
                { backgroundColor: theme.dark ? '#262626' : '#F0F0F0' },
              ]}
            >
              <ChevronLeft size={16} color={theme.colors.foreground} />
            </Pressable>
            <Text style={[styles.monthText, { color: theme.colors.foreground }]}>
              {monthLabel}
            </Text>
            <Pressable
              onPress={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              hitSlop={8}
              style={[
                styles.navBtn,
                { backgroundColor: theme.dark ? '#262626' : '#F0F0F0' },
              ]}
            >
              <ChevronRight size={16} color={theme.colors.foreground} />
            </Pressable>
          </View>

          {/* Days of Week Header */}
          <View style={styles.daysOfWeekRow}>
            {daysOfWeek.map((dayName, idx) => (
              <View key={`${dayName}-${idx}`} style={styles.dayCol}>
                <Text style={[styles.dayOfWeekText, { color: theme.colors.foregroundMuted }]}>
                  {dayName}
                </Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.gridContainer}>
            {grid.map((cell, idx) => {
              const { dayNumber, isCurrentMonth, isSelected, isToday: isTod, disabled } = cell;

              let textColor = theme.colors.foreground;
              if (disabled) {
                textColor = theme.dark ? '#404040' : '#CCCCCC';
              } else if (!isCurrentMonth) {
                textColor = theme.dark ? '#555555' : '#AAAAAA';
              }
              if (isSelected) {
                textColor = '#000000';
              }

              return (
                <Pressable
                  key={idx}
                  onPress={() => handleDayPress(cell.date, disabled)}
                  disabled={disabled}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: gold[400] },
                    isTod && !isSelected && {
                      borderColor: gold[400],
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      { color: textColor },
                      isSelected && { fontFamily: fontFamily.bold },
                    ]}
                  >
                    {dayNumber}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Footer Actions */}
          <View style={[styles.footerRow, { borderTopColor: theme.colors.border }]}>
            <Pressable
              onPress={handleSelectToday}
              style={[
                styles.todayBtn,
                { backgroundColor: theme.dark ? '#262626' : '#F0F0F0' },
              ]}
            >
              <Text style={[styles.todayBtnText, { color: theme.colors.foreground }]}>
                {t('common.today', { defaultValue: 'Hoy' })}
              </Text>
            </Pressable>

            <View style={styles.actionsRight}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: theme.colors.foregroundMuted }]}>
                  {t('common.cancel', { defaultValue: 'Cancelar' })}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={[styles.confirmBtn, { backgroundColor: gold[400] }]}
              >
                <Text style={styles.confirmBtnText}>
                  {t('common.save', { defaultValue: 'Guardar' })}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  outsidePressable: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '92%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100000,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
  },
  dayOfWeekText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginVertical: 2,
  },
  dayNumberText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  todayBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  cancelBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  confirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    color: '#000000',
  },
});

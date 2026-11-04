import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { format, setMonth, setYear } from 'date-fns';
import { useTranslation } from '@bucketlist/shared';
import { getDateFnsLocale } from '@/utils/dateLocale';
import { useTheme, gold } from '@bucketlist/ui';

export interface MonthYearPickerModalProps {
  visible: boolean;
  currentDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  minDate?: Date;
  maxDate?: Date;
}

export function MonthYearPickerModal({
  visible,
  currentDate,
  onSelect,
  onClose,
  minDate,
  maxDate,
}: MonthYearPickerModalProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const dateFnsLocale = getDateFnsLocale(i18n.language);

  const initialYear = currentDate?.getFullYear() || new Date().getFullYear();
  const initialMonth = currentDate?.getMonth() ?? new Date().getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [showYearGrid, setShowYearGrid] = useState<boolean>(false);

  // Sync with currentDate when opened
  React.useEffect(() => {
    if (visible) {
      setSelectedYear(currentDate?.getFullYear() || new Date().getFullYear());
      setShowYearGrid(false);
    }
  }, [visible, currentDate]);

  // Generate 12 months for the selected year
  const months = useMemo(() => {
    const list: Array<{ index: number; name: string; shortName: string; disabled: boolean }> = [];
    for (let m = 0; m < 12; m++) {
      const d = new Date(selectedYear, m, 1);
      const shortName = format(d, 'MMM', { locale: dateFnsLocale });
      const fullName = format(d, 'MMMM', { locale: dateFnsLocale });

      let disabled = false;
      if (minDate && new Date(selectedYear, m + 1, 0) < minDate) {
        disabled = true;
      }
      if (maxDate && new Date(selectedYear, m, 1) > maxDate) {
        disabled = true;
      }

      list.push({
        index: m,
        name: fullName.charAt(0).toUpperCase() + fullName.slice(1),
        shortName: shortName.charAt(0).toUpperCase() + shortName.slice(1).replace('.', ''),
        disabled,
      });
    }
    return list;
  }, [selectedYear, dateFnsLocale, minDate, maxDate]);

  // Generate years for year grid (from 1970 to 2050)
  const yearsList = useMemo(() => {
    const minYear = minDate ? minDate.getFullYear() : 1970;
    const maxYear = maxDate ? maxDate.getFullYear() : 2050;
    const list: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      list.push(y);
    }
    return list;
  }, [minDate, maxDate]);

  const handleSelectMonth = (monthIndex: number) => {
    const updated = setMonth(setYear(new Date(currentDate), selectedYear), monthIndex);
    onSelect(updated);
    onClose();
  };

  const handleGoToday = () => {
    const today = new Date();
    onSelect(today);
    onClose();
  };

  if (!visible) return null;

  const currentRealYear = new Date().getFullYear();
  const currentRealMonth = new Date().getMonth();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
                {t('calendar.select_month_year', { defaultValue: 'Seleccionar mes y año' })}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          {/* Year selector row */}
          <View style={[styles.yearNavRow, { borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable
                onPress={() => setSelectedYear((y) => y - 5)}
                hitSlop={6}
                style={[styles.navBtnSmall, { backgroundColor: theme.dark ? '#262626' : '#F0F0F0' }]}
                accessibilityLabel="-5 años"
              >
                <ChevronsLeft size={16} color={theme.colors.foreground} />
              </Pressable>
              <Pressable
                onPress={() => setSelectedYear((y) => y - 1)}
                hitSlop={6}
                style={[styles.navBtnSmall, { backgroundColor: theme.dark ? '#262626' : '#F0F0F0' }]}
                accessibilityLabel="Año anterior"
              >
                <ChevronLeft size={16} color={theme.colors.foreground} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => setShowYearGrid(!showYearGrid)}
              style={[
                styles.yearPill,
                {
                  backgroundColor: showYearGrid
                    ? (theme.dark ? '#332810' : '#FDF4DC')
                    : (theme.dark ? '#222222' : '#F3F3F3'),
                  borderColor: showYearGrid ? gold[400] : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.yearPillText,
                  { color: showYearGrid ? gold[400] : theme.colors.foreground },
                ]}
              >
                {selectedYear}
              </Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Pressable
                onPress={() => setSelectedYear((y) => y + 1)}
                hitSlop={6}
                style={[styles.navBtnSmall, { backgroundColor: theme.dark ? '#262626' : '#F0F0F0' }]}
                accessibilityLabel="Año siguiente"
              >
                <ChevronRight size={16} color={theme.colors.foreground} />
              </Pressable>
              <Pressable
                onPress={() => setSelectedYear((y) => y + 5)}
                hitSlop={6}
                style={[styles.navBtnSmall, { backgroundColor: theme.dark ? '#262626' : '#F0F0F0' }]}
                accessibilityLabel="+5 años"
              >
                <ChevronsRight size={16} color={theme.colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Body: Year Grid or Months Grid */}
          {showYearGrid ? (
            <View style={{ height: 210 }}>
              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.yearsGrid}
              >
                {yearsList.map((y) => {
                  const isSel = y === selectedYear;
                  const isCur = y === currentRealYear;
                  return (
                    <Pressable
                      key={y}
                      onPress={() => {
                        setSelectedYear(y);
                        setShowYearGrid(false);
                      }}
                      style={[
                        styles.yearCell,
                        isSel && { backgroundColor: gold[400], borderColor: gold[400] },
                        !isSel && isCur && { borderColor: gold[400], borderWidth: 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.yearCellText,
                          { color: isSel ? '#000000' : theme.colors.foreground },
                        ]}
                      >
                        {y}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.monthsGrid}>
              {months.map((m) => {
                const isSelected =
                  m.index === initialMonth && selectedYear === initialYear;
                const isCurrentReal =
                  m.index === currentRealMonth && selectedYear === currentRealYear;

                return (
                  <Pressable
                    key={m.index}
                    onPress={() => handleSelectMonth(m.index)}
                    disabled={m.disabled}
                    style={[
                      styles.monthCell,
                      {
                        backgroundColor: isSelected
                          ? gold[400]
                          : theme.dark
                          ? '#222222'
                          : '#F5F5F5',
                        borderColor: isSelected
                          ? gold[400]
                          : isCurrentReal
                          ? gold[400]
                          : 'transparent',
                        borderWidth: isCurrentReal && !isSelected ? 1.5 : 0,
                        opacity: m.disabled ? 0.3 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthCellText,
                        {
                          color: isSelected ? '#000000' : theme.colors.foreground,
                          fontWeight: isSelected || isCurrentReal ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {m.shortName}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Footer: Quick Jump to Today / Current Month */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={handleGoToday}
              style={[styles.todayBtn, { borderColor: theme.colors.border }]}
            >
              <Text style={{ color: gold[400], fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
                {t('common.today', { defaultValue: 'Hoy / Mes actual' })}
              </Text>
            </Pressable>
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
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
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
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  closeBtn: {
    padding: 4,
  },
  yearNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  yearPillText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  monthCell: {
    width: '23%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCellText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  yearCell: {
    width: '23%',
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCellText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  footerRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  todayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});


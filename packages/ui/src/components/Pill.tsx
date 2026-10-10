/**
 * Pill — status badge (gold / neutral / warning)
 * UrgencyChip — deadline-aware pill that auto-picks variant:
 *   >7 days → gold neutral
 *   2-7 days → warning soft
 *   ≤1 day   → warning strong
 *   expired  → muted
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, amber, dark } from '../tokens/colors';
import { useTheme } from '../theme/useTheme';
import { differenceInCalendarDays, isPast } from 'date-fns';

// ── Pill ──────────────────────────────────────────────────────────────────────

export type PillVariant = 'gold' | 'neutral' | 'warning' | 'warning-strong' | 'muted' | 'outline-gold';

interface PillProps {
  label: string;
  variant?: PillVariant;
  style?: ViewStyle;
}

export function Pill({ label, variant = 'neutral', style }: PillProps) {
  const { theme } = useTheme();

  const colors = getPillColors(variant, theme);

  return (
    <View style={[styles.pill, { backgroundColor: colors.bg, borderColor: colors.border }, style]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function getPillColors(
  variant: PillVariant,
  theme: { colors: { foregroundSubtle: string; border: string; foregroundMuted: string } }
) {
  switch (variant) {
    case 'gold':
      return { bg: '#201B0E', border: '#5A4A1C', text: gold[400] };
    case 'outline-gold':
      return { bg: 'transparent', border: '#D4B13A', text: '#D4B13A' };
    case 'warning':
      return { bg: amber[900], border: amber[100], text: amber[500] };
    case 'warning-strong':
      return { bg: '#3A1A00', border: '#8B4A00', text: '#FF9A3C' };
    case 'muted':
      return { bg: 'transparent', border: theme.colors.border, text: theme.colors.foregroundSubtle };
    case 'neutral':
    default:
      return { bg: dark[300], border: dark[400], text: dark[800] };
  }
}

// ── UrgencyChip ───────────────────────────────────────────────────────────────

interface UrgencyChipProps {
  deadline: Date | string | null | undefined;
  style?: ViewStyle;
}

export function UrgencyChip({ deadline, style }: UrgencyChipProps) {
  if (!deadline) return null;

  const date = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const daysLeft = differenceInCalendarDays(date, new Date());
  const expired = daysLeft < 0; // if it's in the past and calendar difference < 0

  let label: string;
  let variant: PillVariant;

  if (expired) {
    return null; // Expired tasks don't show the badge in this design
  } else if (daysLeft <= 1) {
    label = daysLeft === 0 ? 'Hoy' : 'Mañana';
  } else {
    label = `${daysLeft} días`;
  }
  variant = 'outline-gold';

  return <Pill label={label} variant={variant} style={style} />;
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
});

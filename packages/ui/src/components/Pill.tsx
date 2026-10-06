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
import { differenceInDays, isPast } from 'date-fns';

// ── Pill ──────────────────────────────────────────────────────────────────────

export type PillVariant = 'gold' | 'neutral' | 'warning' | 'warning-strong' | 'muted';

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
  const daysLeft = differenceInDays(date, new Date());
  const expired = isPast(date) && daysLeft < 0;

  let label: string;
  let variant: PillVariant;

  if (expired) {
    const daysAgo = Math.abs(daysLeft);
    label = daysAgo === 1 ? 'Ayer' : `Hace ${daysAgo} días`;
    variant = 'muted';
  } else if (daysLeft <= 1) {
    label = daysLeft === 0 ? 'Hoy' : 'Mañana';
    variant = 'warning-strong';
  } else if (daysLeft <= 7) {
    label = `${daysLeft} días`;
    variant = 'warning';
  } else {
    label = `${daysLeft} días`;
    variant = 'gold';
  }

  return <Pill label={label} variant={variant} style={style} />;
}

const styles = StyleSheet.create({
  pill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    letterSpacing: 0.2,
  },
});

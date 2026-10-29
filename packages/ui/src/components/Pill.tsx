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
import { useTranslation } from '@bucketlist/shared';
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
  theme: any,
) {
  const isDark = theme.dark;
  switch (variant) {
    case 'gold':
      return {
        bg: isDark ? '#201B0E' : 'rgba(212, 175, 55, 0.12)',
        border: isDark ? '#5A4A1C' : 'rgba(212, 175, 55, 0.4)',
        text: theme.colors.primary,
      };
    case 'outline-gold':
      return { bg: 'transparent', border: theme.colors.primary, text: theme.colors.primary };
    case 'warning':
      return { bg: isDark ? amber[900] : 'rgba(245, 158, 11, 0.15)', border: isDark ? amber[500] : '#D97706', text: isDark ? amber[500] : '#B45309' };
    case 'warning-strong':
      return { bg: isDark ? '#3A1A00' : 'rgba(239, 68, 68, 0.15)', border: isDark ? '#8B4A00' : '#EF4444', text: isDark ? '#FF9A3C' : '#DC2626' };
    case 'muted':
      return { bg: 'transparent', border: theme.colors.border, text: theme.colors.foregroundSubtle };
    case 'neutral':
    default:
      return {
        bg: isDark ? dark[300] : theme.colors.surfaceSunken,
        border: theme.colors.border,
        text: theme.colors.foregroundMuted,
      };
  }
}

// ── UrgencyChip ───────────────────────────────────────────────────────────────

interface UrgencyChipProps {
  deadline: Date | string | null | undefined;
  style?: ViewStyle;
}

export function UrgencyChip({ deadline, style }: UrgencyChipProps) {
  const { t } = useTranslation();
  if (!deadline) return null;

  const date = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const daysLeft = differenceInCalendarDays(date, new Date());
  const expired = daysLeft < 0; // if it's in the past and calendar difference < 0

  let label: string;
  const variant: PillVariant = 'outline-gold';

  if (expired) {
    return null; // Expired tasks don't show the badge in this design
  } else if (daysLeft <= 1) {
    label = daysLeft === 0 ? t('common.today', { defaultValue: 'Hoy' }) : t('common.tomorrow', { defaultValue: 'Mañana' });
  } else {
    label = t('common.days_remaining', { count: daysLeft, defaultValue: `${daysLeft} días` });
  }

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

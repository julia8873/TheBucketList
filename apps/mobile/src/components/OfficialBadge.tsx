import { useTranslation } from '@bucketlist/shared';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, ShieldCheck, Sparkles } from 'lucide-react-native';
import { fontFamily } from '@bucketlist/ui';

interface OfficialBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  style?: any;
}

export function OfficialBadge({
  label: customLabel,
  size = 'sm',
  showLabel = false,
  
  style,
}: OfficialBadgeProps) {
  const { t } = useTranslation();
  const label = customLabel ?? t('common.official', { defaultValue: 'Oficial' });
  const iconSize = size === 'xs' ? 9 : size === 'sm' ? 11 : size === 'md' ? 13 : 15;
  const badgeSize = size === 'xs' ? 14 : size === 'sm' ? 17 : size === 'md' ? 20 : 24;

  if (showLabel) {
    return (
      <View style={[styles.pillBadge, style]}>
        <View style={[styles.circleBadge, { width: badgeSize - 2, height: badgeSize - 2, borderRadius: (badgeSize - 2) / 2 }]}>
          <Check size={iconSize - 2} color="#0D0D0D" strokeWidth={3.8} />
        </View>
        <Text style={styles.pillText}>{label}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.circleBadge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
        },
        style,
      ]}
      accessibilityLabel={t('common.verified_official_account', { defaultValue: 'Cuenta Oficial Verificada' })}
    >
      <Check size={iconSize} color="#0D0D0D" strokeWidth={3.8} />
    </View>
  );
}

/**
 * Función auxiliar para verificar si un perfil u objeto de usuario es admin/oficial
 */
export function isUserAdmin(userOrProfile?: any): boolean {
  if (!userOrProfile) return false;
  return (
    userOrProfile.role === 'admin' ||
    userOrProfile.username?.toLowerCase() === 'juliamiralles8873'
  );
}

const styles = StyleSheet.create({
  circleBadge: {
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 2,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillText: {
    color: '#D4AF37',
    fontSize: 11,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.3,
  },
});

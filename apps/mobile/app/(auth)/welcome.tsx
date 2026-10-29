import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, fontFamily } from '@bucketlist/ui';
import { PillButton, OutlinePillButton } from '../../src/components/auth/AuthParts';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.logo, { color: theme.colors.foreground }]} accessibilityRole="header">
          The<Text style={{ color: theme.colors.primary }}>Bucket</Text>List
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.foreground }]}>
          {t('auth.subtitle')}
        </Text>
        <Text style={[styles.slogan, { color: theme.colors.foregroundMuted }]}>
          “{t('auth.slogan')}”
        </Text>
      </View>

      <View style={styles.footer}>
        <PillButton title={t('auth.create_account_link')} onPress={() => router.push('/(auth)/register')} />
        <OutlinePillButton title={t('auth.have_account_btn')} onPress={() => router.push('/(auth)/login')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6] },
  logo: { fontFamily: fontFamily.serifBold, fontSize: 40, letterSpacing: -0.5 },
  slogan: { fontFamily: fontFamily.regular, fontStyle: 'italic', fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: spacing[3], maxWidth: 320 },
  footer: { paddingHorizontal: spacing[3], paddingBottom: Platform.OS === 'ios' ? 58 : 52, gap: spacing[3] },
});

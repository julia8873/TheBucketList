import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, Button, spacing, useTheme } from '@bucketlist/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.primary }]} />
        
        <Typography variant="h1" align="center" style={styles.title}>
          {t('auth.welcome_title')}
        </Typography>
        <Typography variant="body" align="center" color="textSecondary" style={styles.subtitle}>
          {t('auth.welcome_subtitle')}
        </Typography>
      </View>

      <View style={styles.footer}>
        <Button 
          size="lg" 
          onPress={() => router.push('/(auth)/register')}
          style={styles.button}
          title={t('auth.sign_up')}
        />
        <Button 
          variant="secondary" 
          size="lg" 
          onPress={() => router.push('/(auth)/login')}
          style={styles.button}
          title={t('auth.sign_in')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[8] },
  logoPlaceholder: { width: 80, height: 80, borderRadius: 24, marginBottom: spacing[6] },
  title: { marginBottom: spacing[4] },
  subtitle: { marginBottom: spacing[12], paddingHorizontal: spacing[4] },
  footer: { padding: spacing[6], gap: spacing[4] },
  button: { width: '100%' },
});

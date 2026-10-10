import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, radii, fontFamily } from '@bucketlist/ui';
import { useAuthStore } from '../../src/stores/auth.store';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { initialsOfUsername } from '../../src/utils/authErrors';
import { BigAvatar, PillButton } from '../../src/components/auth/AuthParts';

export default function DoneScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { username, avatarUrl, bio, reset } = useOnboardingStore();
  const initials = initialsOfUsername(username);

  const start = () => {
    reset();
    router.replace('/(tabs)/feed');
    router.push('/add-task');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <BigAvatar uri={avatarUrl} initials={initials} size={110} />
        <Text style={[styles.title, { color: theme.colors.foreground }]}>
          {t('onboarding.done_title', { u: username })}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.foregroundSubtle }]}>{t('onboarding.done_subtitle')}</Text>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardHead}>
            <BigAvatar uri={avatarUrl} initials={initials} size={38} />
            <View>
              <Text style={[styles.cardName, { color: theme.colors.foreground }]}>@{username}</Text>
              <Text style={[styles.cardEmail, { color: theme.colors.foregroundSubtle }]}>{user?.email}</Text>
            </View>
          </View>
          {bio ? <Text style={[styles.cardBio, { color: theme.colors.foregroundMuted }]}>{bio}</Text> : null}
        </View>
      </View>

      <View style={styles.footer}>
        <PillButton title={t('onboarding.first_task')} onPress={start} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[5], gap: spacing[2] },
  title: { fontFamily: fontFamily.serifBold, fontSize: 26, marginTop: spacing[4], textAlign: 'center' },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 13, textAlign: 'center', marginBottom: spacing[4] },
  card: { alignSelf: 'stretch', borderWidth: 1, borderRadius: radii.xl, padding: spacing[4], gap: spacing[3] },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  cardName: { fontFamily: fontFamily.semibold, fontSize: 14 },
  cardEmail: { fontFamily: fontFamily.regular, fontSize: 12 },
  cardBio: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  footer: { padding: spacing[5] },
});

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, fontFamily } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { uploadAvatar } from '../../src/services/api/avatar';
import { useAuthStore } from '../../src/stores/auth.store';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { initialsOfUsername } from '../../src/utils/authErrors';
import { AuthScreen, BigAvatar, PillButton, TextAction } from '../../src/components/auth/AuthParts';

export default function PhotoScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { username, setAvatarUrl } = useOnboardingStore();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalUri(result.assets[0].uri);
      setError(null);
    }
  };

  const next = () => router.push('/(onboarding)/bio');

  const save = async () => {
    if (!localUri || !user) return;
    setSaving(true);
    setError(null);
    try {
      const url = await uploadAvatar(user.id, localUri);
      const { error: err } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
      if (err) throw err;
      setAvatarUrl(url);
      next();
    } catch {
      setError(t('onboarding.err_photo'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthScreen
      title={t('onboarding.photo_title')}
      subtitle={t('onboarding.photo_subtitle')}
      progress={2 / 3}
      onBack={() => router.back()}
      footer={
        <>
          {localUri ? (
            <PillButton title={t('auth.continue')} onPress={() => void save()} loading={saving} />
          ) : (
            <PillButton title={t('onboarding.pick_photo')} onPress={() => void pick()} />
          )}
          {localUri ? (
            <TextAction title={t('onboarding.change_photo')} onPress={() => void pick()} disabled={saving} />
          ) : (
            <TextAction title={t('onboarding.not_now')} onPress={next} />
          )}
        </>
      }
    >
      <View style={styles.center}>
        <Pressable onPress={() => void pick()} accessibilityRole="button" accessibilityLabel={t('onboarding.pick_photo')}>
          <BigAvatar
            uri={localUri}
            initials={initialsOfUsername(username)}
            badge={
              <View style={[styles.badge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
                <Camera size={14} color={theme.colors.primaryForeground} strokeWidth={2} />
              </View>
            }
          />
        </Pressable>
        <Text style={[styles.handle, { color: theme.colors.foreground }]}>@{username}</Text>
        <Text style={[styles.hint, { color: error ? theme.colors.error : theme.colors.foregroundSubtle }]}>
          {error ?? (localUri ? ' ' : t('onboarding.photo_none'))}
        </Text>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing[2], paddingTop: spacing[4] },
  badge: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  handle: { fontFamily: fontFamily.serifBold, fontSize: 17, marginTop: spacing[3] },
  hint: { fontFamily: fontFamily.regular, fontSize: 12 },
});

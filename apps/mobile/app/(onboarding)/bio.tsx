import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, radii, fontFamily } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { AuthScreen, AuthInput, PillButton, TextAction } from '../../src/components/auth/AuthParts';

const MAX = 120;

export default function BioScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, setOnboardingCompleted } = useAuthStore();
  const { bio, setBio } = useOnboardingStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = [t('onboarding.sug1'), t('onboarding.sug2'), t('onboarding.sug3')];

  /** Guarda la bio (si se pide) y marca el onboarding como completado. */
  const finish = async (withBio: boolean) => {
    if (!user || saving) return;
    setSaving(true);
    setError(null);
    const patch = withBio
      ? { bio: bio.trim() || null, onboarding_completed: true }
      : { onboarding_completed: true };
    const { error: err } = await supabase.from('profiles').update(patch).eq('id', user.id);
    setSaving(false);
    if (err) { setError(t('auth.err_generic')); return; }
    if (!withBio) setBio('');
    setOnboardingCompleted(true);
    router.replace('/(onboarding)/done');
  };

  return (
    <AuthScreen
      title={t('onboarding.bio_title')}
      subtitle={t('onboarding.bio_subtitle')}
      progress={1}
      onBack={() => router.back()}
      footer={
        <>
          <PillButton title={t('onboarding.finish')} onPress={() => void finish(true)} loading={saving} />
          <TextAction title={t('onboarding.not_now')} onPress={() => void finish(false)} disabled={saving} />
        </>
      }
    >
      <View>
        <AuthInput
          label={t('onboarding.bio_label')}
          placeholder={t('onboarding.bio_placeholder')}
          value={bio}
          onChangeText={(v) => { setBio(v.slice(0, MAX)); setError(null); }}
          maxLength={MAX}
          multiline
          autoCapitalize="sentences"
          autoCorrect
          error={error}
        />
        <Text style={[styles.counter, { color: theme.colors.foregroundSubtle }]}>{bio.length}/{MAX}</Text>
      </View>

      <View style={styles.chips}>
        {suggestions.map((sug) => (
          <Pressable
            key={sug}
            onPress={() => setBio(sug.slice(0, MAX))}
            accessibilityRole="button"
            style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Text style={[styles.chipText, { color: theme.colors.foreground }]}>{sug}</Text>
          </Pressable>
        ))}
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  counter: { alignSelf: 'flex-end', fontFamily: fontFamily.regular, fontSize: 11, marginTop: spacing[1] },
  chips: { alignItems: 'flex-start', gap: spacing[2] },
  chip: { borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  chipText: { fontFamily: fontFamily.regular, fontSize: 13 },
});

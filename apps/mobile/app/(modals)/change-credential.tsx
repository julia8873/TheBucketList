import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { fontFamily, useTheme } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';

/** Cambiar correo o contraseña. ?type=email | password */
export default function ChangeCredentialScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const isEmail = type === 'email';

  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const passValid = value.length >= 8 && value === confirm;
  const canSubmit = isEmail ? emailValid && value.trim() !== user?.email : passValid;

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    const { error: err } = isEmail
      ? await supabase.auth.updateUser({ email: value.trim() })
      : await supabase.auth.updateUser({ password: value });
    setLoading(false);
    if (err) setError(err.message);
    else setDone(true);
  };

  const inputStyle = [styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }];
  const label = (text: string) => (
    <Text style={[styles.label, { color: theme.colors.foreground }]}>
      <Text style={{ color: theme.colors.primary }}>{text.split(' ')[0]}</Text>
      {text.includes(' ') ? ` ${text.split(' ').slice(1).join(' ')}` : ''}
    </Text>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
            style={[styles.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <ChevronLeft size={22} color={theme.colors.foreground} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>
            {isEmail ? t('settings.change_email') : t('settings.change_password')}
          </Text>
        </View>

        <View style={styles.body}>
          {done ? (
            <Text style={[styles.info, { color: theme.colors.foreground }]}>
              {isEmail ? t('settings.email_confirm_sent') : t('settings.password_updated')}
            </Text>
          ) : (
            <>
              {label(isEmail ? t('settings.new_email') : t('settings.new_password'))}
              <TextInput
                value={value}
                onChangeText={setValue}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!isEmail}
                keyboardType={isEmail ? 'email-address' : 'default'}
                placeholder={isEmail ? 'tu@correo.com' : t('settings.min_chars')}
                placeholderTextColor={theme.colors.foregroundSubtle}
                style={inputStyle}
              />
              {!isEmail ? (
                <>
                  {label(t('settings.repeat_password'))}
                  <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    autoCapitalize="none"
                    secureTextEntry
                    placeholder={t('settings.repeat_password')}
                    placeholderTextColor={theme.colors.foregroundSubtle}
                    style={inputStyle}
                  />
                  {confirm.length > 0 && confirm !== value ? (
                    <Text style={[styles.err, { color: theme.colors.error }]}>{t('settings.passwords_dont_match')}</Text>
                  ) : null}
                </>
              ) : null}
              {error ? <Text style={[styles.err, { color: theme.colors.error }]}>{error}</Text> : null}
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={done ? () => router.back() : () => void submit()}
            disabled={!done && (!canSubmit || loading)}
            accessibilityRole="button"
            style={[styles.cta, { backgroundColor: theme.colors.primary, opacity: done || canSubmit ? 1 : 0.4 }]}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <Text style={[styles.ctaText, { color: theme.colors.primaryForeground }]}>
                {done ? t('common.done', { defaultValue: 'Listo' }) : t('settings.update')}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.serifBold, fontSize: 26, flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  label: { fontFamily: fontFamily.serifBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
  input: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontFamily: fontFamily.regular, fontSize: 16 },
  err: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 8 },
  info: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  footer: { paddingHorizontal: 20, paddingBottom: 16 },
  cta: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fontFamily.semibold, fontSize: 17 },
});

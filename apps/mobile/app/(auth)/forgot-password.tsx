import React, { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { useTheme, fontFamily } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { mapAuthError, EMAIL_RE } from '../../src/utils/authErrors';
import { AuthScreen, AuthInput, PillButton } from '../../src/components/auth/AuthParts';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async () => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) { setError(t('auth.err_email_invalid')); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: Linking.createURL('reset-password'),
    });
    setLoading(false);
    if (err) setError(mapAuthError(err.message, t));
    else setSentTo(clean);
  };

  return (
    <AuthScreen
      title={t('auth.forgot_title')}
      subtitle={t('auth.forgot_subtitle')}
      onBack={() => router.back()}
      footer={
        sentTo ? (
          <PillButton title={t('auth.go_login')} onPress={() => router.replace('/(auth)/login')} />
        ) : (
          <PillButton title={t('auth.send_link')} onPress={() => void submit()} loading={loading} disabled={!email.trim()} />
        )
      }
    >
      {sentTo ? (
        <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>
          {t('auth.forgot_sent', { email: sentTo })}
        </Text>
      ) : (
        <AuthInput
          label={t('auth.email_label')}
          placeholder="tu@correo.com"
          value={email}
          onChangeText={(v) => { setEmail(v); setError(null); }}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          error={error}
        />
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
});

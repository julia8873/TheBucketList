import React, { useRef, useState } from 'react';
import { Text, StyleSheet, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { useTheme, fontFamily } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';
import { mapAuthError, EMAIL_RE } from '../../src/utils/authErrors';
import {
  AuthScreen, AuthInput, PillButton, GoogleButton, OrDivider, SwitchLink,
} from '../../src/components/auth/AuthParts';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const google = useGoogleAuth((msg) => setError(mapAuthError(msg, t)));
  const canSubmit = email.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!canSubmit || loading) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) { setError(t('auth.err_email_invalid')); return; }
    if (password.length < 8) { setError(t('auth.err_password_short')); return; }

    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: Linking.createURL('login') },
      });
      if (err) throw err;

      if (data.session) return; // sin confirmación de correo: el RootNavigator lleva al onboarding
      // Con confirmación activa, un correo ya registrado devuelve identities vacías (sin error)
      if (data.user && data.user.identities?.length === 0) throw new Error('User already registered');
      setSentTo(cleanEmail);
    } catch (e) {
      setError(mapAuthError((e as Error)?.message, t));
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <AuthScreen
        title={t('auth.check_email_title')}
        footer={<PillButton title={t('auth.go_login')} onPress={() => router.replace('/(auth)/login')} />}
      >
        <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>
          {t('auth.check_email_body', { email: sentTo })}
        </Text>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title={t('auth.register_title')}
      subtitle={t('auth.register_subtitle')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      footer={
        <>
          <PillButton title={t('auth.continue')} onPress={() => void submit()} loading={loading} disabled={!canSubmit} />
          <OrDivider />
          <GoogleButton title={t('auth.google_signup')} onPress={google.start} disabled={!google.ready} loading={google.loading} />
          <SwitchLink
            prompt={t('auth.already_have')}
            action={t('auth.enter')}
            onPress={() => router.replace('/(auth)/login')}
          />
        </>
      }
    >
      <AuthInput
        label={t('auth.email_label')}
        placeholder="tu@correo.com"
        value={email}
        onChangeText={(v) => { setEmail(v); setError(null); }}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <AuthInput
        ref={passwordRef}
        label={t('auth.password')}
        placeholder={t('auth.password_min')}
        value={password}
        onChangeText={(v) => { setPassword(v); setError(null); }}
        password
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        error={error}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
});

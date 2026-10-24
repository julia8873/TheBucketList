import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Keyboard, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, fontFamily, Alert } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { mapAuthError } from '../../src/utils/authErrors';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';
import { afterBrowserReturn } from '../../src/utils/afterBrowserReturn';
import {
  AuthScreen, AuthInput, PillButton, GoogleButton, OrDivider, SwitchLink,
} from '../../src/components/auth/AuthParts';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const passwordRef = useRef<TextInput>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth('login');

  const canSubmit = identifier.trim().length > 0 && password.length > 0;

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const id = identifier.trim();
      if (id.includes('@')) {
        const { error: err } = await supabase.auth.signInWithPassword({ email: id.toLowerCase(), password });
        if (err) throw err;
      } else {
        // Login con nombre de usuario: resolver vía RPC a auth.users
        const { data: email, error: rpcErr } = await (supabase.rpc as any)('get_email_by_username', {
          p_username: id,
        });

        if (email) {
          const { error: err } = await supabase.auth.signInWithPassword({ email, password });
          if (err) throw err;
        } else {
          try {
            const { data, error: fnErr } = await supabase.functions.invoke('login-with-username', {
              body: { identifier: id, password },
            });
            if (fnErr || !data?.session) {
              throw new Error('Invalid login credentials');
            }
            const { error: sessErr } = await supabase.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
            if (sessErr) throw sessErr;
          } catch {
            throw new Error('Invalid login credentials');
          }
        }
      }
      // El RootNavigator redirige en cuanto cambia la sesión.
    } catch (e) {
      setError(mapAuthError((e as Error)?.message, t));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Cerramos el teclado antes de abrir el navegador para que no reaparezca al volver
    Keyboard.dismiss();
    const result = await signInWithGoogle();
    switch (result.type) {
      case 'no_account':
        // No existe cuenta con ese email de Google → preguntar si quiere crear una.
        // Esperamos a que Android termine de re-maquetar tras cerrar el navegador.
        await afterBrowserReturn();
        Alert.alert(
          t('auth.google_no_account_title'),
          t('auth.google_no_account_body', { email: result.email ?? '' }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('auth.create_account_link'),
              onPress: () => router.replace('/(auth)/register'),
            },
          ],
        );
        break;
      case 'error':
        setError(result.errorMessage ?? t('auth.err_generic'));
        break;
      case 'cancelled':
      case 'success':
        // success: el RootNavigator redirige automáticamente
        break;
    }
  };

  return (
    <AuthScreen
      title={t('auth.login_title')}
      subtitle={t('auth.login_subtitle')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
      footer={
        <>
          <PillButton title={t('auth.enter')} onPress={() => void submit()} loading={loading} disabled={!canSubmit} />
          <OrDivider />
          <GoogleButton
            title={t('auth.google_signin')}
            onPress={() => void handleGoogleLogin()}
            loading={googleLoading}
            disabled={loading}
          />
          <SwitchLink
            prompt={t('auth.new_here')}
            action={t('auth.create_account_link')}
            onPress={() => router.replace('/(auth)/register')}
          />
        </>
      }
    >
      <AuthInput
        label={t('auth.identifier_label')}
        placeholder="tu@correo.com"
        defaultValue=""
        onChangeText={(v) => { setIdentifier(v); setError(null); }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType="username"
        autoComplete="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <AuthInput
        ref={passwordRef}
        label={t('auth.password')}
        placeholder={t('auth.password_placeholder')}
        defaultValue=""
        onChangeText={(v) => { setPassword(v); setError(null); }}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        password
        textContentType="password"
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        error={error}
      />
      <View style={styles.forgotRow}>
        <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8} accessibilityRole="link">
          <Text style={[styles.forgot, { color: theme.colors.primary }]}>{t('auth.forgot_password')}</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgotRow: { alignItems: 'flex-end' },
  forgot: { fontFamily: fontFamily.medium, fontSize: 12 },
});

import React, { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { useTheme, fontFamily } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { mapAuthError, EMAIL_RE, USERNAME_RE, sanitizeUsername } from '../../src/utils/authErrors';
import {
  AuthScreen, AuthInput, PillButton, GoogleButton, OrDivider, SwitchLink,
} from '../../src/components/auth/AuthParts';

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<Status>('idle');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<Status>('idle');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const google = useGoogleAuth((msg) => setError(mapAuthError(msg, t)));

  // Comprobación de disponibilidad de nombre de usuario con debounce
  useEffect(() => {
    const clean = sanitizeUsername(username);
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }
    if (!USERNAME_RE.test(clean)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data: isAvail, error: err } = await supabase.rpc('check_username_available', {
        username_to_check: clean,
      });
      if (cancelled) return;
      if (err) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', clean)
          .maybeSingle();
        if (cancelled) return;
        setUsernameStatus(existing ? 'taken' : 'available');
        return;
      }
      setUsernameStatus(isAvail ? 'available' : 'taken');
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  // Comprobación de disponibilidad de correo electrónico con debounce
  useEffect(() => {
    const clean = email.trim().toLowerCase();
    if (!clean) {
      setEmailStatus('idle');
      return;
    }
    if (!EMAIL_RE.test(clean)) {
      setEmailStatus('invalid');
      return;
    }
    setEmailStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data: isAvail, error: err } = await supabase.rpc('check_email_available', {
        email_to_check: clean,
      });
      if (cancelled) return;
      if (err) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', clean)
          .maybeSingle();
        if (cancelled) return;
        setEmailStatus(existing ? 'taken' : 'available');
        return;
      }
      setEmailStatus(isAvail ? 'available' : 'taken');
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email]);

  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = sanitizeUsername(username);
  const hasInputs = cleanUsername.length >= 3 && EMAIL_RE.test(cleanEmail) && password.length >= 8;
  const isBlocked = usernameStatus === 'taken' || emailStatus === 'taken';
  const canSubmit = hasInputs && !isBlocked && !loading;

  const usernameMessage =
    usernameStatus === 'available' ? t('onboarding.username_available', { u: cleanUsername })
    : usernameStatus === 'taken' ? t('onboarding.username_taken', { u: cleanUsername })
    : usernameStatus === 'invalid' ? t('onboarding.username_invalid')
    : usernameStatus === 'checking' ? t('onboarding.checking')
    : null;

  const usernameTone =
    usernameStatus === 'available' ? 'ok'
    : usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'error'
    : 'muted';

  const emailMessage =
    emailStatus === 'available' ? t('auth.email_available')
    : emailStatus === 'taken' ? t('auth.err_exists')
    : emailStatus === 'invalid' && cleanEmail.length > 0 ? t('auth.err_email_invalid')
    : emailStatus === 'checking' ? t('onboarding.checking')
    : null;

  const emailTone =
    emailStatus === 'available' ? 'ok'
    : emailStatus === 'taken' || (emailStatus === 'invalid' && cleanEmail.length > 0) ? 'error'
    : 'muted';

  const submit = async () => {
    if (!canSubmit || loading) return;
    if (!USERNAME_RE.test(cleanUsername)) {
      setError(t('onboarding.username_invalid'));
      return;
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setError(t('auth.err_email_invalid'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.err_password_short'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Comprobar disponibilidad de usuario
      const { data: uAvail, error: uErr } = await supabase.rpc('check_username_available', {
        username_to_check: cleanUsername,
      });
      let isUserTaken = false;
      if (!uErr && typeof uAvail === 'boolean') {
        isUserTaken = !uAvail;
      } else {
        const { data: p } = await supabase.from('profiles').select('id').eq('username', cleanUsername).maybeSingle();
        isUserTaken = !!p;
      }
      if (isUserTaken) {
        setUsernameStatus('taken');
        throw new Error(t('onboarding.username_taken', { u: cleanUsername }));
      }

      // Comprobar disponibilidad de email
      const { data: eAvail, error: eErr } = await supabase.rpc('check_email_available', {
        email_to_check: cleanEmail,
      });
      let isEmailTaken = false;
      if (!eErr && typeof eAvail === 'boolean') {
        isEmailTaken = !eAvail;
      } else {
        const { data: p } = await supabase.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
        isEmailTaken = !!p;
      }
      if (isEmailTaken) {
        setEmailStatus('taken');
        throw new Error(t('auth.err_exists'));
      }

      const { data, error: err } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: cleanUsername,
          },
          emailRedirectTo: Linking.createURL('login'),
        },
      });
      if (err) throw err;

      useOnboardingStore.getState().setUsername(cleanUsername);

      if (data.session) return; // sin confirmación de correo: el RootNavigator lleva a /(tabs)/my-list
      if (data.user && data.user.identities?.length === 0) throw new Error('User already registered');
      setSentTo(cleanEmail);
    } catch (e: any) {
      const msg = e?.message ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered') || (msg.includes('duplicate key') && msg.includes('email'))) {
        setEmailStatus('taken');
        setError(t('auth.err_exists'));
      } else if ((msg.includes('duplicate key') && msg.includes('username')) || msg.includes('ya está en uso')) {
        setUsernameStatus('taken');
        setError(t('onboarding.username_taken', { u: cleanUsername }));
      } else {
        setError(mapAuthError(msg, t));
      }
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
        label={t('onboarding.username_label')}
        prefix="@"
        placeholder="tu_usuario"
        value={username}
        onChangeText={(v) => { setUsername(sanitizeUsername(v)); setError(null); }}
        maxLength={30}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        message={usernameMessage}
        messageTone={usernameTone}
      />
      <AuthInput
        ref={emailRef}
        label={t('auth.email_label')}
        placeholder="tu@correo.com"
        value={email}
        onChangeText={(v) => { setEmail(v.replace(/\s/g, '').toLowerCase()); setError(null); }}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        message={emailMessage}
        messageTone={emailTone}
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

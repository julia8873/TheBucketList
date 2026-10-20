import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { USERNAME_RE, sanitizeUsername } from '../../src/utils/authErrors';
import { AuthScreen, AuthInput, PillButton } from '../../src/components/auth/AuthParts';

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function UsernameScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { username, setUsername } = useOnboardingStore();
  const [status, setStatus] = useState<Status>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sugerencia inicial a partir del correo
  useEffect(() => {
    if (username || !user) return;
    const base = (user.user_metadata?.full_name as string | undefined)?.split(/\s+/).join('.') ?? user.email?.split('@')[0] ?? '';
    setUsername(sanitizeUsername(base).replace(/^\.+|\.+$/g, '').slice(0, 30));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Comprobación de disponibilidad con debounce
  useEffect(() => {
    if (!username) { setStatus('idle'); return; }
    if (!USERNAME_RE.test(username)) { setStatus('invalid'); return; }
    setStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error: err } = await supabase
        .from('profiles').select('id').eq('username', username).maybeSingle();
      if (cancelled) return;
      if (err) { setStatus('idle'); return; }
      setStatus(!data || data.id === user?.id ? 'available' : 'taken');
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [username, user?.id]);

  const submit = async () => {
    if (status !== 'available' || !user || saving) return;
    setSaving(true);
    setError(null);
    const displayName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || username;
    const { error: err } = await supabase.from('profiles').update({ username, display_name: displayName }).eq('id', user.id);
    setSaving(false);
    if (err) {
      if (err.code === '23505') setStatus('taken');
      else setError(t('auth.err_generic'));
      return;
    }
    queryClient.setQueryData(['profile', user.id], (old: any) => ({ ...old, username, display_name: displayName }));
    void queryClient.invalidateQueries({ queryKey: ['profile'] });
    router.push('/(onboarding)/photo');
  };

  const message =
    status === 'available' ? t('onboarding.username_available', { u: username })
    : status === 'taken' ? t('onboarding.username_taken', { u: username })
    : status === 'invalid' ? t('onboarding.username_invalid')
    : status === 'checking' ? t('onboarding.checking')
    : null;

  const cancelRegistration = async () => {
    await supabase.auth.signOut().catch(() => undefined);
    useAuthStore.getState().signOut();
    useOnboardingStore.getState().reset();
    router.replace('/(auth)/welcome');
  };

  return (
    <AuthScreen
      title={t('onboarding.username_title')}
      subtitle={t('onboarding.username_subtitle')}
      progress={1 / 3}
      onBack={cancelRegistration}
      footer={
        <PillButton title={t('auth.continue')} onPress={() => void submit()} loading={saving} disabled={status !== 'available'} />
      }
    >
      <AuthInput
        label={t('onboarding.username_label')}
        prefix="@"
        value={username}
        onChangeText={(v) => { setUsername(sanitizeUsername(v)); setError(null); }}
        maxLength={30}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        message={message}
        messageTone={status === 'available' ? 'ok' : status === 'taken' || status === 'invalid' ? 'error' : 'muted'}
        error={error}
      />
    </AuthScreen>
  );
}

import React, { useRef, useState } from 'react';
import { type TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { mapAuthError } from '../../src/utils/authErrors';
import { AuthScreen, AuthInput, PillButton } from '../../src/components/auth/AuthParts';

/** Se abre desde el enlace del correo (…/reset-password#access_token=…&type=recovery). */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session, setRecovering } = useAuthStore();
  const confirmRef = useRef<TextInput>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!session) { setError(t('auth.err_link_expired')); return; }
    if (password.length < 8) { setError(t('auth.err_password_short')); return; }
    if (password !== confirm) { setError(t('auth.err_mismatch')); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) { setError(mapAuthError(err.message, t)); return; }
    setRecovering(false); // el RootNavigator te lleva a la app
  };

  return (
    <AuthScreen
      title={t('auth.reset_title')}
      subtitle={t('auth.reset_subtitle')}
      onBack={() => { setRecovering(false); void supabase.auth.signOut(); router.replace('/(auth)/login'); }}
      footer={
        <PillButton
          title={t('auth.save_password')}
          onPress={() => void submit()}
          loading={loading}
          disabled={!password || !confirm}
        />
      }
    >
      <AuthInput
        label={t('auth.new_password')}
        placeholder={t('auth.password_min')}
        value={password}
        onChangeText={(v) => { setPassword(v); setError(null); }}
        password
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <AuthInput
        ref={confirmRef}
        label={t('auth.confirm_password')}
        placeholder={t('auth.password_min')}
        value={confirm}
        onChangeText={(v) => { setConfirm(v); setError(null); }}
        password
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        error={error}
      />
    </AuthScreen>
  );
}

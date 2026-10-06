import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, Button, Input, spacing, useTheme, Icon } from '@bucketlist/ui';
import { Chrome, Mail, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/services/supabase';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        supabase.auth.signInWithIdToken({
          provider: 'google',
          token: id_token,
        }).then(({ error }) => {
          if (error) setError(error.message);
        });
      }
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('errors.auth_failed'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        Alert.alert('Error de inicio de sesión', error.message);
        setLoading(false);
      } else {
        router.replace('/(tabs)/feed');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Network error');
      Alert.alert('Error fatal', err.message || 'No se pudo conectar al servidor. Revisa tu conexión o el Firewall de Windows.');
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError(t('errors.auth_failed'));
      return;
    }
    setMagicLinkLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'bucketlist://verify' },
    });
    setMagicLinkLoading(false);
    if (error) {
      setError(error.message);
    } else {
      Alert.alert('Éxito', t('auth.magic_link_sent') || 'Magic link sent!');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Typography variant="h2" style={styles.title}>{t('auth.welcome_title')}</Typography>
            <Typography variant="body" color="textSecondary">
              {t('auth.welcome_subtitle')}
            </Typography>
          </View>

          <View style={styles.form}>
            <Button
              title={t('auth.google')}
              variant="secondary"
              leftIcon={<Icon icon={Chrome} />}
              onPress={() => promptAsync()}
              disabled={!request}
            />

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
              <Typography variant="caption" color="textMuted">{t('common.or')}</Typography>
              <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
            </View>

            <Input
              label={t('auth.email')}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(null); }}
              leftIcon={<Icon icon={Mail} />}
            />
            
            <Input
              label={t('auth.password')}
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={(text) => { setPassword(text); setError(null); }}
              leftIcon={<Icon icon={Lock} />}
            />

            {error && <Typography variant="caption" color="error">{error}</Typography>}

            <Button
              title={t('auth.sign_in')}
              size="lg"
              onPress={() => void handleLogin()}
              loading={loading}
              style={styles.submitBtn}
            />

            <Button
              title={t('auth.magic_link')}
              variant="secondary"
              onPress={() => void handleMagicLink()}
              loading={magicLinkLoading}
            />

            <Button
              title={t('auth.no_account')}
              variant="link"
              onPress={() => router.push('/(auth)/register')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing[6], justifyContent: 'center' },
  header: { marginBottom: spacing[8] },
  title: { marginBottom: spacing[2] },
  form: { gap: spacing[4] },
  submitBtn: { marginTop: spacing[4] },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], marginVertical: spacing[2] },
  line: { flex: 1, height: 1 },
});

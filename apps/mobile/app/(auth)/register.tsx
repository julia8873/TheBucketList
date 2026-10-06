import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, Button, Input, spacing, useTheme, Icon } from '@bucketlist/ui';
import { Chrome, User, Mail, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/services/supabase';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      setError(t('errors.auth_failed'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: fullName, // map to display_name in profile
          },
        },
      });

      if (error) {
        setError(error.message);
        Alert.alert('Error de registro', error.message);
        setLoading(false);
      } else {
        setLoading(false);
        Alert.alert('Registro exitoso', t('auth.check_email_verification') || 'Account created! Check your email to verify.');
        router.push('/(auth)/login');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Network error');
      Alert.alert('Error fatal', err.message || 'No se pudo conectar al servidor. Revisa tu conexión o el Firewall de Windows.');
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
            <Typography variant="h2" style={styles.title}>{t('auth.sign_up')}</Typography>
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
              label={t('profile.display_name')}
              placeholder="Jane Doe"
              value={fullName}
              onChangeText={(text) => { setFullName(text); setError(null); }}
              leftIcon={<Icon icon={User} />}
            />

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
              title={t('auth.sign_up')}
              size="lg"
              onPress={() => void handleRegister()}
              loading={loading}
              style={styles.submitBtn}
            />

            <Button
              title={t('auth.has_account')}
              variant="link"
              onPress={() => router.push('/(auth)/login')}
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

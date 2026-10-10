import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronLeft, Lock } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Avatar, fontFamily, useTheme } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { OptionDialog } from '../../src/components/SettingsParts';
import { initialsOf } from '../../src/utils/initials';
import { uploadAvatar } from '../../src/services/api/avatar';

const BIO_MAX = 120;
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;

type UsernameState = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [bioFocused, setBioFocused] = useState(false);
  const [usernameState, setUsernameState] = useState<UsernameState>('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (profile && !hydrated) {
      setDisplayName(profile.display_name ?? '');
      setUsername(profile.username ?? '');
      setBio(profile.bio ?? '');
      setAvatarUri(profile.avatar_url ?? null);
      setHydrated(true);
    }
  }, [profile, hydrated]);

  // Disponibilidad del usuario (con debounce)
  useEffect(() => {
    if (!hydrated || !user) return;
    const clean = username.trim().toLowerCase();
    if (clean === profile?.username) { setUsernameState('idle'); return; }
    if (!USERNAME_RE.test(clean)) { setUsernameState('invalid'); return; }
    setUsernameState('checking');
    const id = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', clean).neq('id', user.id).limit(1);
      setUsernameState(data && data.length > 0 ? 'taken' : 'available');
    }, 400);
    return () => clearTimeout(id);
  }, [username, hydrated, profile?.username, user]);

  const dirty = useMemo(
    () =>
      hydrated &&
      (displayName.trim() !== (profile?.display_name ?? '') ||
        username.trim().toLowerCase() !== (profile?.username ?? '') ||
        bio.trim() !== (profile?.bio ?? '') ||
        avatarUri !== (profile?.avatar_url ?? null)),
    [hydrated, displayName, username, bio, avatarUri, profile],
  );

  const usernameOk = usernameState === 'idle' || usernameState === 'available';
  const canSave = dirty && usernameOk && displayName.trim().length > 0 && !saving;

  const [photoMenu, setPhotoMenu] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled && result.assets[0]) {
        setError(null);
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      setError(t('profile.photo_permission'));
    }
  };

  const onPhotoOption = (key: 'gallery' | 'remove') => {
    if (key === 'remove') {
      setAvatarUri(null);
    } else {
      // Deja que el diálogo se cierre antes de abrir la galería
      setTimeout(() => void pickImage(), 250);
    }
  };

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      // null = foto quitada; http = la actual sin cambios; ruta local = foto nueva
      let finalAvatarUrl: string | null = avatarUri && avatarUri.startsWith('http') ? avatarUri : null;

      // Foto nueva (ruta local, no http)
      if (avatarUri && !avatarUri.startsWith('http')) {
        finalAvatarUrl = await uploadAvatar(user.id, avatarUri);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          username: username.trim().toLowerCase(),
          bio: bio.trim(),
          avatar_url: finalAvatarUrl,
        })
        .eq('id', user.id);

      if (updateError) {
        if ((updateError as any).code === '23505') {
          setUsernameState('taken');
          throw new Error(t('errors.username_taken'));
        }
        throw updateError;
      }

      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      router.back();
    } catch (err: any) {
      setError(err?.message || t('profile.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = [styles.field, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }];
  const Label = ({ gold, rest }: { gold: string; rest?: string }) => (
    <Text style={[styles.label, { color: theme.colors.foreground }]}>
      <Text style={{ color: theme.colors.primary }}>{gold}</Text>
      {rest ? ` ${rest}` : ''}
    </Text>
  );

  const statusText =
    usernameState === 'available' ? { text: t('profile.available'), color: theme.colors.primary }
      : usernameState === 'taken' ? { text: t('errors.username_taken'), color: theme.colors.error }
        : usernameState === 'invalid' ? { text: t('profile.username_invalid'), color: theme.colors.error }
          : null;

  if (isLoading || !hydrated) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

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
          <Text style={[styles.title, { color: theme.colors.foreground }]}>{t('profile.edit')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <Pressable onPress={() => setPhotoMenu(true)} accessibilityRole="button" accessibilityLabel={t('profile.change_photo')}>
              <Avatar
                uri={avatarUri}
                initials={initialsOf({ display_name: displayName, username })}
                size="xl"
                goldRing
              />
              <View style={[styles.camera, { backgroundColor: theme.colors.primary }]}>
                <Camera size={18} color={theme.colors.primaryForeground} />
              </View>
            </Pressable>
            <Pressable onPress={() => setPhotoMenu(true)} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.changePhoto, { color: theme.colors.primary }]}>{t('profile.change_photo')}</Text>
            </Pressable>
          </View>

          <Label gold={t('profile.display_name')} />
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={40}
            placeholderTextColor={theme.colors.foregroundSubtle}
            style={[fieldStyle, styles.input, { color: theme.colors.foreground }]}
          />

          <Label gold={t('profile.username_a')} rest={t('profile.username_b')} />
          <View style={[fieldStyle, styles.usernameRow]}>
            <Text style={[styles.input, { color: theme.colors.foregroundMuted, paddingHorizontal: 0 }]}>@ </Text>
            <TextInput
              value={username}
              onChangeText={(v) => setUsername(v.replace(/\s/g, '').toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              style={[styles.input, { color: theme.colors.foreground, flex: 1, paddingHorizontal: 0 }]}
            />
            {usernameState === 'checking' ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
          </View>
          {statusText ? <Text style={[styles.hint, { color: statusText.color }]}>{statusText.text}</Text> : null}

          <Label gold={t('profile.bio_a')} rest={t('profile.bio_b')} />
          <TextInput
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, BIO_MAX))}
            onFocus={() => setBioFocused(true)}
            onBlur={() => setBioFocused(false)}
            multiline
            textAlignVertical="top"
            placeholder={t('profile.bio_placeholder')}
            placeholderTextColor={theme.colors.foregroundSubtle}
            style={[
              fieldStyle, styles.bio,
              { color: theme.colors.foreground },
              bioFocused && { borderColor: theme.colors.primary },
            ]}
          />
          <Text style={[styles.counter, { color: theme.colors.foregroundMuted }]}>{bio.length}/{BIO_MAX}</Text>

          <Label gold={t('profile.email_a')} rest={t('profile.email_b')} />
          <View style={[fieldStyle, styles.usernameRow, { justifyContent: 'space-between' }]}>
            <Text style={[styles.input, { color: theme.colors.foregroundMuted, paddingHorizontal: 0 }]} numberOfLines={1}>
              {user?.email}
            </Text>
            <Lock size={18} color={theme.colors.foregroundSubtle} />
          </View>

          {error ? <Text style={[styles.hint, { color: theme.colors.error, marginTop: 14 }]}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
          <Pressable
            onPress={() => void handleSave()}
            disabled={!canSave}
            accessibilityRole="button"
            style={[styles.cta, { backgroundColor: theme.colors.primary, opacity: canSave ? 1 : 0.4 }]}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <Text style={[styles.ctaText, { color: theme.colors.primaryForeground }]}>{t('profile.save_changes')}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <OptionDialog<'gallery' | 'remove'>
        visible={photoMenu}
        title={t('profile.photo_options', { defaultValue: 'Foto de perfil' })}
        options={[
          { key: 'gallery', label: t('profile.photo_choose', { defaultValue: 'Elegir de la galería' }) },
          ...(avatarUri ? [{ key: 'remove' as const, label: t('profile.photo_remove', { defaultValue: 'Quitar foto' }), danger: true }] : []),
        ]}
        onSelect={onPhotoOption}
        onClose={() => setPhotoMenu(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fontFamily.serifBold, fontSize: 30 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  avatarSection: { alignItems: 'center', marginTop: 24, gap: 10 },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  changePhoto: { fontFamily: fontFamily.semibold, fontSize: 15, padding: 6 },
  label: { fontFamily: fontFamily.serifBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 22, marginBottom: 8 },
  field: { borderWidth: 1, borderRadius: 16 },
  input: { fontFamily: fontFamily.regular, fontSize: 16, height: 52, paddingHorizontal: 16 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 4 },
  bio: { minHeight: 96, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 23 },
  counter: { textAlign: 'right', fontFamily: fontFamily.regular, fontSize: 13, marginTop: 6 },
  hint: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 6 },
  footer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth },
  cta: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fontFamily.semibold, fontSize: 17 },
});
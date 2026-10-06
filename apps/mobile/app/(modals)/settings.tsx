import React, { useState } from 'react';
import { View, StyleSheet, Switch, Alert, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Typography, useTheme, spacing, Button, Icon, radii } from '@bucketlist/ui';
import { ArrowLeft, LogOut, Trash2, Bell, Moon, Globe, Shield } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { useThemeStore } from '../../src/stores/theme.store';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { override, setOverride } = useThemeStore();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { t, i18n } = useTranslation();
  
  const [deleting, setDeleting] = useState(false);

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'es' ? 'en' : 'es';
    void i18n.changeLanguage(nextLang);
  };

  const toggleDarkMode = () => {
    let nextOverride: 'system' | 'light' | 'dark' = 'system';
    if (override === 'system') nextOverride = 'dark';
    else if (override === 'dark') nextOverride = 'light';
    else nextOverride = 'system';
    setOverride(nextOverride);
  };

  const getDarkModeLabel = () => {
    if (override === 'system') return t('settings.theme_system');
    if (override === 'dark') return t('settings.theme_dark');
    return t('settings.theme_light');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signOut();
    router.replace('/(auth)/welcome');
  };

  const handleDeleteAccount = () => {
    Alert.prompt(
      t('profile.delete_account'),
      t('profile.delete_account_confirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        { 
          text: t('common.confirm'), 
          style: "destructive",
          onPress: async (text) => {
            if (text !== 'ELIMINAR' && text !== 'DELETE') return;
            setDeleting(true);
            try {
              // Delete user via RPC (assuming it exists or will be added)
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;
              
              await signOut();
              router.replace('/(auth)/welcome');
            } catch (e: any) {
              alert(e.message || "Failed to delete account");
            } finally {
              setDeleting(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.back()} style={{ padding: 0, width: 40 }}>
          <Icon icon={ArrowLeft} size={24} color={theme.colors.foreground} />
        </Button>
        <Typography variant="h3" style={{ flex: 1, textAlign: 'center', marginRight: 40 }}>{t('settings.title')}</Typography>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Typography variant="caption" color="textSecondary" style={styles.sectionHeader}>
          {t('settings.title')}
        </Typography>

        <Pressable style={styles.settingRow} onPress={toggleDarkMode}>
          <View style={styles.settingLeft}>
            <Icon icon={Moon} size={20} color={theme.colors.foreground} />
            <Typography variant="body" style={{ marginLeft: spacing[3] }}>{t('settings.theme')}</Typography>
          </View>
          <Typography variant="body" color="textSecondary">{getDarkModeLabel()}</Typography>
        </Pressable>

        <Pressable style={styles.settingRow} onPress={toggleLanguage}>
          <View style={styles.settingLeft}>
            <Icon icon={Globe} size={20} color={theme.colors.foreground} />
            <Typography variant="body" style={{ marginLeft: spacing[3] }}>{t('settings.language')}</Typography>
          </View>
          <Typography variant="body" color="textSecondary">{i18n.language.toUpperCase()}</Typography>
        </Pressable>

        <Pressable style={styles.settingRow} onPress={() => router.push('/(modals)/notification-prefs')}>
          <View style={styles.settingLeft}>
            <Icon icon={Bell} size={20} color={theme.colors.foreground} />
            <Typography variant="body" style={{ marginLeft: spacing[3] }}>{t('settings.notifications')}</Typography>
          </View>
          <Icon icon={ArrowLeft} size={16} color={theme.colors.border} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Icon icon={Shield} size={20} color={theme.colors.foreground} />
            <Typography variant="body" style={{ marginLeft: spacing[3] }}>{t('settings.privacy')}</Typography>
          </View>
          <Typography variant="body" color="textSecondary">{t('bucket.public')}</Typography>
        </View>

        <Typography variant="caption" color="textSecondary" style={[styles.sectionHeader, { marginTop: spacing[8] }]}>
          {t('settings.account')}
        </Typography>

        <Button 
          variant="secondary" 
          leftIcon="LogOut"
          onPress={handleLogout}
          style={styles.actionButton}
          title={t('settings.sign_out')}
        />

        <Button 
          variant="destructive" 
          leftIcon="Trash2"
          onPress={handleDeleteAccount}
          loading={deleting}
          style={styles.actionButton}
          title={t('profile.delete_account')}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingTop: spacing[6], paddingBottom: spacing[4], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
  content: { padding: spacing[4] },
  sectionHeader: { textTransform: 'uppercase', marginBottom: spacing[4] },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing[4], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { marginTop: spacing[4] }
});

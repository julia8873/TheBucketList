import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, useTheme, spacing, Button, Icon, radii, PageTitle } from '@bucketlist/ui';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';

export default function NotificationPrefsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      supabase.from('notification_prefs')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setPrefs(data);
          setLoading(false);
        });
    }
  }, [user]);

  const togglePref = async (key: string) => {
    if (!user || !prefs) return;
    const newValue = !prefs[key];
    setPrefs({ ...prefs, [key]: newValue });
    
    await supabase.from('notification_prefs')
      .update({ [key]: newValue })
      .eq('user_id', user.id);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.dark ? '#222222' : '#cccccc' }]}>
        <Button variant="ghost" size="sm" onPress={() => router.back()} style={{ padding: 0, width: 40 }}>
          <Icon icon={ArrowLeft} size={24} color={theme.dark ? '#FFFFFF' : theme.colors.foreground} />
        </Button>
        <PageTitle style={{ flex: 1, textAlign: 'center', marginRight: 40 }}>Notificaciones</PageTitle>
      </View>

      <View style={styles.content}>
        <Typography 
          variant="caption" 
          color={theme.dark ? '#FFFFFF' : theme.colors.foregroundMuted} 
          style={{ marginBottom: spacing[4], textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Notificaciones Push
        </Typography>

        <View style={[styles.settingRow, { borderBottomColor: theme.dark ? '#222222' : '#eeeeee' }]}>
          <Typography variant="body" color={theme.dark ? '#FFFFFF' : theme.colors.foreground}>Reacciones</Typography>
          <Switch 
            value={prefs?.reactions} 
            onValueChange={() => togglePref('reactions')} 
            trackColor={{ true: theme.colors.primary, false: theme.dark ? '#333' : '#ccc' }}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: theme.dark ? '#222222' : '#eeeeee' }]}>
          <Typography variant="body" color={theme.dark ? '#FFFFFF' : theme.colors.foreground}>Comentarios</Typography>
          <Switch 
            value={prefs?.comments} 
            onValueChange={() => togglePref('comments')} 
            trackColor={{ true: theme.colors.primary, false: theme.dark ? '#333' : '#ccc' }}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: theme.dark ? '#222222' : '#eeeeee' }]}>
          <Typography variant="body" color={theme.dark ? '#FFFFFF' : theme.colors.foreground}>Nuevos seguidores</Typography>
          <Switch 
            value={prefs?.new_followers} 
            onValueChange={() => togglePref('new_followers')} 
            trackColor={{ true: theme.colors.primary, false: theme.dark ? '#333' : '#ccc' }}
          />
        </View>

        <View style={[styles.settingRow, { borderBottomColor: theme.dark ? '#222222' : '#eeeeee' }]}>
          <Typography variant="body" color={theme.dark ? '#FFFFFF' : theme.colors.foreground}>Solicitudes de seguimiento</Typography>
          <Switch 
            value={prefs?.follow_requests} 
            onValueChange={() => togglePref('follow_requests')} 
            trackColor={{ true: theme.colors.primary, false: theme.dark ? '#333' : '#ccc' }}
          />
        </View>
        
        <View style={[styles.settingRow, { borderBottomColor: theme.dark ? '#222222' : '#eeeeee' }]}>
          <Typography variant="body" color={theme.dark ? '#FFFFFF' : theme.colors.foreground}>Fechas límite de tareas</Typography>
          <Switch 
            value={prefs?.deadlines} 
            onValueChange={() => togglePref('deadlines')} 
            trackColor={{ true: theme.colors.primary, false: theme.dark ? '#333' : '#ccc' }}
          />
        </View>

        <Typography 
          variant="caption" 
          color={theme.dark ? '#FFFFFF' : theme.colors.foregroundMuted} 
          style={{ marginTop: spacing[8], marginBottom: spacing[4], textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Horas de silencio
        </Typography>

        <View style={[styles.settingRow, { borderBottomColor: theme.dark ? '#222222' : '#eeeeee' }]}>
          <View>
            <Typography variant="body" color={theme.dark ? '#FFFFFF' : theme.colors.foreground}>Activar horas de silencio</Typography>
            <Typography 
              variant="caption" 
              color={theme.dark ? '#FFFFFF' : theme.colors.foregroundMuted}
              style={{ opacity: theme.dark ? 0.75 : 1 }}
            >
              Pausar notificaciones durante la noche
            </Typography>
          </View>
          <Switch 
            value={prefs?.quiet_hours_enabled} 
            onValueChange={() => togglePref('quiet_hours_enabled')} 
            trackColor={{ true: theme.colors.primary, false: theme.dark ? '#333' : '#ccc' }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = themedStyleSheet({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  content: {
    padding: spacing[4],
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  }
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, useTheme, spacing, Button, Icon, radii } from '@bucketlist/ui';
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
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.back()} style={{ padding: 0, width: 40 }}>
          <Icon icon={ArrowLeft} size={24} color={theme.colors.foreground} />
        </Button>
        <Typography variant="h3" style={{ flex: 1, textAlign: 'center', marginRight: 40 }}>Notifications</Typography>
      </View>

      <View style={styles.content}>
        <Typography variant="caption" color="textSecondary" style={{ marginBottom: spacing[4], textTransform: 'uppercase' }}>
          Push Notifications
        </Typography>

        <View style={styles.settingRow}>
          <Typography variant="body">Reactions</Typography>
          <Switch 
            value={prefs?.reactions} 
            onValueChange={() => togglePref('reactions')} 
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Typography variant="body">Comments</Typography>
          <Switch 
            value={prefs?.comments} 
            onValueChange={() => togglePref('comments')} 
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Typography variant="body">New Followers</Typography>
          <Switch 
            value={prefs?.new_followers} 
            onValueChange={() => togglePref('new_followers')} 
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        <View style={styles.settingRow}>
          <Typography variant="body">Follow Requests</Typography>
          <Switch 
            value={prefs?.follow_requests} 
            onValueChange={() => togglePref('follow_requests')} 
            trackColor={{ true: theme.colors.primary }}
          />
        </View>
        
        <View style={styles.settingRow}>
          <Typography variant="body">Goal Deadlines</Typography>
          <Switch 
            value={prefs?.deadlines} 
            onValueChange={() => togglePref('deadlines')} 
            trackColor={{ true: theme.colors.primary }}
          />
        </View>

        <Typography variant="caption" color="textSecondary" style={{ marginTop: spacing[8], marginBottom: spacing[4], textTransform: 'uppercase' }}>
          Quiet Hours
        </Typography>

        <View style={styles.settingRow}>
          <View>
            <Typography variant="body">Enable Quiet Hours</Typography>
            <Typography variant="caption" color="textSecondary">Pause notifications during night</Typography>
          </View>
          <Switch 
            value={prefs?.quiet_hours_enabled} 
            onValueChange={() => togglePref('quiet_hours_enabled')} 
            trackColor={{ true: theme.colors.primary }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

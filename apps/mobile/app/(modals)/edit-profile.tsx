import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Typography, useTheme, spacing, Avatar, Button, Icon, radii } from '@bucketlist/ui';
import { Camera, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { processBucketImage } from '@bucketlist/shared';
import { useQueryClient } from '@tanstack/react-query';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data);
          setDisplayName(data.display_name || '');
          setUsername(data.username || '');
          setBio(data.bio || '');
          setAvatarUri(data.avatar_url);
        }
      });
    }
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let finalAvatarUrl = profile.avatar_url;

      // If a new avatar was picked (uri doesn't start with http, meaning it's a local file)
      if (avatarUri && !avatarUri.startsWith('http')) {
        const processed = await processBucketImage(avatarUri);
        
        // Fetch as blob
        const res = await fetch(processed.thumbnail.uri); // Avatar just needs thumbnail size
        const blob = await res.blob();
        
        const path = `avatars/${user.id}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
          
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('photos').getPublicUrl(path);
        finalAvatarUrl = data.publicUrl;
      }

      const { error } = await supabase.from('profiles').update({
        display_name: displayName,
        username,
        bio,
        avatar_url: finalAvatarUrl
      }).eq('id', user.id);

      if (error) throw error;
      
      void queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      router.back();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.back()} style={{ padding: 0, width: 40 }}>
          <Icon icon={ArrowLeft} size={24} color={theme.colors.foreground} />
        </Button>
        <Typography variant="h3" style={{ flex: 1, textAlign: 'center' }}>Edit Profile</Typography>
        <Button variant="ghost" size="sm" onPress={handleSave} loading={loading} style={{ width: 60 }}>
          Save
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <Avatar 
            source={avatarUri ? { uri: avatarUri } : undefined} 
            fallback={displayName.charAt(0) || '?'} 
            size="xl" 
          />
          <Button 
            variant="secondary" 
            size="sm" 
            leftIcon={<Icon icon={Camera} size={16} color={theme.colors.foreground} />}
            style={{ marginTop: spacing[4] }}
            onPress={pickImage}
          >
            Change Photo
          </Button>
        </View>

        <View style={styles.formGroup}>
          <Typography variant="label" style={styles.label}>Display Name</Typography>
          <TextInput
            style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="label" style={styles.label}>Username</Typography>
          <TextInput
            style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Typography variant="label" style={styles.label}>Bio</Typography>
          <TextInput
            style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, height: 100 }]}
            value={bio}
            onChangeText={setBio}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing[8],
    marginTop: spacing[4],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[2],
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontSize: 16,
  }
});

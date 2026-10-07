import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography, Button, Input, spacing, useTheme } from '@bucketlist/ui';
import { useCreateAlbum } from '../../src/hooks/useAlbums';

export default function CreateAlbumModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const createAlbum = useCreateAlbum();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');

  const onSubmit = () => {
    if (!title.trim()) return;
    createAlbum.mutate({ title, description, visibility }, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        console.error('Failed to create album:', error);
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Button variant="ghost" onPress={() => router.back()}>Cancelar</Button>
        <Typography variant="h3">Nuevo Álbum</Typography>
        <Button
          variant="primary"
          onPress={onSubmit}
          loading={createAlbum.isPending}
          disabled={!title.trim()}
        >
          Crear
        </Button>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Input
            label="Título"
            placeholder="Ej. Viaje a Noruega"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Input
            label="Descripción (Opcional)"
            placeholder="Añade detalles del álbum..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Typography variant="body" style={styles.label} color={theme.colors.foreground}>Visibilidad</Typography>
          <View style={styles.row}>
            {[
              { id: 'public', label: 'Público' },
              { id: 'followers', label: 'Seguidores' },
              { id: 'private', label: 'Privado' }
            ].map((vis) => (
              <Button
                key={vis.id}
                variant={visibility === vis.id ? 'secondary' : 'ghost'}
                size="sm"
                onPress={() => setVisibility(vis.id)}
              >
                {vis.label}
              </Button>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  content: {
    padding: spacing[4],
    gap: spacing[6],
  },
  field: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[2],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[2],
  },
});

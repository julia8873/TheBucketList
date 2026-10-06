import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, useTheme } from '@bucketlist/ui';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Typography variant="h1" color={theme.colors.foreground}>
        Álbum
      </Typography>
      <Typography variant="body" color={theme.colors.foregroundMuted}>
        ID: {id}
      </Typography>
      <Typography variant="body" color={theme.colors.foregroundSubtle}>
        (Detalles del álbum - Fase 4 en progreso)
      </Typography>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});

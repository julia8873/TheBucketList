/**
 * AlbumCard — displays an album with its cover, progress, and shared status.
 * NewAlbumCard — displays a dashed border card to create a new album.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Users, Plus } from 'lucide-react-native';

import { useTheme } from '../theme/useTheme';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark } from '../tokens/colors';
import { radii } from '../tokens/radii';
import { ProgressBar } from './ProgressBar';

interface AlbumCardProps {
  title: string;
  totalTasks: number;
  completedTasks: number;
  coverUri?: string | null;
  isShared?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function AlbumCard({
  title,
  totalTasks,
  completedTasks,
  coverUri,
  isShared = false,
  onPress,
  style,
}: AlbumCardProps) {
  const { theme } = useTheme();
  
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.colors.surface, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <View style={styles.coverContainer}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: dark[300] }]} />
        )}
        
        {isShared && (
          <View style={[styles.sharedBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Users size={12} color="#FFF" />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: theme.colors.foregroundMuted }]}>
            {completedTasks}/{totalTasks}
          </Text>
          {progress === 100 && (
            <Text style={[styles.metaText, { color: gold[400] }]}> • Completado</Text>
          )}
        </View>
        
        <ProgressBar
          value={progress}
          colorOverride={progress === 100 ? gold[400] : undefined}
          style={styles.progress}
        />
      </View>
    </Pressable>
  );
}

export function NewAlbumCard({ onPress, style }: { onPress?: () => void; style?: ViewStyle }) {
  const { theme } = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.newCard,
        { 
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceElevated : 'transparent' 
        },
        style,
      ]}
    >
      <View style={[styles.newIconContainer, { backgroundColor: dark[300] }]}>
        <Plus size={24} color={theme.colors.foregroundSubtle} />
      </View>
      <Text style={[styles.title, { color: theme.colors.foregroundSubtle, marginTop: 12 }]}>
        Nuevo álbum
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    width: '100%',
  },
  coverContainer: {
    aspectRatio: 1,
    width: '100%',
    position: 'relative',
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  sharedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 12,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.lg,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
  progress: {
    marginTop: 8,
    height: 4,
  },
  newCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    aspectRatio: 0.8, // approximate aspect ratio to match standard card + content
  },
  newIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

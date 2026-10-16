import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { styles } from '../styles/task-form.styles';
import { TASK_COVER_GRADIENTS } from '../constants';

interface TaskCoverPickerProps {
  coverImage: string;
  onChangeCover: (cover: string) => void;
}

export function TaskCoverPicker({
  coverImage,
  onChangeCover,
}: TaskCoverPickerProps) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0]?.uri;
      if (uri) {
        onChangeCover(uri);
      }
    }
  };

  return (
    <View style={styles.coverRow}>
      {TASK_COVER_GRADIENTS.map((g) => {
        const isSelected = coverImage === g.id;
        return (
          <Pressable key={g.id} onPress={() => onChangeCover(g.id)}>
            <LinearGradient
              colors={g.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.coverTile, isSelected && styles.coverSelected]}
            />
          </Pressable>
        );
      })}

      <Pressable
        onPress={() => void pickImage()}
        style={[
          styles.coverTile,
          styles.coverImageTile,
          !coverImage.startsWith('preset:') && styles.coverSelected,
        ]}
        accessibilityLabel={
          !coverImage.startsWith('preset:')
            ? 'Cambiar foto de portada'
            : 'Elegir foto de portada'
        }
      >
        {!coverImage.startsWith('preset:') ? (
          <>
            <Image
              source={{ uri: coverImage }}
              style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
              resizeMode="cover"
            />
            <View style={styles.coverImageBadge}>
              <Camera color="#FFF" size={12} />
            </View>
          </>
        ) : (
          <Camera color="#D4B13A" size={28} />
        )}
      </Pressable>
    </View>
  );
}

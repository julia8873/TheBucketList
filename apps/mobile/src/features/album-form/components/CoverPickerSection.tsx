import React from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ImageIcon, Palette } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { styles } from '../styles/album-form.styles';
import { COVERS, SOLID_COVERS, type Cover } from '../types';
import { SectionTitle } from './SectionTitle';

interface CoverPickerSectionProps {
  selectedCover: Cover;
  onSelectCover: (cover: Cover) => void;
}

export function CoverPickerSection({
  selectedCover,
  onSelectCover,
}: CoverPickerSectionProps) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      onSelectCover({
        id: 'custom-img',
        type: 'image',
        uri: result.assets[0].uri,
      });
    }
  };

  return (
    <View style={styles.section}>
      <SectionTitle highlight="TU" rest=" PORTADA" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coversRow}>
        <Pressable
          style={[
            styles.coverOption,
            selectedCover.type === 'image' && styles.coverOptionSelected,
            { justifyContent: 'center', alignItems: 'center', backgroundColor: '#151515' },
          ]}
          onPress={pickImage}
        >
          <ImageIcon color="#8F8F8F" size={24} />
        </Pressable>
        {COVERS.map((cover) => {
          const isSelected = selectedCover.id === cover.id;
          return (
            <Pressable
              key={cover.id}
              style={[styles.coverOption, isSelected && styles.coverOptionSelected]}
              onPress={() => onSelectCover(cover)}
            >
              <LinearGradient
                colors={cover.colors!}
                start={cover.diagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
                end={cover.diagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={styles.coversRow}>
        <Pressable
          style={[
            styles.coverOption,
            selectedCover.id === 'custom-color' && styles.coverOptionSelected,
            { justifyContent: 'center', alignItems: 'center', backgroundColor: '#151515' },
          ]}
          onPress={() => onSelectCover({ id: 'custom-color', type: 'solid', colors: ['#D4B13A', '#D4B13A'] })}
        >
          <Palette color="#8F8F8F" size={24} />
        </Pressable>
        {SOLID_COVERS.map((cover) => {
          const isSelected = selectedCover.id === cover.id;
          return (
            <Pressable
              key={cover.id}
              style={[
                styles.coverOption,
                isSelected && styles.coverOptionSelected,
                { backgroundColor: cover.colors![0] },
              ]}
              onPress={() => onSelectCover(cover)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

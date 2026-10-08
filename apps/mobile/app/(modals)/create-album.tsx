import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Users, Plus, Folder, ChevronRight, Image as ImageIcon, Palette } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useCreateAlbum } from '../../src/hooks/useAlbums';
import * as ImagePicker from 'expo-image-picker';

type Cover = {
  id: string;
  type: 'gradient' | 'solid' | 'image';
  colors?: readonly [string, string, ...string[]];
  diagonal?: boolean;
  uri?: string;
};

const COVERS: Cover[] = [
  { id: 'aurora', type: 'gradient', colors: ['#0E4B43', '#1F8560'] },
  { id: 'atardecer', type: 'gradient', colors: ['#F4A460', '#C8602F'] },
  { id: 'cielo', type: 'gradient', colors: ['#3A78C4', '#8CC8F4'] },
  { id: 'violeta', type: 'gradient', colors: ['#5B2F98', '#2E1A5E'] },
  { id: 'dorado', type: 'gradient', colors: ['#3A2F18', '#5E4E1F'], diagonal: true },
];

const SOLID_COVERS: Cover[] = [
  { id: 'rojo', type: 'solid', colors: ['#E53935', '#E53935'] },
  { id: 'azul', type: 'solid', colors: ['#1E88E5', '#1E88E5'] },
  { id: 'verde', type: 'solid', colors: ['#43A047', '#43A047'] },
  { id: 'amarillo', type: 'solid', colors: ['#FDD835', '#FDD835'] },
  { id: 'morado', type: 'solid', colors: ['#8E24AA', '#8E24AA'] },
];

export default function CreateAlbumScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCover, setSelectedCover] = useState(COVERS[1]!); // Atardecer
  const [isShared, setIsShared] = useState(false);

  const createAlbum = useCreateAlbum();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setSelectedCover({ 
        id: 'custom-img', 
        type: 'image', 
        uri: result.assets[0].uri 
      });
    }
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    
    createAlbum.mutate(
      {
        title: name,
        description: description,
        visibility: isShared ? 'followers' : 'private',
        cover_path: JSON.stringify(selectedCover),
        is_shared: isShared,
      },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
  };

  const SectionTitle = ({ highlight, rest }: { highlight: string; rest: string }) => (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitleHighlight}>{highlight}</Text>
      <Text style={styles.sectionTitleRest}>{rest}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Cabecera */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 52) }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft color="#F3EEE3" size={22} strokeWidth={2} />
            </Pressable>
            <Text style={styles.headerTitle}>Nuevo álbum</Text>
          </View>

          {/* Vista previa en vivo */}
          <View style={styles.previewContainer}>
            {selectedCover.type === 'image' && selectedCover.uri ? (
              <Image source={{ uri: selectedCover.uri }} style={StyleSheet.absoluteFill} />
            ) : (
              <LinearGradient
                colors={selectedCover.colors || ['#000', '#000']}
                start={selectedCover.diagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
                end={selectedCover.diagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <LinearGradient
              colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.78)']}
              style={StyleSheet.absoluteFill}
            />

            {isShared && (
              <View style={styles.previewSharedBadge}>
                <Text style={styles.previewSharedText}>Compartido</Text>
              </View>
            )}

            <View style={styles.previewBottom}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {name.trim() ? name : 'Nuevo álbum'}
              </Text>
              <Text style={styles.previewSubtitle}>0 tareas · 0 hechas</Text>
              <View style={styles.progressBarTrack}>
                {/* 0% fill so nothing inside */}
              </View>
            </View>
          </View>

          {/* Sección Nombre */}
          <View style={styles.section}>
            <SectionTitle highlight="NOMBRE" rest=" DEL ÁLBUM" />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Viaje a Noruega"
              placeholderTextColor="#8F8F8F"
              accessibilityLabel="Nombre del álbum"
            />
          </View>

          {/* Sección Descripción */}
          <View style={[styles.section, { marginBottom: 12 }]}>
            <SectionTitle highlight="DESCRIPCIÓN" rest=" DEL ÁLBUM" />
            <TextInput
              style={[
                styles.input,
                {
                  minHeight: 88,
                  textAlignVertical: 'top',
                  fontSize: 16,
                  fontFamily: 'Inter_400Regular',
                  paddingTop: 16,
                  paddingBottom: 16
                }
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Añade una descripción (opcional)"
              placeholderTextColor="#8F8F8F"
              accessibilityLabel="Descripción del álbum"
              multiline
            />
          </View>

          {/* Sección Portada */}
          <View style={styles.section}>
            <SectionTitle highlight="TU" rest=" PORTADA" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coversRow}>
              <Pressable
                style={[
                  styles.coverOption,
                  selectedCover.type === 'image' && styles.coverOptionSelected,
                  { justifyContent: 'center', alignItems: 'center', backgroundColor: '#151515' }
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
                    style={[
                      styles.coverOption,
                      isSelected && styles.coverOptionSelected
                    ]}
                    onPress={() => setSelectedCover(cover)}
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
                  { justifyContent: 'center', alignItems: 'center', backgroundColor: '#151515' }
                ]}
                onPress={() => setSelectedCover({ id: 'custom-color', type: 'solid', colors: ['#D4B13A', '#D4B13A'] })}
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
                      { backgroundColor: cover.colors![0] }
                    ]}
                    onPress={() => setSelectedCover(cover)}
                  />
                );
              })}
            </ScrollView>
          </View>

          {/* Sección Compartir */}
          <View style={styles.section}>
            <SectionTitle highlight="COMPARTIR" rest=" CON AMIGOS" />
            <View style={styles.card}>
              <View style={[styles.cardRow, isShared && styles.cardRowBorder]}>
                <Users color="#D4B13A" size={22} strokeWidth={2} />
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>Álbum compartido</Text>
                  <Text style={styles.cardSubtitle}>Completad las tareas juntos</Text>
                </View>
                <Pressable
                  style={[styles.switchTrack, isShared && styles.switchTrackActive]}
                  onPress={() => setIsShared(!isShared)}
                >
                  <View style={[styles.switchKnob, isShared && styles.switchKnobActive]} />
                </Pressable>
              </View>

              {isShared && (
                <View style={[styles.cardRow, { gap: 10 }]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>MR</Text>
                  </View>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>DL</Text>
                  </View>
                  <Pressable style={styles.avatarAdd}>
                    <Plus color="#D4B13A" size={20} strokeWidth={2} />
                  </Pressable>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.guestsText}>2 invitados</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Sección Añadir tareas sueltas */}
          <View style={styles.section}>
            <Pressable style={styles.card}>
              <View style={styles.cardRow}>
                <Folder color="#D4B13A" size={22} strokeWidth={2} />
                <View style={styles.cardTexts}>
                  <Text style={styles.cardTitle}>Añadir tareas sueltas</Text>
                  <Text style={styles.cardSubtitle}>12 disponibles en Sin álbum</Text>
                </View>
                <ChevronRight color="#8F8F8F" size={18} strokeWidth={2} />
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barra inferior fija */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 30) }]}>
        <Pressable
          style={[styles.createBtn, (!name.trim() || createAlbum.isPending) && styles.createBtnDisabled]}
          disabled={!name.trim() || createAlbum.isPending}
          onPress={handleCreate}
        >
          <Text style={styles.createBtnText}>
            {createAlbum.isPending ? 'Creando...' : 'Crear álbum'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 30,
    color: '#F3EEE3',
  },
  previewContainer: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 176,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  previewSharedBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    height: 32,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(13, 13, 13, 0.72)',
    borderWidth: 1,
    borderColor: '#6B5A22',
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewSharedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#D4B13A',
  },
  previewBottom: {
    position: 'absolute',
    bottom: 18,
    left: 22,
    right: 22,
  },
  previewTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 26,
    color: '#F3EEE3',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#E2DCCF',
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    width: '100%',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleHighlight: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: '#D4B13A',
    letterSpacing: 0.6,
  },
  sectionTitleRest: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
    marginBottom: 10,
  },
  input: {
    height: 64,
    borderRadius: 16,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 18,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 20,
    color: '#F3EEE3',
  },
  coversRow: {
    flexDirection: 'row',
    gap: 12,
  },
  coverOption: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
  },
  coverOptionSelected: {
    borderWidth: 2,
    borderColor: '#D4B13A',
  },
  card: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingHorizontal: 16,
  },
  cardRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  cardTexts: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F3EEE3',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
  },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#262626',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#D4B13A',
  },
  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8F8F8F',
  },
  switchKnobActive: {
    backgroundColor: '#0D0D0D',
    transform: [{ translateX: 20 }],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#D4B13A',
    backgroundColor: '#2C2512',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#D4B13A',
  },
  avatarAdd: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#6B5A22',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
  },
  bottomBar: {
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 30, // will be Math.max(insets.bottom, 30) inline
  },
  createBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4B13A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4B13A',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#0D0D0D',
  },
});

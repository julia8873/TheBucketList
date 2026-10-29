import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Check, Folder, FolderOpen, X, Globe, Lock, Users } from 'lucide-react-native';
import { fontFamily } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { useAlbums, type AlbumWithProgress } from '../hooks/useAlbums';
import { useAuthStore } from '../stores/auth.store';

interface AlbumPickerSheetProps {
  visible: boolean;
  selectedAlbumId: string | null;
  onSelectAlbum: (albumId: string | null) => void;
  onClose: () => void;
}

export function AlbumPickerSheet({
  visible,
  selectedAlbumId,
  onSelectAlbum,
  onClose,
}: AlbumPickerSheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { data: albums = [], isLoading } = useAlbums(user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const { height: windowHeight } = useWindowDimensions();
  // Altura máxima del sheet en píxeles absolutos para que el ScrollView pueda calcular
  // correctamente su espacio disponible (el % no funciona bien dentro de KeyboardAvoidingView)
  const sheetMaxHeight = windowHeight * 0.82;

  const filteredAlbums = albums.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleSelect = (id: string | null) => {
    onSelectAlbum(id);
    onClose();
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return t('albums.visibility_public');
      case 'followers':
        return t('albums.visibility_followers');
      case 'private':
        return t('albums.visibility_private');
      default:
        return '';
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Globe color="#888" size={12} />;
      case 'followers':
        return <Users color="#888" size={12} />;
      case 'private':
        return <Lock color="#888" size={12} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16), maxHeight: sheetMaxHeight }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.dragIndicator} />
              <View style={styles.headerRow}>
                <View style={styles.headerTitleContainer}>
                  <Folder color="#D4B13A" size={20} />
                  <Text style={styles.headerTitle}>{t('album_picker.title')}</Text>
                </View>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <View style={styles.searchBox}>
                <Search color="#666" size={18} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t('album_picker.search_placeholder')}
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <X color="#666" size={16} />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Content */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#D4B13A" size="large" />
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Opción «Sin álbum» */}
                <Pressable
                  style={[
                    styles.albumRow,
                    selectedAlbumId === null && styles.albumRowSelected,
                  ]}
                  onPress={() => handleSelect(null)}
                >
                  <View style={[styles.folderIconContainer, selectedAlbumId === null && styles.folderIconSelected]}>
                    <FolderOpen color={selectedAlbumId === null ? '#111' : '#D4B13A'} size={20} />
                  </View>
                  <View style={styles.albumInfo}>
                    <Text style={styles.albumTitle}>{t('album_picker.no_album')}</Text>
                    <Text style={styles.albumSubtitle}>{t('album_picker.no_album_desc')}</Text>
                  </View>
                  <View style={[styles.checkCircle, selectedAlbumId === null && styles.checkCircleSelected]}>
                    {selectedAlbumId === null && <Check color="#111" size={14} strokeWidth={3} />}
                  </View>
                </Pressable>

                {/* List of Albums */}
                {filteredAlbums.map((album) => {
                  const isSelected = selectedAlbumId === album.id;
                  return (
                    <Pressable
                      key={album.id}
                      style={[styles.albumRow, isSelected && styles.albumRowSelected]}
                      onPress={() => handleSelect(album.id)}
                    >
                      <View style={[styles.folderIconContainer, isSelected && styles.folderIconSelected]}>
                        <Folder color={isSelected ? '#111' : '#D4B13A'} size={20} />
                      </View>
                      <View style={styles.albumInfo}>
                        <Text style={styles.albumTitle} numberOfLines={1}>
                          {album.title}
                        </Text>
                        <View style={styles.albumMeta}>
                          {album.visibility && (
                            <View style={styles.visibilityBadge}>
                              {getVisibilityIcon(album.visibility)}
                              <Text style={styles.visibilityText}>
                                {getVisibilityLabel(album.visibility)}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.taskCount}>
                            {album.total_tasks} {t(album.total_tasks === 1 ? 'album_picker.task_one' : 'album_picker.task_other')}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                        {isSelected && <Check color="#111" size={14} strokeWidth={3} />}
                      </View>
                    </Pressable>
                  );
                })}

                {albums.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Folder color="#444" size={42} />
                    <Text style={styles.emptyTitle}>{t('album_picker.empty_title')}</Text>
                    <Text style={styles.emptySubtitle}>{t('album_picker.empty_subtitle')}</Text>
                  </View>
                )}

                {albums.length > 0 && filteredAlbums.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Search color="#444" size={32} />
                    <Text style={styles.emptyTitle}>{t('album_picker.no_results_title')}</Text>
                    <Text style={styles.emptySubtitle}>{t('album_picker.no_results_subtitle')}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = themedStyleSheet({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  backdropPressable: {
    flex: 1,
    width: '100%',
  },
  sheetContainer: {
    justifyContent: 'flex-end',
    width: '100%',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  sheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // maxHeight se pasa como prop en píxeles absolutos para que el ScrollView
    // tenga una referencia de altura real y pueda hacer scroll correctamente.
    minHeight: 300,
    borderTopWidth: 1,
    borderColor: '#262626',
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: fontFamily.bold,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontFamily: fontFamily.regular,
    marginLeft: 10,
  },
  list: {
    flex: 1,
    // flexShrink asegura que el ScrollView cede espacio al header/search
    // y no intenta crecer más allá del sheet.
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    gap: 8,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#242424',
  },
  albumRowSelected: {
    backgroundColor: '#201E17',
    borderColor: 'rgba(212, 177, 58, 0.45)',
  },
  folderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIconSelected: {
    backgroundColor: '#D4B13A',
  },
  albumInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  albumTitle: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: fontFamily.medium,
  },
  albumSubtitle: {
    color: '#777',
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  albumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visibilityText: {
    color: '#888',
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  taskCount: {
    color: '#666',
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#D4B13A',
    borderColor: '#D4B13A',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#777',
    fontSize: 13,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
});

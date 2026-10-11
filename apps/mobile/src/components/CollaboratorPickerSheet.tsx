import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Check, Users, X } from 'lucide-react-native';
import { Avatar, fontFamily } from '@bucketlist/ui';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

export interface CollaboratorItem {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  status?: 'pending' | 'accepted' | 'declined';
}

interface CollaboratorPickerSheetProps {
  visible: boolean;
  selected: CollaboratorItem[];
  onChange: (collaborators: CollaboratorItem[]) => void;
  onClose: () => void;
  /** IDs that are already collaborators and cannot be removed (for non-owner collaborators) */
  readOnlyIds?: string[];
}

export function CollaboratorPickerSheet({ visible, selected, onChange, onClose, readOnlyIds = [] }: CollaboratorPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<CollaboratorItem[]>(selected);
  const [profiles, setProfiles] = useState<CollaboratorItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(selected);
      setQuery('');
    }
  }, [visible, selected]);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    setLoading(true);

    const fetchUsers = async () => {
      try {
        let q = supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .order('username', { ascending: true })
          .limit(40);

        if (user?.id) {
          q = q.neq('id', user.id);
        }

        const trimmed = query.trim().replace(/^@/, '');
        if (trimmed.length > 0) {
          q = q.or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`);
        }

        const { data, error } = await q;
        if (!error && data && isMounted) {
          setProfiles(
            data.map((p: any) => ({
              id: p.id,
              username: p.username,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            }))
          );
        }
      } catch (err) {
        console.warn('Error fetching profiles:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, query ? 200 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [visible, query, user?.id]);

  const readOnlySet = new Set(readOnlyIds);
  const selectedIds = new Set(draft.map(c => c.id));

  const togglePerson = (person: CollaboratorItem) => {
    if (readOnlySet.has(person.id)) return; // Cannot remove read-only collaborators
    if (selectedIds.has(person.id)) {
      setDraft(draft.filter(c => c.id !== person.id));
    } else {
      setDraft([...draft, person]);
    }
  };

  const handleSave = () => {
    onChange(draft);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Cabecera de la página */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={onClose} hitSlop={10}>
              <ChevronLeft color="#FFF" size={26} />
            </Pressable>
            <Text style={styles.headerTitle}>Buscar colaboradores</Text>
            <Pressable style={styles.doneButton} onPress={handleSave}>
              <Text style={styles.doneText}>
                {draft.length > 0 ? `Listo (${draft.length})` : 'Listo'}
              </Text>
            </Pressable>
          </View>

          {/* Buscador */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search color="#9A9A9A" size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o @usuario..."
                placeholderTextColor="#666"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <X color="#9A9A9A" size={18} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Chips seleccionados */}
          {draft.length > 0 && (
            <View style={styles.chipsSection}>
              <Text style={styles.chipsSectionLabel}>SELECCIONADOS ({draft.length})</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsContent}
              >
                {draft.map(c => (
                  <Pressable key={c.id} style={styles.chip} onPress={() => togglePerson(c)}>
                    <Avatar
                      uri={c.avatar_url}
                      initials={(c.display_name || c.username || '?')[0]?.toUpperCase() || '?'}
                      size="xs"
                    />
                    <Text style={styles.chipName} numberOfLines={1}>
                      {c.display_name || `@${c.username}`}
                    </Text>
                    {readOnlySet.has(c.id)
                      ? <Text style={{ fontSize: 12, color: '#666' }}>🔒</Text>
                      : <X color="#D4B13A" size={14} />
                    }
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Listado de usuarios */}
          <View style={styles.listHeader}>
            <Text style={styles.listSectionTitle}>
              {query.trim().length > 0 ? 'RESULTADOS' : 'SUGERENCIAS'}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#D4B13A" size="large" />
            </View>
          ) : profiles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users color="#555" size={48} />
              <Text style={styles.emptyTitle}>
                {query.trim().length > 0 ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {query.trim().length > 0
                  ? `No hay coincidencias para «${query.trim()}»`
                  : 'Regístrate o invita a amigos para colaborar en tareas conjuntas'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            >
              {profiles.map(person => {
                const isSelected = selectedIds.has(person.id);
                const isReadOnly = readOnlySet.has(person.id);
                return (
                  <Pressable
                    key={person.id}
                    style={[styles.userRow, isSelected && styles.userRowSelected, isReadOnly && { opacity: 0.6 }]}
                    onPress={() => togglePerson(person)}
                  >
                    <Avatar
                      uri={person.avatar_url}
                      initials={(person.display_name || person.username || '?')[0]?.toUpperCase() || '?'}
                      size="md"
                      goldRing={isSelected}
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.displayName} numberOfLines={1}>
                        {person.display_name || person.username}
                      </Text>
                      <Text style={styles.usernameHandle} numberOfLines={1}>
                        @{person.username}
                      </Text>
                    </View>
                    <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                      {isReadOnly ? (
                        <Text style={{ fontSize: 13 }}>🔒</Text>
                      ) : isSelected ? (
                        <Check size={14} color="#111" strokeWidth={3} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Botón inferior */}
          <View style={styles.footer}>
            <Pressable style={styles.confirmButton} onPress={handleSave}>
              <Text style={styles.confirmButtonText}>
                {draft.length > 0
                  ? `Añadir ${draft.length} colaborador${draft.length > 1 ? 'es' : ''}`
                  : 'Guardar sin colaboradores'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  backButton: {
    padding: 6,
    marginLeft: -6,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: fontFamily.bold,
  },
  doneButton: {
    backgroundColor: 'rgba(212, 177, 58, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D4B13A',
  },
  doneText: {
    color: '#D4B13A',
    fontSize: 14,
    fontFamily: fontFamily.medium,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
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
  chipsSection: {
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  chipsSectionLabel: {
    color: '#D4B13A',
    fontSize: 11,
    fontFamily: fontFamily.bold,
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 177, 58, 0.15)',
    borderColor: '#D4B13A',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 6,
  },
  chipName: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: fontFamily.medium,
    maxWidth: 120,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  listSectionTitle: {
    color: '#888',
    fontSize: 12,
    fontFamily: fontFamily.bold,
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#777',
    fontSize: 13,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#242424',
  },
  userRowSelected: {
    backgroundColor: '#201E17',
    borderColor: 'rgba(212, 177, 58, 0.4)',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: fontFamily.medium,
  },
  usernameHandle: {
    color: '#888',
    fontSize: 13,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#D4B13A',
    borderColor: '#D4B13A',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  confirmButton: {
    backgroundColor: '#D4B13A',
    borderRadius: 26,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#111',
    fontSize: 16,
    fontFamily: fontFamily.bold,
  },
});

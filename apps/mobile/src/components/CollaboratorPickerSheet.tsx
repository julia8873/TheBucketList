import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Check, Users, X, UserMinus } from 'lucide-react-native';
import { themedStyleSheet, Avatar, fontFamily, useTheme, Alert, Typography } from '@bucketlist/ui';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { blockReportApi } from '../services/api/blockReport';
import { normalizeStorageUrl } from '../constants/urls';
import { Image as ExpoImage } from 'expo-image';

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
  /**
   * IDs de personas que ya son colaboradoras o tienen la invitación pendiente. No aparecen en
   * los resultados ni entre los seleccionados; se conservan tal cual al guardar.
   */
  excludeIds?: string[];
  /**
   * Personas que ya colaboran o tienen la invitación pendiente. Si se pasa junto a
   * `onRemoveCurrent`, se muestran en una sección propia con un botón para quitar al
   * colaborador o cancelar su invitación pendiente.
   */
  current?: CollaboratorItem[];
  onRemoveCurrent?: (userId: string) => Promise<void> | void;
}

export function CollaboratorPickerSheet({ visible, selected, onChange, onClose, readOnlyIds = [], excludeIds = [], current = [], onRemoveCurrent }: CollaboratorPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const excludeKey = excludeIds.join(',');
  const excludedSet = new Set([...excludeIds, ...readOnlyIds]);
  const [draft, setDraft] = useState<CollaboratorItem[]>(selected);
  const [profiles, setProfiles] = useState<CollaboratorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Los bloqueados se consultan UNA vez por apertura (antes: 2 consultas en serie en cada tecla)
  const blockedRef = useRef<Promise<string[]> | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setRemovedIds(new Set());
      hasLoadedRef.current = false;
      blockedRef.current = user?.id
        ? blockReportApi.getMutualBlockedUserIds(user.id).catch(() => [] as string[])
        : Promise.resolve([] as string[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const currentVisible = current.filter(c => !removedIds.has(c.id));

  const confirmRemoveCurrent = (c: CollaboratorItem) => {
    if (!onRemoveCurrent) return;
    const name = c.display_name || c.username || '';
    const isPending = c.status === 'pending';
    Alert.alert(
      isPending ? 'Cancelar invitación' : 'Quitar colaborador',
      isPending ? `¿Cancelar la invitación a ${name}?` : `¿Quitar a ${name} como colaborador?`,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: isPending ? 'Cancelar invitación' : 'Quitar',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(c.id);
            // Desaparece al instante de la lista; el padre actualiza la caché y la base de datos
            setRemovedIds(prev => new Set(prev).add(c.id));
            try {
              await onRemoveCurrent(c.id);
            } catch {
              setRemovedIds(prev => {
                const next = new Set(prev);
                next.delete(c.id);
                return next;
              });
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (visible) {
      // Solo las personas nuevas: las que ya colaboran (o están invitadas) no se muestran aquí.
      setDraft(selected.filter(c => c.id !== user?.id && !excludedSet.has(c.id)));
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, selected, user?.id, excludeKey]);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    // Solo spinner en la primera carga; después se mantiene la lista anterior (sin parpadeo)
    if (!hasLoadedRef.current) setLoading(true);

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

        const [res, blockedIds] = await Promise.all([
          q,
          blockedRef.current ??
            (user?.id ? blockReportApi.getMutualBlockedUserIds(user.id) : Promise.resolve([] as string[])),
        ]);
        const blockedSet = new Set(blockedIds);

        if (!res.error && res.data && isMounted) {
          const list = res.data
            .filter((p: any) => p.id !== user?.id && !blockedSet.has(p.id) && !excludedSet.has(p.id))
            .map((p: any) => ({
              id: p.id,
              username: p.username,
              display_name: p.display_name,
              avatar_url: p.avatar_url,
            }));
          hasLoadedRef.current = true;
          setProfiles(list);
          // Precarga las fotos para que aparezcan al instante (también al añadirlas a la tarea)
          const urls = list
            .map((p: CollaboratorItem) => normalizeStorageUrl(p.avatar_url))
            .filter((u: string | null | undefined): u is string => !!u);
          if (urls.length > 0) {
            try { void ExpoImage.prefetch(urls); } catch { /* sin precarga */ }
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, user?.id, excludeKey]);

  const readOnlySet = new Set(readOnlyIds);
  const selectedIds = new Set(draft.map(c => c.id));

  const togglePerson = (person: CollaboratorItem) => {
    if (person.id === user?.id) return; // Your own profile cannot be toggled
    if (readOnlySet.has(person.id)) return; // Cannot remove read-only collaborators
    if (selectedIds.has(person.id)) {
      setDraft(draft.filter(c => c.id !== person.id));
    } else {
      setDraft([...draft, person]);
    }
  };

  const handleSave = () => {
    // Se devuelven también los colaboradores existentes para que quien llama no los dé de baja.
    const kept = selected.filter(c => c.id !== user?.id && excludedSet.has(c.id));
    onChange([...kept, ...draft]);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Hoja que sube desde abajo; tocar fuera la cierra */}
      <View style={styles.modalBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />
          {/* Cabecera de la hoja */}
          <View style={styles.header}>
            <Typography variant="h3" color={theme.colors.foreground}>Buscar colaboradores</Typography>
          </View>

          {/* Buscador */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Search color={theme.colors.foregroundMuted} size={18} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.foreground }]}
                placeholder="Buscar por nombre o @usuario..."
                placeholderTextColor={theme.colors.foregroundMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={10}>
                  <X color={theme.colors.foregroundMuted} size={18} />
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

          {/* Colaboradores actuales e invitaciones pendientes (se pueden quitar / cancelar) */}
          {onRemoveCurrent && currentVisible.length > 0 && query.trim().length === 0 && (
            <View style={styles.currentSection}>
              <Text style={styles.currentSectionLabel}>COLABORADORES E INVITACIONES ({currentVisible.length})</Text>
              <ScrollView style={styles.currentList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {currentVisible.map(c => {
                  const isPending = c.status === 'pending';
                  return (
                    <View key={c.id} style={styles.currentRow}>
                      <Avatar
                        uri={c.avatar_url}
                        initials={(c.display_name || c.username || '?')[0]?.toUpperCase() || '?'}
                        size="sm"
                      />
                      <View style={styles.userInfo}>
                        <Text style={[styles.displayName, { color: theme.colors.foreground }]} numberOfLines={1}>
                          {c.display_name || c.username}
                        </Text>
                        <Text style={styles.usernameHandle} numberOfLines={1}>
                          @{c.username}{isPending ? ' · Invitación pendiente' : ''}
                        </Text>
                      </View>
                      {removingId === c.id ? (
                        <ActivityIndicator size="small" color="#D4B13A" />
                      ) : (
                        <Pressable
                          onPress={() => confirmRemoveCurrent(c)}
                          hitSlop={8}
                          style={styles.currentRemoveBtn}
                          accessibilityRole="button"
                          accessibilityLabel={isPending ? 'Cancelar invitación' : 'Quitar colaborador'}
                        >
                          <UserMinus size={16} color="#EF4444" strokeWidth={2} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
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
              <Users color={theme.colors.foregroundMuted} size={48} />
              <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
                {query.trim().length > 0 ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.foregroundMuted }]}>
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
                  : excludeIds.length > 0 ? 'Cerrar' : 'Guardar sin colaboradores'}
              </Text>
            </Pressable>
          </View>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = themedStyleSheet({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    height: '88%',
  },
  container: {
    flex: 1,
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  searchContainer: {
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  chipsContent: {
    paddingHorizontal: 12,
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
  currentSection: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  currentSectionLabel: {
    color: '#D4B13A',
    fontSize: 11,
    fontFamily: fontFamily.bold,
    letterSpacing: 1,
    marginBottom: 6,
  },
  currentList: {
    maxHeight: 190,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  currentRemoveBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  listHeader: {
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
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

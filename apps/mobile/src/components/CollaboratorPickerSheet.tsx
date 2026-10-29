import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Check, Users, X, UserMinus } from 'lucide-react-native';
import { themedStyleSheet, Avatar, fontFamily, useTheme, Alert, Typography } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
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

type PickerGroup = 'collab' | 'following' | 'other';

interface PickerRelations {
  /** Personas con las que ya has colaborado: nº de colaboraciones y la más reciente (ms) */
  collab: Map<string, { count: number; last: number }>;
  /** Personas a las que sigues (seguimiento aceptado) */
  following: Set<string>;
}

const EMPTY_RELATIONS: PickerRelations = { collab: new Map(), following: new Set() };

const firstOf = (v: any) => (Array.isArray(v) ? v[0] : v);

/** Una sola carga por apertura: colaboraciones previas (tareas y álbumes) y personas a las que sigues. */
async function loadRelations(me: string): Promise<PickerRelations> {
  const collab = new Map<string, { count: number; last: number }>();
  const bump = (id: string | undefined | null, ts: number) => {
    if (!id || id === me) return;
    const cur = collab.get(id);
    if (cur) {
      cur.count += 1;
      if (ts > cur.last) cur.last = ts;
    } else {
      collab.set(id, { count: 1, last: ts });
    }
  };

  const [bc, am, fl] = await Promise.all([
    supabase
      .from('bucket_collaborators')
      .select('user_id, status, created_at, buckets!inner(user_id)')
      .neq('status', 'declined')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('album_members')
      .select('user_id, status, albums!inner(owner_id)')
      .limit(500),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', me)
      .eq('status', 'accepted')
      .limit(500),
  ]);

  for (const row of (bc.data ?? []) as any[]) {
    const ownerId = firstOf(row.buckets)?.user_id;
    const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (ownerId === me) bump(row.user_id, ts);       // yo invité a esa persona
    else if (row.user_id === me) bump(ownerId, ts);  // esa persona me invitó a mí
  }
  for (const row of (am.data ?? []) as any[]) {
    const ownerId = firstOf(row.albums)?.owner_id;
    if (ownerId === me) bump(row.user_id, 0);
    else if (row.user_id === me) bump(ownerId, 0);
  }

  const following = new Set<string>(((fl.data ?? []) as any[]).map(r => r.following_id));
  return { collab, following };
}

export function CollaboratorPickerSheet({ visible, selected, onChange, onClose, readOnlyIds = [], excludeIds = [], current = [], onRemoveCurrent }: CollaboratorPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
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
  // Colaboraciones previas y seguidos: una consulta por apertura
  const relationsRef = useRef<Promise<PickerRelations> | null>(null);
  const [groups, setGroups] = useState<Record<string, PickerGroup>>({});

  useEffect(() => {
    if (visible) {
      setRemovedIds(new Set());
      hasLoadedRef.current = false;
      blockedRef.current = user?.id
        ? blockReportApi.getMutualBlockedUserIds(user.id).catch(() => [] as string[])
        : Promise.resolve([] as string[]);
      relationsRef.current = user?.id
        ? loadRelations(user.id).catch(() => EMPTY_RELATIONS)
        : Promise.resolve(EMPTY_RELATIONS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const currentVisible = current.filter(c => !removedIds.has(c.id));

  const confirmRemoveCurrent = (c: CollaboratorItem) => {
    if (!onRemoveCurrent) return;
    const name = c.display_name || c.username || '';
    const isPending = c.status === 'pending';
    Alert.alert(
      isPending ? t('collab_picker.cancel_invite_title') : t('collab_picker.remove_collaborator_title'),
      isPending
        ? t('collab_picker.cancel_invite_msg', { name })
        : t('collab_picker.remove_collaborator_msg', { name }),
      [
        { text: t('collab_picker.back'), style: 'cancel' },
        {
          text: isPending ? t('collab_picker.cancel_invite_title') : t('collab_picker.remove'),
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
        const trimmed = query.trim().replace(/^@/, '');
        const searching = trimmed.length > 0;
        const [relations, blockedIds] = await Promise.all([
          relationsRef.current ?? Promise.resolve(EMPTY_RELATIONS),
          blockedRef.current ??
            (user?.id ? blockReportApi.getMutualBlockedUserIds(user.id) : Promise.resolve([] as string[])),
        ]);
        const blockedSet = new Set(blockedIds);
        const relatedIds = Array.from(new Set([...relations.collab.keys(), ...relations.following]));

        const columns = 'id, username, display_name, avatar_url';
        let results: any[] = [];
        let failed = false;

        if (searching) {
          // Al buscar aparece cualquier usuario, aunque no lo sigas ni hayas colaborado con él
          let q = supabase.from('profiles').select(columns).order('username', { ascending: true }).limit(60);
          if (user?.id) q = q.neq('id', user.id);
          q = q.or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`);
          // Las personas cercanas que encajan con la búsqueda no deben quedar fuera por el límite
          let qRel: any = null;
          if (relatedIds.length > 0) {
            qRel = supabase
              .from('profiles')
              .select(columns)
              .in('id', relatedIds.slice(0, 200))
              .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`);
          }
          const [res, resRel] = await Promise.all([q, qRel ?? Promise.resolve({ data: [], error: null })]);
          if (res.error) failed = true;
          const seen = new Set<string>();
          for (const p of [...((resRel.data as any[]) ?? []), ...((res.data as any[]) ?? [])]) {
            if (seen.has(p.id)) continue;
            seen.add(p.id);
            results.push(p);
          }
        } else if (relatedIds.length > 0) {
          // Sin búsqueda: solo colaboradores previos y personas a las que sigues
          const res = await supabase.from('profiles').select(columns).in('id', relatedIds.slice(0, 200));
          if (res.error) failed = true;
          results = (res.data as any[]) ?? [];
        }

        if (failed || !isMounted) return;

        const groupOf = (id: string): PickerGroup =>
          relations.collab.has(id) ? 'collab' : relations.following.has(id) ? 'following' : 'other';
        const rank: Record<PickerGroup, number> = { collab: 0, following: 1, other: 2 };
        const nameOf = (p: any) => (p.username || '').toLowerCase();

        const list = results
          .filter((p: any) => p.id !== user?.id && !blockedSet.has(p.id) && !excludedSet.has(p.id))
          .sort((a: any, b: any) => {
            const ga = groupOf(a.id);
            const gb = groupOf(b.id);
            if (ga !== gb) return rank[ga] - rank[gb];
            if (ga === 'collab') {
              const ca = relations.collab.get(a.id)!;
              const cb = relations.collab.get(b.id)!;
              if (ca.count !== cb.count) return cb.count - ca.count; // más colaboraciones primero
              if (ca.last !== cb.last) return cb.last - ca.last;     // a igualdad, la más reciente
            }
            return nameOf(a).localeCompare(nameOf(b));
          });

        const groupMap: Record<string, PickerGroup> = {};
        list.forEach((p: any) => { groupMap[p.id] = groupOf(p.id); });

        const mapped: CollaboratorItem[] = list.map((p: any) => ({
          id: p.id,
          username: p.username,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        }));

        hasLoadedRef.current = true;
        setGroups(groupMap);
        setProfiles(mapped);
        // Precarga las fotos para que aparezcan al instante (también al añadirlas a la tarea)
        const urls = mapped
          .map((p: CollaboratorItem) => normalizeStorageUrl(p.avatar_url))
          .filter((u: string | null | undefined): u is string => !!u);
        if (urls.length > 0) {
          try { void ExpoImage.prefetch(urls); } catch { /* sin precarga */ }
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('collab_picker.close')} />
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />
          {/* Cabecera de la hoja */}
          <View style={styles.header}>
            <Typography variant="h3" color={theme.colors.foreground}>{t('collab_picker.title')}</Typography>
          </View>

          {/* Buscador */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Search color={theme.colors.foregroundMuted} size={18} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.foreground }]}
                placeholder={t('collab_picker.search_placeholder')}
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
              <Text style={styles.chipsSectionLabel}>{t('collab_picker.selected_label', { count: draft.length })}</Text>
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
              <Text style={styles.currentSectionLabel}>{t('collab_picker.current_label', { count: currentVisible.length })}</Text>
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
                          @{c.username}{isPending ? t('collab_picker.pending_suffix') : ''}
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
                          accessibilityLabel={isPending ? t('collab_picker.cancel_invite_title') : t('collab_picker.remove_collaborator_title')}
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
              {query.trim().length > 0 ? t('collab_picker.results') : t('collab_picker.suggestions')}
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
                {query.trim().length > 0 ? t('collab_picker.no_users_found') : t('collab_picker.no_suggestions')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.foregroundMuted }]}>
                {query.trim().length > 0
                  ? t('collab_picker.no_matches', { query: query.trim() })
                  : t('collab_picker.search_hint')}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            >
              {profiles.map((person, index) => {
                const isSelected = selectedIds.has(person.id);
                const isReadOnly = readOnlySet.has(person.id);
                const isSearching = query.trim().length > 0;
                const group = groups[person.id];
                const showGroupHeader =
                  !isSearching && (index === 0 || groups[profiles[index - 1]?.id ?? ''] !== group);
                return (
                  <React.Fragment key={person.id}>
                  {showGroupHeader && (
                    <Text style={styles.groupLabel}>
                      {group === 'collab' ? t('collab_picker.group_collab') : t('collab_picker.group_following')}
                    </Text>
                  )}
                  <Pressable
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
                  </React.Fragment>
                );
              })}
            </ScrollView>
          )}

          {/* Botón inferior */}
          <View style={styles.footer}>
            <Pressable style={styles.confirmButton} onPress={handleSave}>
              <Text style={styles.confirmButtonText}>
                {draft.length > 0
                  ? (draft.length === 1
                      ? t('collab_picker.add_single')
                      : t('collab_picker.add_plural', { count: draft.length }))
                  : excludeIds.length > 0 ? t('collab_picker.close') : t('collab_picker.save_without')}
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
  groupLabel: {
    color: '#D4B13A',
    fontSize: 11,
    fontFamily: fontFamily.bold,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
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
